import { Router, type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { repo, settingsRepo } from "./db.js";
import { ItemInput, ItemPatch, SettingsPatch } from "./types.js";

export const items = Router();

const parseId = (req: Request, res: Response): number | null => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Item id must be a positive integer" });
    return null;
  }
  return id;
};

items.get("/", (_req, res) => {
  res.json(repo.list());
});

items.get("/:id", (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const item = repo.get(id);
  if (!item) return void res.status(404).json({ error: `Item ${id} not found` });
  res.json(item);
});

items.post("/", (req, res) => {
  const input = ItemInput.parse(req.body);
  res.status(201).json(repo.create(input));
});

items.patch("/:id", (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const patch = ItemPatch.parse(req.body);
  const existing = repo.get(id);
  if (!existing) return void res.status(404).json({ error: `Item ${id} not found` });
  const allocated = patch.allocatedMinutes ?? existing.allocatedMinutes;
  const spent = patch.spentMinutes ?? existing.spentMinutes;
  if (spent > allocated) return void res.status(400).json({ error: "Progress can't exceed the allocated time" });
  const item = repo.update(id, patch);
  if (!item) return void res.status(404).json({ error: `Item ${id} not found` });
  res.json(item);
});

items.delete("/:id", (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!repo.remove(id)) return void res.status(404).json({ error: `Item ${id} not found` });
  res.status(204).end();
});

export const settings = Router();

settings.get("/", (_req, res) => {
  res.json(settingsRepo.get());
});

settings.patch("/", (req, res) => {
  res.json(settingsRepo.update(SettingsPatch.parse(req.body)));
});

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
