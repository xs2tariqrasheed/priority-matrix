/** Local / self-hosted entry point: migrate, then listen. */
import "./env.js";
import { config, databaseHost, databaseUrl } from "./env.js";
import { connectionHint } from "./db.js";
import { app, ensureMigrated } from "./app.js";

try {
  await ensureMigrated();
  console.log(`Connected to Postgres at ${databaseHost(databaseUrl())}`);
} catch (e) {
  console.error(connectionHint(e));
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
