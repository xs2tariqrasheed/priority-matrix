import "./env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config, databaseHost, databaseUrl } from "./env.js";
import { connectionHint, migrate } from "./db.js";
import { auth, errorHandler, items, settings } from "./routes.js";

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
app.use("/api/auth", auth);
app.use("/api/items", items);
app.use("/api/settings", settings);
app.all("/api/{*rest}", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Serve the built client (client/dist) when it exists, so one process can run the whole app.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, "../../client/dist");
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist, { index: "index.html", maxAge: "1h" }));
  app.get("/{*rest}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);

try {
  await migrate();
  console.log(`Connected to Postgres at ${databaseHost(databaseUrl())}`);
} catch (e) {
  console.error(connectionHint(e));
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
