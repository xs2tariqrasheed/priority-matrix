import Database from "better-sqlite3";
import path from "node:path";
import type { Item, ItemInput, ItemPatch, Settings, SettingsPatch } from "./types.js";

const DB_PATH = process.env.DB_PATH ?? path.resolve(process.cwd(), "data.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    area       TEXT    NOT NULL,
    category   TEXT    NOT NULL DEFAULT '',
    impact     TEXT    NOT NULL CHECK (impact IN ('P','V')),
    focus      TEXT    NOT NULL CHECK (focus  IN ('S','L')),
    notes      TEXT    NOT NULL DEFAULT '',
    done       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Columns added after the first release; add them to existing databases.
const itemColumns = new Set(db.prepare<[], { name: string }>("PRAGMA table_info(items)").all().map((c) => c.name));
if (!itemColumns.has("allocated_minutes")) db.exec("ALTER TABLE items ADD COLUMN allocated_minutes INTEGER NOT NULL DEFAULT 0");
if (!itemColumns.has("spent_minutes")) db.exec("ALTER TABLE items ADD COLUMN spent_minutes INTEGER NOT NULL DEFAULT 0");

interface Row {
  id: number;
  title: string;
  area: string;
  category: string;
  impact: "P" | "V";
  focus: "S" | "L";
  notes: string;
  done: number;
  allocated_minutes: number;
  spent_minutes: number;
  created_at: string;
  updated_at: string;
}

const toItem = (r: Row): Item => ({
  id: r.id,
  title: r.title,
  area: r.area,
  category: r.category,
  impact: r.impact,
  focus: r.focus,
  notes: r.notes,
  done: r.done === 1,
  allocatedMinutes: r.allocated_minutes,
  spentMinutes: r.spent_minutes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const stmts = {
  all: db.prepare<[], Row>("SELECT * FROM items ORDER BY done ASC, created_at ASC, id ASC"),
  byId: db.prepare<[number], Row>("SELECT * FROM items WHERE id = ?"),
  insert: db.prepare(
    `INSERT INTO items (title, area, category, impact, focus, notes, done, allocated_minutes, spent_minutes)
     VALUES (@title, @area, @category, @impact, @focus, @notes, @done, @allocatedMinutes, @spentMinutes)`
  ),
  remove: db.prepare("DELETE FROM items WHERE id = ?"),
  count: db.prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM items"),
  getSetting: db.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?"),
  setSetting: db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ),
};

export const repo = {
  list(): Item[] {
    return stmts.all.all().map(toItem);
  },

  get(id: number): Item | undefined {
    const row = stmts.byId.get(id);
    return row ? toItem(row) : undefined;
  },

  create(input: ItemInput): Item {
    const info = stmts.insert.run({ ...input, done: input.done ? 1 : 0 });
    return this.get(Number(info.lastInsertRowid))!;
  },

  update(id: number, patch: ItemPatch): Item | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;

    const columns: Record<keyof ItemPatch, string> = {
      title: "title",
      area: "area",
      category: "category",
      impact: "impact",
      focus: "focus",
      notes: "notes",
      done: "done",
      allocatedMinutes: "allocated_minutes",
      spentMinutes: "spent_minutes",
    };

    const sets: string[] = [];
    const params: Record<string, unknown> = { id };
    for (const key of Object.keys(patch) as (keyof ItemPatch)[]) {
      const value = patch[key];
      if (value === undefined) continue;
      sets.push(`${columns[key]} = @${key}`);
      params[key] = key === "done" ? (value ? 1 : 0) : value;
    }
    if (sets.length === 0) return existing;

    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = @id`).run(params);
    return this.get(id);
  },

  remove(id: number): boolean {
    return stmts.remove.run(id).changes > 0;
  },

  count(): number {
    return stmts.count.get()!.n;
  },

  insertMany(items: ItemInput[]): void {
    const tx = db.transaction((rows: ItemInput[]) => {
      for (const r of rows) stmts.insert.run({ ...r, done: r.done ? 1 : 0 });
    });
    tx(items);
  },
};

/** Mon–Wed at ~7 h plus Thu–Sat at ~12 h, matching the focus slots shown in the UI. */
const DEFAULT_WEEKLY_MINUTES = (3 * 7 + 3 * 12) * 60;

export const settingsRepo = {
  get(): Settings {
    const row = stmts.getSetting.get("weekly_minutes");
    return { weeklyMinutes: row ? Number(row.value) : DEFAULT_WEEKLY_MINUTES };
  },

  update(patch: SettingsPatch): Settings {
    if (patch.weeklyMinutes !== undefined) stmts.setSetting.run("weekly_minutes", String(patch.weeklyMinutes));
    return this.get();
  },
};
