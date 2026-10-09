import { inTransaction, query, type Db } from "./db.js";
import { log } from "./logs.js";
import { ItemRuleError, lockItem, type ItemRow } from "./repo.js";
import type { Invitation, Member, Members, MemberStatus, UserRef } from "./types.js";

/**
 * Locks an epic the user can see. Sharing works on top-level items only: a task inside an epic
 * is shared through its epic.
 */
async function lockEpic(db: Db, userId: number, epicId: number): Promise<ItemRow> {
  const epic = await lockItem(db, userId, epicId);
  if (!epic) throw new ItemRuleError(`Item ${epicId} not found`, 404);
  if (epic.parent_id !== null) throw new ItemRuleError("Tasks inside an epic are shared through their epic; share the epic instead");
  return epic;
}

const userRef = (id: number, name: string, email: string): UserRef => ({ id, name, email });

/** Finds a user by numeric id or by email address. */
async function findUser(db: Db, who: string): Promise<UserRef | undefined> {
  const byId = /^\d+$/.test(who);
  const { rows } = await db.query<UserRef>(`SELECT id, name, email FROM users WHERE ${byId ? "id = $1" : "email = $1"}`, [
    byId ? Number(who) : who.toLowerCase(),
  ]);
  return rows[0];
}

const display = (u: UserRef) => u.name || u.email;

interface MemberRow {
  user_id: number;
  name: string;
  email: string;
  status: MemberStatus;
  invited_at: Date;
  responded_at: Date | null;
  inviter_id: number | null;
  inviter_name: string | null;
  inviter_email: string | null;
}

async function membersOf(db: Db, epic: ItemRow): Promise<Members> {
  const owner = await db.query<UserRef>("SELECT id, name, email FROM users WHERE id = $1", [epic.user_id]);
  const { rows } = await db.query<MemberRow>(
    `SELECT m.user_id, u.name, u.email, m.status, m.invited_at, m.responded_at,
            m.invited_by AS inviter_id, iv.name AS inviter_name, iv.email AS inviter_email
       FROM epic_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN users iv ON iv.id = m.invited_by
      WHERE m.epic_id = $1
      ORDER BY CASE m.status WHEN 'accepted' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, m.invited_at`,
    [epic.id]
  );
  return {
    owner: owner.rows[0],
    members: rows.map(
      (r): Member => ({
        user: userRef(r.user_id, r.name, r.email),
        status: r.status,
        invitedBy: r.inviter_id === null ? null : userRef(r.inviter_id, r.inviter_name ?? "", r.inviter_email ?? ""),
        invitedAt: r.invited_at.toISOString(),
        respondedAt: r.responded_at ? r.responded_at.toISOString() : null,
      })
    ),
  };
}

/** Members can do everything the owner can, including inviting and removing other members. */
export const membersRepo = {
  async list(userId: number, epicId: number): Promise<Members> {
    return inTransaction(async (db) => membersOf(db, await lockEpic(db, userId, epicId)));
  },

  /**
   * Invites someone by email or user id. They see the invitation in the app and can accept or
   * reject it; someone who rejected can be invited again.
   */
  async invite(userId: number, epicId: number, who: string): Promise<Members> {
    return inTransaction(async (db) => {
      const epic = await lockEpic(db, userId, epicId);
      const invitee = await findUser(db, who);
      if (!invitee) throw new ItemRuleError(`No user with the ${/^\d+$/.test(who) ? "id" : "email"} ${who}`, 404);
      if (invitee.id === epic.user_id) {
        throw new ItemRuleError(invitee.id === userId ? "You own this epic already" : `${display(invitee)} owns this epic`);
      }
      const { rows } = await db.query<{ status: MemberStatus }>(
        "SELECT status FROM epic_members WHERE epic_id = $1 AND user_id = $2 FOR UPDATE",
        [epicId, invitee.id]
      );
      const status = rows[0]?.status;
      if (status === "accepted") throw new ItemRuleError(`${display(invitee)} is already a member`);
      if (status === "pending") throw new ItemRuleError(`${display(invitee)} has already been invited`);
      await db.query(
        `INSERT INTO epic_members (epic_id, user_id, status, invited_by) VALUES ($1, $2, 'pending', $3)
         ON CONFLICT (epic_id, user_id) DO UPDATE
           SET status = 'pending', invited_by = EXCLUDED.invited_by, invited_at = now(), responded_at = NULL`,
        [epicId, invitee.id, userId]
      );
      await log(db, epicId, userId, "invited", { targetId: invitee.id });
      return membersOf(db, epic);
    });
  },

  /**
   * Removes a member, withdraws an invitation, or (for yourself) leaves the epic. A member who
   * goes is unassigned from the epic's tasks.
   */
  async remove(userId: number, epicId: number, memberId: number): Promise<Members> {
    return inTransaction(async (db) => {
      const epic = await lockEpic(db, userId, epicId);
      const { rows } = await db.query<{ status: MemberStatus }>(
        "DELETE FROM epic_members WHERE epic_id = $1 AND user_id = $2 RETURNING status",
        [epicId, memberId]
      );
      if (rows.length === 0) throw new ItemRuleError("That person isn't a member of this epic", 404);
      const leaving = memberId === userId;
      if (rows[0].status === "accepted") {
        const reason = leaving ? "left" : "removed";
        const tasks = await db.query<{ id: number }>(
          "UPDATE items SET assignee_id = NULL, updated_at = now() WHERE parent_id = $1 AND assignee_id = $2 RETURNING id",
          [epicId, memberId]
        );
        for (const t of tasks.rows) await log(db, t.id, userId, "unassigned", { targetId: memberId, details: { reason } });
        await log(db, epicId, userId, reason, { targetId: memberId });
      } else {
        await log(db, epicId, userId, "invite_cancelled", { targetId: memberId });
      }
      return membersOf(db, epic);
    });
  },
};

interface InvitationRow {
  epic_id: number;
  title: string;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  inviter_id: number | null;
  inviter_name: string | null;
  inviter_email: string | null;
  invited_at: Date;
}

export const invitationsRepo = {
  /** The user's invitations still waiting for an answer, newest first. */
  async list(userId: number): Promise<Invitation[]> {
    const { rows } = await query<InvitationRow>(
      `SELECT m.epic_id, i.title, i.user_id AS owner_id, o.name AS owner_name, o.email AS owner_email,
              m.invited_by AS inviter_id, iv.name AS inviter_name, iv.email AS inviter_email, m.invited_at
         FROM epic_members m
         JOIN items i ON i.id = m.epic_id
         JOIN users o ON o.id = i.user_id
         LEFT JOIN users iv ON iv.id = m.invited_by
        WHERE m.user_id = $1 AND m.status = 'pending'
        ORDER BY m.invited_at DESC`,
      [userId]
    );
    return rows.map((r) => ({
      epic: { id: r.epic_id, title: r.title },
      owner: userRef(r.owner_id, r.owner_name, r.owner_email),
      invitedBy: r.inviter_id === null ? null : userRef(r.inviter_id, r.inviter_name ?? "", r.inviter_email ?? ""),
      invitedAt: r.invited_at.toISOString(),
    }));
  },

  /** Accepting gives access to the epic and all its tasks; rejecting leaves it out of sight. */
  async respond(userId: number, epicId: number, accept: boolean): Promise<void> {
    await inTransaction(async (db) => {
      const { rowCount } = await db.query(
        `UPDATE epic_members SET status = $3, responded_at = now()
          WHERE epic_id = $1 AND user_id = $2 AND status = 'pending'`,
        [epicId, userId, accept ? "accepted" : "rejected"]
      );
      if (!rowCount) throw new ItemRuleError("Invitation not found", 404);
      await log(db, epicId, userId, accept ? "accepted" : "rejected");
    });
  },
};
