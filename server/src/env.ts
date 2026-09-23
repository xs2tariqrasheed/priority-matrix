/**
 * Loads environment variables from `server/.env` and the repo root `.env`
 * (first match wins, existing process env is never overridden) and exposes
 * the resolved database configuration.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { ConnectionOptions } from "node:tls";

const here = path.dirname(fileURLToPath(import.meta.url));
// Works from both `src/` (tsx) and `dist/` (compiled): ../ is the server dir, ../../ the repo root.
export const ENV_FILES = [path.resolve(here, "../.env"), path.resolve(here, "../../.env")];

for (const file of ENV_FILES) {
  if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true });
}

/**
 * The Postgres connection string. Supabase shows it with a `[YOUR-PASSWORD]`
 * placeholder; that can be left in place and the password given separately as
 * DATABASE_PASSWORD (it is URL-encoded for you).
 */
export function databaseUrl(): string {
  let url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy server/.env.example to server/.env and add your Postgres connection string."
    );
  }
  if (url.includes("[YOUR-PASSWORD]")) {
    const password = process.env.DATABASE_PASSWORD;
    if (!password) {
      throw new Error(
        "DATABASE_URL still contains [YOUR-PASSWORD]. Replace it with the real password, or set DATABASE_PASSWORD in .env."
      );
    }
    url = url.replace("[YOUR-PASSWORD]", encodeURIComponent(password));
  }
  return url;
}

/** Hostname of the configured database, for log lines and hints (never the password). */
export function databaseHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

/**
 * TLS settings for `pg`.
 * - DATABASE_SSL=disable      → plain connection (local Postgres)
 * - DATABASE_CA_CERT=<path>   → verify the server against that CA bundle
 * - otherwise, remote hosts use TLS without CA verification (Supabase's default guidance)
 */
export function sslConfig(url: string): false | ConnectionOptions {
  const mode = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (mode === "disable" || mode === "false" || mode === "off") return false;
  const host = databaseHost(url);
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (local && mode === "") return false;
  const ca = process.env.DATABASE_CA_CERT;
  if (ca) return { ca: fs.readFileSync(path.resolve(ca), "utf8"), rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProduction: process.env.NODE_ENV === "production",
  /** Comma-separated list of allowed browser origins; unset means same-origin only (the Vite proxy). */
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  trustProxy: process.env.TRUST_PROXY === "true",
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
};
