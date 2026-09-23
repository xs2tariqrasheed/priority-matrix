import { pool, query } from "./db.js";
import type { Item, ItemInput, ItemPatch, Settings, SettingsPatch } from "./types.js";

interface ItemRow {
  id: number;
  user_id: number;
  title: string;
  area: string;
  category: string;
  impact: "P" | "V";
  focus: "S" | "L";
  notes: string;
  done: boolean;
  allocated_minutes: number;
  spent_minutes: number;
  progress: number;
  deadline: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toItem = (r: ItemRow): Item => ({
  id: r.id,
  title: r.title,
  area: r.area,
  category: r.category,
  impact: r.impact,
  focus: r.focus,
  notes: r.notes,
  done: r.done,
  allocatedMinutes: r.allocated_minutes,
  spentMinutes: r.spent_minutes,
  progress: r.progress,
  deadline: r.deadline,
  completedAt: r.completed_at ? r.completed_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

const COLUMNS: Record<keyof ItemPatch, string> = {
  title: "title",
  area: "area",
  category: "category",
  impact: "impact",
  focus: "focus",
  notes: "notes",
  done: "done",
  allocatedMinutes: "allocated_minutes",
  spentMinutes: "spent_minutes",
  progress: "progress",
  deadline: "deadline",
};

const INSERT = `
  INSERT INTO items
    (user_id, title, area, category, impact, focus, notes, done, allocated_minutes, spent_minutes, progress, deadline, completed_at)
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CASE WHEN $8 THEN now() ELSE NULL END)
  RETURNING *`;

const insertParams = (userId: number, i: ItemInput) => [
  userId,
  i.title,
  i.area,
  i.category,
  i.impact,
  i.focus,
  i.notes,
  i.done,
  i.allocatedMinutes,
  i.spentMinutes,
  i.progress,
  i.deadline,
];

/** Items are always scoped to the owning user; other users' rows are invisible. */
export const itemsRepo = {
  async list(userId: number): Promise<Item[]> {
    const { rows } = await query<ItemRow>(
      `SELECT * FROM items WHERE user_id = $1
       ORDER BY done ASC, deadline ASC NULLS LAST, created_at ASC, id ASC`,
      [userId]
    );
    return rows.map(toItem);
  },

  async get(userId: number, id: number): Promise<Item | undefined> {
    const { rows } = await query<ItemRow>("SELECT * FROM items WHERE user_id = $1 AND id = $2", [userId, id]);
    return rows[0] ? toItem(rows[0]) : undefined;
  },

  async create(userId: number, input: ItemInput): Promise<Item> {
    const { rows } = await query<ItemRow>(INSERT, insertParams(userId, input));
    return toItem(rows[0]);
  },

  async update(userId: number, id: number, patch: ItemPatch): Promise<Item | undefined> {
    const sets: string[] = [];
    const params: unknown[] = [userId, id];
    for (const key of Object.keys(patch) as (keyof ItemPatch)[]) {
      const value = patch[key];
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${COLUMNS[key]} = $${params.length}`);
      if (key === "done") {
        // Marking done stamps the completion time (kept if already done); reopening clears it.
        sets.push(`completed_at = CASE WHEN $${params.length} THEN COALESCE(completed_at, now()) ELSE NULL END`);
      }
    }
    if (sets.length === 0) return this.get(userId, id);
    sets.push("updated_at = now()");
    const { rows } = await query<ItemRow>(
      `UPDATE items SET ${sets.join(", ")} WHERE user_id = $1 AND id = $2 RETURNING *`,
      params
    );
    return rows[0] ? toItem(rows[0]) : undefined;
  },

  async remove(userId: number, id: number): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM items WHERE user_id = $1 AND id = $2", [userId, id]);
    return (rowCount ?? 0) > 0;
  },

  async count(userId: number): Promise<number> {
    const { rows } = await query<{ n: number }>("SELECT COUNT(*)::bigint AS n FROM items WHERE user_id = $1", [userId]);
    return rows[0].n;
  },

  async removeAll(userId: number): Promise<number> {
    const { rowCount } = await query("DELETE FROM items WHERE user_id = $1", [userId]);
    return rowCount ?? 0;
  },

  async insertMany(userId: number, items: ItemInput[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const item of items) await client.query(INSERT, insertParams(userId, item));
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  },
};

/** Mon–Wed at ~7 h plus Thu–Sat at ~12 h, matching the focus slots shown in the UI. */
const DEFAULT_WEEKLY_MINUTES = (3 * 7 + 3 * 12) * 60;

export const settingsRepo = {
  async get(userId: number): Promise<Settings> {
    const { rows } = await query<{ value: string }>(
      "SELECT value FROM settings WHERE user_id = $1 AND key = 'weekly_minutes'",
      [userId]
    );
    return { weeklyMinutes: rows[0] ? Number(rows[0].value) : DEFAULT_WEEKLY_MINUTES };
  },

  async update(userId: number, patch: SettingsPatch): Promise<Settings> {
    if (patch.weeklyMinutes !== undefined) {
      await query(
        `INSERT INTO settings (user_id, key, value) VALUES ($1, 'weekly_minutes', $2)
         ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`,
        [userId, String(patch.weeklyMinutes)]
      );
    }
    return this.get(userId);
  },
};
