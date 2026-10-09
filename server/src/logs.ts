import { query, type Db } from "./db.js";
import type { LogEntry, UserRef } from "./types.js";

/**
 * What happened to an item. Task events are logged on the task; sharing events (invites,
 * answers, members leaving) and a task being deleted or moved out are logged on the epic.
 */
export type LogAction =
  | "created"
  | "updated"
  | "completed"
  | "reopened"
  | "moved"
  | "task_moved_out"
  | "task_deleted"
  | "invited"
  | "invite_cancelled"
  | "accepted"
  | "rejected"
  | "removed"
  | "left"
  | "picked"
  | "assigned"
  | "unassigned";

export async function log(
  db: Db,
  itemId: number,
  actorId: number,
  action: LogAction,
  opts: { targetId?: number | null; details?: Record<string, unknown> } = {}
): Promise<void> {
  await db.query("INSERT INTO item_logs (item_id, actor_id, action, target_id, details) VALUES ($1, $2, $3, $4, $5)", [
    itemId,
    actorId,
    action,
    opts.targetId ?? null,
    JSON.stringify(opts.details ?? {}),
  ]);
}

/** A person's name for log details, so the entry still reads right if they change it later. */
export async function nameOf(db: Db, userId: number): Promise<string> {
  const { rows } = await db.query<{ name: string; email: string }>("SELECT name, email FROM users WHERE id = $1", [userId]);
  return rows[0] ? rows[0].name || rows[0].email : "someone";
}

interface LogRow {
  id: number;
  item_id: number;
  item_title: string;
  action: string;
  details: Record<string, unknown>;
  created_at: Date;
  actor_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  target_id: number | null;
  target_name: string | null;
  target_email: string | null;
}

const ref = (id: number | null, name: string | null, email: string | null): UserRef | null =>
  id === null ? null : { id, name: name ?? "", email: email ?? "" };

export const logsRepo = {
  /** Newest first. An epic's log includes the entries of the tasks it holds now. */
  async list(itemId: number, limit = 300): Promise<LogEntry[]> {
    const { rows } = await query<LogRow>(
      `SELECT l.id, l.item_id, it.title AS item_title, l.action, l.details, l.created_at,
              l.actor_id, ac.name AS actor_name, ac.email AS actor_email,
              l.target_id, tg.name AS target_name, tg.email AS target_email
         FROM item_logs l
         JOIN items it ON it.id = l.item_id
         LEFT JOIN users ac ON ac.id = l.actor_id
         LEFT JOIN users tg ON tg.id = l.target_id
        WHERE l.item_id = $1 OR it.parent_id = $1
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT $2`,
      [itemId, limit]
    );
    return rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      itemTitle: r.item_title,
      action: r.action,
      actor: ref(r.actor_id, r.actor_name, r.actor_email),
      target: ref(r.target_id, r.target_name, r.target_email),
      details: r.details,
      createdAt: r.created_at.toISOString(),
    }));
  },
};
