import { inTransaction, query, type Db } from "./db.js";
import { log, nameOf } from "./logs.js";
import { RangeSetting, type Item, type ItemInput, type ItemPatch, type Settings, type SettingsPatch } from "./types.js";

/** An `items` row as stored. */
export interface ItemRow {
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
  assignee_id: number | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** A row from `SELECT_ITEMS`: the item plus its owner, assignee and how many people share its epic. */
interface ItemView extends ItemRow {
  owner_name: string;
  owner_email: string;
  assignee_name: string | null;
  assignee_email: string | null;
  member_count: number;
}

const toItem = (r: ItemView): Item => ({
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
  owner: { id: r.user_id, name: r.owner_name, email: r.owner_email },
  assignee: r.assignee_id === null ? null : { id: r.assignee_id, name: r.assignee_name ?? "", email: r.assignee_email ?? "" },
  memberCount: r.member_count,
  completedAt: r.completed_at ? r.completed_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

const COLUMNS: Record<keyof ItemPatch, keyof ItemRow> = {
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

/**
 * The items user $1 can see: their own, plus every item of an epic they are an accepted member
 * of. A task's access follows its epic, so `COALESCE(parent_id, id)` is the epic for both.
 */
const VISIBLE = `(i.user_id = $1 OR EXISTS (
  SELECT 1 FROM epic_members m
   WHERE m.epic_id = COALESCE(i.parent_id, i.id) AND m.user_id = $1 AND m.status = 'accepted'))`;

const SELECT_ITEMS = `
  SELECT i.*,
         o.name AS owner_name, o.email AS owner_email,
         a.name AS assignee_name, a.email AS assignee_email,
         (SELECT COUNT(*) FROM epic_members m
           WHERE m.epic_id = COALESCE(i.parent_id, i.id) AND m.status = 'accepted') AS member_count
    FROM items i
    JOIN users o ON o.id = i.user_id
    LEFT JOIN users a ON a.id = i.assignee_id`;

const INSERT = `
  INSERT INTO items
    (user_id, title, area, category, impact, focus, notes, done, allocated_minutes, spent_minutes, progress, deadline, parent_id, completed_at)
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CASE WHEN $8 THEN now() ELSE NULL END)
  RETURNING id`;

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

/** A request that breaks the epic, task or sharing rules; the route turns it into a 4xx response. */
export class ItemRuleError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 = 400
  ) {
    super(message);
    this.name = "ItemRuleError";
  }
}

async function fetchItem(db: Db, id: number): Promise<Item> {
  const { rows } = await db.query<ItemView>(`${SELECT_ITEMS} WHERE i.id = $1`, [id]);
  return toItem(rows[0]);
}

/** Locks an item the user can see for the rest of the transaction. */
export async function lockItem(db: Db, userId: number, id: number): Promise<ItemRow | undefined> {
  const { rows } = await db.query<ItemRow>(`SELECT i.* FROM items i WHERE ${VISIBLE} AND i.id = $2 FOR UPDATE OF i`, [userId, id]);
  return rows[0];
}

async function hasTasks(db: Db, id: number): Promise<boolean> {
  const { rows } = await db.query("SELECT 1 FROM items WHERE parent_id = $1 LIMIT 1", [id]);
  return rows.length > 0;
}

async function hasMembers(db: Db, id: number): Promise<boolean> {
  const { rows } = await db.query("SELECT 1 FROM epic_members WHERE epic_id = $1 LIMIT 1", [id]);
  return rows.length > 0;
}

/** The epic's owner and its accepted members: the people its tasks can be assigned to. */
export async function epicPeople(db: Db, epicId: number): Promise<Set<number>> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT user_id AS id FROM items WHERE id = $1
     UNION SELECT user_id FROM epic_members WHERE epic_id = $1 AND status = 'accepted'`,
    [epicId]
  );
  return new Set(rows.map((r) => r.id));
}

/**
 * Checks that `parentId` can take a task: the user can see it and it is not itself a task inside
 * an epic (one level deep). The row is locked so a concurrent move can't nest it.
 */
async function lockParent(db: Db, userId: number, parentId: number): Promise<ItemRow> {
  const parent = await lockItem(db, userId, parentId);
  if (!parent) throw new ItemRuleError(`Epic ${parentId} not found`, 404);
  if (parent.parent_id !== null) throw new ItemRuleError("A task inside an epic can't have tasks of its own");
  return parent;
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

const titleOf = async (db: Db, id: number | null): Promise<string | null> =>
  id === null ? null : ((await db.query<{ title: string }>("SELECT title FROM items WHERE id = $1", [id])).rows[0]?.title ?? null);

/**
 * Items are scoped to what the user can see: their own, and the epics shared with them (with
 * every task inside). Members of an epic can do everything its owner can.
 */
export const itemsRepo = {
  async list(userId: number): Promise<Item[]> {
    const { rows } = await query<ItemView>(
      `${SELECT_ITEMS} WHERE ${VISIBLE}
       ORDER BY i.done ASC, i.deadline ASC NULLS LAST, i.created_at ASC, i.id ASC`,
      [userId]
    );
    return rows.map(toItem);
  },

  async get(userId: number, id: number): Promise<Item | undefined> {
    const { rows } = await query<ItemView>(`${SELECT_ITEMS} WHERE ${VISIBLE} AND i.id = $2`, [userId, id]);
    return rows[0] ? toItem(rows[0]) : undefined;
  },

  /** Adding a task under an item turns that item into an epic; the task belongs to the epic's owner. */
  async create(userId: number, input: ItemInput): Promise<Item> {
    return inTransaction(async (db) => {
      const ownerId = input.parentId === null ? userId : (await lockParent(db, userId, input.parentId)).user_id;
      const { rows } = await db.query<{ id: number }>(INSERT, insertParams(ownerId, input));
      await refreshEpicProgress(db, input.parentId);
      await log(db, rows[0].id, userId, "created");
      return fetchItem(db, rows[0].id);
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
      let parent: ItemRow | undefined;
      if (moving && patch.parentId !== null) {
        if (patch.parentId === id) throw new ItemRuleError("An item can't be its own epic");
        if (isEpic) throw new ItemRuleError("An epic can't go inside another epic");
        if (await hasMembers(db, id)) throw new ItemRuleError("A shared task can't go inside an epic; remove its members first");
        parent = await lockParent(db, userId, patch.parentId!);
      }

      const sets: string[] = [];
      const params: unknown[] = [id];
      const set = (column: string, value: unknown) => {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
        return params.length;
      };
      // Only columns whose value really changes, so the log lists what was actually edited.
      const changed: (keyof ItemPatch)[] = [];
      for (const key of Object.keys(patch) as (keyof ItemPatch)[]) {
        const value = patch[key];
        if (value === undefined || (key === "progress" && isEpic) || current[COLUMNS[key]] === value) continue;
        changed.push(key);
        const n = set(COLUMNS[key], value);
        if (key === "done") {
          // Marking done stamps the completion time (kept if already done); reopening clears it.
          sets.push(`completed_at = CASE WHEN $${n} THEN COALESCE(completed_at, now()) ELSE NULL END`);
        }
      }

      // A moved task belongs to its new epic's owner, or to whoever moved it out to the top level.
      // Its assignee stays only while they are still one of the epic's people.
      let unassigned = false;
      if (moving) {
        const ownerId = parent ? parent.user_id : userId;
        if (ownerId !== current.user_id) set("user_id", ownerId);
        if (current.assignee_id !== null && !(parent && (await epicPeople(db, parent.id)).has(current.assignee_id))) {
          set("assignee_id", null);
          unassigned = true;
        }
      }

      if (sets.length === 0) return fetchItem(db, id);
      sets.push("updated_at = now()");
      await db.query(`UPDATE items SET ${sets.join(", ")} WHERE id = $1`, params);
      await refreshEpicProgress(db, moving ? (patch.parentId ?? null) : current.parent_id);
      if (moving) await refreshEpicProgress(db, current.parent_id);

      if (changed.includes("done")) await log(db, id, userId, patch.done ? "completed" : "reopened");
      if (moving) {
        const [from, to] = [await titleOf(db, current.parent_id), await titleOf(db, patch.parentId ?? null)];
        await log(db, id, userId, "moved", { details: { from, to } });
        if (current.parent_id !== null) {
          const title = patch.title ?? current.title;
          await log(db, current.parent_id, userId, "task_moved_out", { details: { title, to } });
        }
      }
      if (unassigned) await log(db, id, userId, "unassigned", { targetId: current.assignee_id, details: { reason: "moved" } });
      const fields = changed.filter((k) => k !== "done" && k !== "parentId");
      if (fields.length > 0) await log(db, id, userId, "updated", { details: { fields } });
      return fetchItem(db, id);
    });
  },

  /**
   * Picks up (yourself), assigns (someone else) or unassigns (`null`) a task inside an epic.
   * Only the epic's owner and accepted members can be assigned.
   */
  async assign(userId: number, id: number, assigneeId: number | null): Promise<Item | undefined> {
    return inTransaction(async (db) => {
      const task = await lockItem(db, userId, id);
      if (!task) return undefined;
      if (task.parent_id === null) throw new ItemRuleError("Only tasks inside an epic can be assigned");
      if (task.assignee_id === assigneeId) return fetchItem(db, id);
      if (assigneeId !== null && !(await epicPeople(db, task.parent_id)).has(assigneeId)) {
        throw new ItemRuleError("Only the epic's owner and members can be assigned");
      }
      await db.query("UPDATE items SET assignee_id = $2, updated_at = now() WHERE id = $1", [id, assigneeId]);
      const previous = task.assignee_id;
      if (assigneeId === null) {
        await log(db, id, userId, "unassigned", { targetId: previous });
      } else {
        await log(db, id, userId, assigneeId === userId ? "picked" : "assigned", {
          targetId: assigneeId,
          details: previous === null ? {} : { previous: await nameOf(db, previous) },
        });
      }
      return fetchItem(db, id);
    });
  },

  /** Deleting an epic deletes its tasks too; deleting a task is logged on its epic. */
  async remove(userId: number, id: number): Promise<boolean> {
    return inTransaction(async (db) => {
      const item = await lockItem(db, userId, id);
      if (!item) return false;
      await db.query("DELETE FROM items WHERE id = $1", [id]);
      if (item.parent_id !== null) {
        await refreshEpicProgress(db, item.parent_id);
        await log(db, item.parent_id, userId, "task_deleted", { details: { title: item.title } });
      }
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
    await inTransaction(async (db) => {
      for (const item of items) await db.query(INSERT, insertParams(userId, item));
    });
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
