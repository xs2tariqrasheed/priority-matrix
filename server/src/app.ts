/**
 * Builds the Express app. Kept separate from `index.ts` so the same app can be
 * started by a long-running Node process (local dev / `npm start`) or handed to
 * a serverless platform such as Vercel, which imports it and never calls listen().
 */
import "./env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./env.js";
import { migrate } from "./db.js";
import { auth, errorHandler, items, settings } from "./routes.js";

/**
 * Runs the schema migration at most once per process. On a long-running server
 * `index.ts` awaits it at boot; on serverless it runs on the first request of a
 * cold start. Set SKIP_MIGRATIONS=true once the schema is known to be in place.
 */
let migration: Promise<void> | null = null;
export function ensureMigrated(): Promise<void> {
  if (process.env.SKIP_MIGRATIONS === "true") return Promise.resolve();
  if (!migration) {
    migration = migrate().catch((e) => {
      migration = null; // let the next request retry instead of caching the failure
      throw e;
    });
  }
  return migration;
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", true);

  if (config.clientOrigins.length > 0) {
    app.use(cors({ origin: config.clientOrigins, credentials: true }));
  }
  app.use(cookieParser());
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Everything that touches the database waits for the schema to exist.
  app.use("/api", (_req, _res, next) => {
    ensureMigrated().then(() => next(), next);
  });

  app.use("/api/auth", auth);
  app.use("/api/items", items);
  app.use("/api/settings", settings);
  app.all("/api/{*rest}", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Serve the built client (client/dist) when it exists, so one process can run
  // the whole app locally. On Vercel the static files are served by the CDN and
  // this directory is absent, so the block is skipped.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(here, "../../client/dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist, { index: "index.html", maxAge: "1h" }));
    app.get("/{*rest}", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}

export const app = createApp();
export default app;
