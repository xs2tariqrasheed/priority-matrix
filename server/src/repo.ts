import type pg from "pg";
import { pool, query } from "./db.js";
import { RangeSetting, type Item, type ItemInput, type ItemPatch, type Settings, type SettingsPatch } from "./types.js";

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
  parent_id: number | null;
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
  parentId: r.parent_id,
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
  parentId: "parent_id",
};

const INSERT = `
  INSERT INTO items
    (user_id, title, area, category, impact, focus, notes, done, allocated_minutes, spent_minutes, progress, deadline, parent_id, completed_at)
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CASE WHEN $8 THEN now() ELSE NULL END)
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
  i.parentId,
];

/** A request that breaks the epic/task rules; the route turns it into a 4xx response. */
export class ItemRuleError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 = 400
  ) {
    super(message);
    this.name = "ItemRuleError";
  }
}

type Db = Pick<pg.PoolClient, "query">;

async function inTransaction<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Locks one of the user's items for the rest of the transaction. */
async function lockItem(db: Db, userId: number, id: number): Promise<ItemRow | undefined> {
  const { rows } = await db.query<ItemRow>("SELECT * FROM items WHERE user_id = $1 AND id = $2 FOR UPDATE", [userId, id]);
  return rows[0];
}

async function hasTasks(db: Db, id: number): Promise<boolean> {
  const { rows } = await db.query("SELECT 1 FROM items WHERE parent_id = $1 LIMIT 1", [id]);
  return rows.length > 0;
}

/**
 * Checks that `parentId` can take a task: it exists, belongs to the user and is not itself a
 * task inside an epic (one level deep). The row is locked so a concurrent move can't nest it.
 */
async function lockParent(db: Db, userId: number, parentId: number): Promise<void> {
  const parent = await lockItem(db, userId, parentId);
  if (!parent) throw new ItemRuleError(`Epic ${parentId} not found`, 404);
  if (parent.parent_id !== null) throw new ItemRuleError("A task inside an epic can't have tasks of its own");
}

/**
 * An epic's progress is the mean of its tasks' progress, with done tasks counting as 100.
 * Left untouched once its last task is gone, so the item keeps the value it had.
 */
async function refreshEpicProgress(db: Db, epicId: number | null): Promise<void> {
  if (epicId === null) return;
  await db.query(
    `UPDATE items p
        SET progress = t.progress, updated_at = now()
       FROM (SELECT round(avg(CASE WHEN done THEN 100 ELSE progress END))::smallint AS progress
               FROM items WHERE parent_id = $1) t
      WHERE p.id = $1 AND t.progress IS NOT NULL AND p.progress <> t.progress`,
    [epicId]
  );
}

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

  /** Adding a task under an item turns that item into an epic. */
  async create(userId: number, input: ItemInput): Promise<Item> {
    if (input.parentId === null) {
      const { rows } = await query<ItemRow>(INSERT, insertParams(userId, input));
      return toItem(rows[0]);
    }
    return inTransaction(async (db) => {
      await lockParent(db, userId, input.parentId!);
      const { rows } = await db.query<ItemRow>(INSERT, insertParams(userId, input));
      await refreshEpicProgress(db, input.parentId);
      return toItem(rows[0]);
    });
  },

  async update(userId: number, id: number, patch: ItemPatch): Promise<Item | undefined> {
    return inTransaction(async (db) => {
      const current = await lockItem(db, userId, id);
      if (!current) return undefined;

      const isEpic = await hasTasks(db, id);
      if (patch.progress !== undefined && patch.progress !== current.progress && isEpic) {
        throw new ItemRuleError("An epic's progress is calculated from its tasks");
      }
      const moving = patch.parentId !== undefined && patch.parentId !== current.parent_id;
      if (moving && patch.parentId !== null) {
        if (patch.parentId === id) throw new ItemRuleError("An item can't be its own epic");
        if (isEpic) throw new ItemRuleError("An epic can't go inside another epic");
        await lockParent(db, userId, patch.parentId!);
      }

      const sets: string[] = [];
      const params: unknown[] = [userId, id];
      for (const key of Object.keys(patch) as (keyof ItemPatch)[]) {
        const value = patch[key];
        if (value === undefined) continue;
        if (key === "progress" && isEpic) continue;
        params.push(value);
        sets.push(`${COLUMNS[key]} = $${params.length}`);
        if (key === "done") {
          // Marking done stamps the completion time (kept if already done); reopening clears it.
          sets.push(`completed_at = CASE WHEN $${params.length} THEN COALESCE(completed_at, now()) ELSE NULL END`);
        }
      }
      if (sets.length === 0) return toItem(current);
      sets.push("updated_at = now()");
      const { rows } = await db.query<ItemRow>(
        `UPDATE items SET ${sets.join(", ")} WHERE user_id = $1 AND id = $2 RETURNING *`,
        params
      );
      const updated = rows[0];
      await refreshEpicProgress(db, updated.parent_id);
      if (moving) await refreshEpicProgress(db, current.parent_id);
      return toItem(updated);
    });
  },

  /** Deleting an epic deletes its tasks too. */
  async remove(userId: number, id: number): Promise<boolean> {
    return inTransaction(async (db) => {
      const { rows } = await db.query<{ parent_id: number | null }>(
        "DELETE FROM items WHERE user_id = $1 AND id = $2 RETURNING parent_id",
        [userId, id]
      );
      if (rows.length === 0) return false;
      await refreshEpicProgress(db, rows[0].parent_id);
      return true;
    });
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

/** A stored range that no longer parses (e.g. after a schema change) falls back to the default. */
function parseRange(value: string | undefined): RangeSetting | null {
  if (value === undefined) return null;
  try {
    const parsed = RangeSetting.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const putSetting = (userId: number, key: string, value: string) =>
  query(
    `INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`,
    [userId, key, value]
  );

export const settingsRepo = {
  async get(userId: number): Promise<Settings> {
    const { rows } = await query<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE user_id = $1 AND key IN ('weekly_minutes', 'date_range')",
      [userId]
    );
    const values = new Map(rows.map((r) => [r.key, r.value]));
    const weekly = values.get("weekly_minutes");
    return {
      weeklyMinutes: weekly !== undefined ? Number(weekly) : DEFAULT_WEEKLY_MINUTES,
      range: parseRange(values.get("date_range")),
    };
  },

  async update(userId: number, patch: SettingsPatch): Promise<Settings> {
    if (patch.weeklyMinutes !== undefined) await putSetting(userId, "weekly_minutes", String(patch.weeklyMinutes));
    if (patch.range !== undefined) await putSetting(userId, "date_range", JSON.stringify(patch.range));
    return this.get(userId);
  },
};
