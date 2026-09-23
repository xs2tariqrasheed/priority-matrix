import pg from "pg";
import { databaseHost, databaseUrl, sslConfig } from "./env.js";

const { Pool, types } = pg;

// DATE columns come back as plain "YYYY-MM-DD" strings (no timezone shifting).
types.setTypeParser(1082, (v) => v);
// BIGINT / BIGSERIAL ids and COUNT(*) come back as numbers.
types.setTypeParser(20, (v) => Number(v));

const url = databaseUrl();

export const pool = new Pool({
  connectionString: url,
  ssl: sslConfig(url),
  max: Number(process.env.PG_POOL_MAX ?? 8),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres client error:", err.message);
});

export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) =>
  pool.query<T>(text, params);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    name          TEXT        NOT NULL DEFAULT '',
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT        PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS items (
    id                BIGSERIAL   PRIMARY KEY,
    user_id           BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             TEXT        NOT NULL,
    area              TEXT        NOT NULL,
    category          TEXT        NOT NULL DEFAULT '',
    impact            TEXT        NOT NULL CHECK (impact IN ('P','V')),
    focus             TEXT        NOT NULL CHECK (focus  IN ('S','L')),
    notes             TEXT        NOT NULL DEFAULT '',
    done              BOOLEAN     NOT NULL DEFAULT false,
    allocated_minutes INTEGER     NOT NULL DEFAULT 0,
    spent_minutes     INTEGER     NOT NULL DEFAULT 0,
    progress          SMALLINT    NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    deadline          DATE,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS items_user_id_idx ON items(user_id);
  CREATE INDEX IF NOT EXISTS items_user_deadline_idx ON items(user_id, deadline);

  CREATE TABLE IF NOT EXISTS settings (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key     TEXT   NOT NULL,
    value   TEXT   NOT NULL,
    PRIMARY KEY (user_id, key)
  );

  -- Block Supabase's public REST/GraphQL API (anon / authenticated roles) from reading these
  -- tables. The app connects as the table owner, which is unaffected by RLS.
  ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE items    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
`;

/** Creates the schema if it doesn't exist. Safe to run on every start. */
export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(SCHEMA);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Human-readable advice for the most common connection failures. */
export function connectionHint(err: unknown): string {
  const e = err as NodeJS.ErrnoException & { message?: string };
  const host = databaseHost(url);
  const lines = [`Could not connect to Postgres at ${host}: ${e?.message ?? String(err)}`];
  if (e?.code === "ENETUNREACH" || e?.code === "ENOTFOUND" || e?.code === "EHOSTUNREACH") {
    if (host.endsWith(".supabase.co")) {
      lines.push(
        "Supabase's direct connection (db.<ref>.supabase.co) is IPv6-only. If your network has no IPv6,",
        "use the Session pooler string from Supabase → Project Settings → Database → Connection string",
        "(it looks like postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres)."
      );
    } else {
      lines.push("Check that the host is reachable from this machine.");
    }
  } else if (e?.code === "28P01" || /password authentication failed/i.test(e?.message ?? "")) {
    lines.push("The database password is wrong. Set DATABASE_PASSWORD (or fix DATABASE_URL) in server/.env.");
  } else if (e?.code === "ECONNREFUSED") {
    lines.push("Nothing is listening on that host/port. Is Postgres running?");
  } else if (/self.signed|certificate/i.test(e?.message ?? "")) {
    lines.push("TLS verification failed. Set DATABASE_CA_CERT to the server's CA bundle, or leave it unset to skip verification.");
  }
  return lines.join("\n");
}

export const closePool = () => pool.end();
