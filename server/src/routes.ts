import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { SESSION_COOKIE, cookieOptions, loginThrottle, requireAuth, sessionsRepo, usersRepo, verifyPassword } from "./auth.js";
import { itemsRepo, settingsRepo } from "./repo.js";
import { ItemInput, ItemPatch, LoginInput, SettingsPatch } from "./types.js";

/* ---------- Auth ---------- */

export const auth = Router();

// A real scrypt hash of a random string; verifying against it keeps timing the same for unknown emails.
const DUMMY_HASH =
  "scrypt$16384$8$1$0jK8Bl1GzKZFEN9nVvzCZg$Cn8gk6q4tgZK1n2wQ2C9yoq0v1iX4Q4mQe2JzPqYQd4eY1KHzq9Q7pH5FQ4a0oQ9XxJd8u3sE1a4uR3n6P1Zvw";

auth.post("/login", async (req, res) => {
  const { email, password } = LoginInput.parse(req.body);
  const key = loginThrottle.key(req.ip ?? "unknown", email);
  if (loginThrottle.blocked(key)) {
    res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
    return;
  }
  const user = await usersRepo.findByEmail(email);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    loginThrottle.fail(key);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  loginThrottle.clear(key);
  const token = await sessionsRepo.create(user.id);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  const { passwordHash: _omit, ...safe } = user;
  res.json({ user: safe });
});

auth.post("/logout", async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined>)?.[SESSION_COOKIE];
  if (token) await sessionsRepo.remove(token);
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
});

auth.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ---------- Items ---------- */

export const items = Router();
items.use(requireAuth);

const parseId = (req: Request, res: Response): number | null => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Item id must be a positive integer" });
    return null;
  }
  return id;
};

items.get("/", async (req, res) => {
  res.json(await itemsRepo.list(req.user!.id));
});

items.get("/:id", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const item = await itemsRepo.get(req.user!.id, id);
  if (!item) return void res.status(404).json({ error: `Item ${id} not found` });
  res.json(item);
});

items.post("/", async (req, res) => {
  const input = ItemInput.parse(req.body);
  res.status(201).json(await itemsRepo.create(req.user!.id, input));
});

items.patch("/:id", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const patch = ItemPatch.parse(req.body);
  const item = await itemsRepo.update(req.user!.id, id, patch);
  if (!item) return void res.status(404).json({ error: `Item ${id} not found` });
  res.json(item);
});

items.delete("/:id", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!(await itemsRepo.remove(req.user!.id, id))) return void res.status(404).json({ error: `Item ${id} not found` });
  res.status(204).end();
});

/* ---------- Settings ---------- */

export const settings = Router();
settings.use(requireAuth);

settings.get("/", async (req, res) => {
  res.json(await settingsRepo.get(req.user!.id));
});

settings.patch("/", async (req, res) => {
  res.json(await settingsRepo.update(req.user!.id, SettingsPatch.parse(req.body)));
});

/* ---------- Errors ---------- */

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
