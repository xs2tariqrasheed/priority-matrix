import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { query } from "./db.js";
import { config } from "./env.js";
import type { User } from "./types.js";

const scrypt = promisify<string | Buffer, Buffer, number, { N: number; r: number; p: number }, Buffer>(scryptCb);

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. */
      user?: User;
      /** Raw session token from the cookie, set by `requireAuth`. */
      sessionToken?: string;
    }
  }
}

/* ---------- Passwords (scrypt, no native dependencies) ---------- */

const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 };

/** Returns "scrypt$N$r$p$salt$hash" (base64url), safe to store. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, SCRYPT.keyLength, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* ---------- Users ---------- */

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
}

const toUser = (r: UserRow): User => ({ id: r.id, email: r.email, name: r.name, createdAt: r.created_at.toISOString() });

export const usersRepo = {
  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | undefined> {
    const { rows } = await query<UserRow>("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    return rows[0] ? { ...toUser(rows[0]), passwordHash: rows[0].password_hash } : undefined;
  },

  async create(email: string, name: string, password: string): Promise<User> {
    const { rows } = await query<UserRow>(
      "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [email.trim().toLowerCase(), name.trim(), await hashPassword(password)]
    );
    return toUser(rows[0]);
  },

  async setPassword(id: number, password: string): Promise<void> {
    await query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, await hashPassword(password)]);
    await query("DELETE FROM sessions WHERE user_id = $1", [id]);
  },

  async list(): Promise<User[]> {
    const { rows } = await query<UserRow>("SELECT * FROM users ORDER BY id");
    return rows.map(toUser);
  },
};

/* ---------- Sessions (opaque token in an HttpOnly cookie, hashed at rest) ---------- */

export const SESSION_COOKIE = "pm_session";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const sessionsRepo = {
  async create(userId: number): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await query(
      `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
      [hashToken(token), userId, String(config.sessionDays)]
    );
    // Opportunistic cleanup so the table doesn't grow forever.
    await query("DELETE FROM sessions WHERE expires_at < now()");
    return token;
  },

  async userFor(token: string): Promise<User | undefined> {
    const { rows } = await query<UserRow>(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)]
    );
    return rows[0] ? toUser(rows[0]) : undefined;
  },

  async remove(token: string): Promise<void> {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  },
};

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.cookieSecure,
  path: "/",
  maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
});

/** Rejects requests without a valid session; otherwise attaches `req.user`. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = (req.cookies as Record<string, string | undefined>)?.[SESSION_COOKIE];
  const user = token ? await sessionsRepo.userFor(token) : undefined;
  if (!user) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  req.user = user;
  req.sessionToken = token;
  next();
}

/* ---------- Login throttling (in-memory, per IP + email) ---------- */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; first: number }>();

export const loginThrottle = {
  key: (ip: string, email: string) => `${ip}|${email}`,

  blocked(key: string): boolean {
    const entry = failures.get(key);
    if (!entry) return false;
    if (Date.now() - entry.first > WINDOW_MS) {
      failures.delete(key);
      return false;
    }
    return entry.count >= MAX_FAILURES;
  },

  fail(key: string) {
    const entry = failures.get(key);
    if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
    else entry.count += 1;
  },

  clear(key: string) {
    failures.delete(key);
  },
};
