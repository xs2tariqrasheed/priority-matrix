import { z } from "zod";

/** P = Pain killer (immediate), V = Vitamin (low priority) */
export const Impact = z.enum(["P", "V"]);
/** S = Short focus, L = Long focus */
export const Focus = z.enum(["S", "L"]);

/** Minutes in 15-minute steps, capped at one week. */
const Minutes = z.number().int().min(0).max(7 * 24 * 60).multipleOf(15, "Time must be in 15-minute steps");

/** Completion percentage, tracked separately from time spent. */
const Progress = z.number().int().min(0).max(100);

/** Calendar date as YYYY-MM-DD (no time, no timezone). */
export const DateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Not a valid calendar date");

/** Field rules shared by create and update (no defaults here). */
const ItemFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  area: z.string().trim().min(1, "Area is required").max(60),
  category: z.string().trim().max(60),
  impact: Impact,
  focus: Focus,
  notes: z.string().max(2000),
  done: z.boolean(),
  /** Time budgeted for the task. */
  allocatedMinutes: Minutes,
  /** Time actually worked on the task (independent of progress). */
  spentMinutes: Minutes,
  /** How complete the task is, 0–100. */
  progress: Progress,
  /** Due date, or null when the task has no deadline. */
  deadline: DateOnly.nullable(),
  /** The epic this task belongs to, or null for a top-level item. Only one level deep. */
  parentId: z.number().int().positive().nullable(),
});

/** Create: optional fields get defaults. */
export const ItemInput = ItemFields.extend({
  category: ItemFields.shape.category.default(""),
  notes: ItemFields.shape.notes.default(""),
  done: ItemFields.shape.done.default(false),
  allocatedMinutes: Minutes.default(0),
  spentMinutes: Minutes.default(0),
  progress: Progress.default(0),
  deadline: ItemFields.shape.deadline.default(null),
  parentId: ItemFields.shape.parentId.default(null),
});

/** Update: every field optional, nothing defaulted, so omitted fields stay untouched. */
export const ItemPatch = ItemFields.partial();

export type ItemInput = z.infer<typeof ItemInput>;
export type ItemPatch = z.infer<typeof ItemPatch>;

export interface Item {
  id: number;
  title: string;
  area: string;
  category: string;
  impact: "P" | "V";
  focus: "S" | "L";
  notes: string;
  done: boolean;
  allocatedMinutes: number;
  spentMinutes: number;
  progress: number;
  deadline: string | null;
  /** Set on a task inside an epic. An item with tasks under it is an epic. */
  parentId: number | null;
  /** Whose matrix the item belongs to. A task inside an epic belongs to the epic's owner. */
  owner: UserRef;
  /** Who picked up the task; only tasks inside an epic can be assigned. */
  assignee: UserRef | null;
  /** Accepted members of the item's epic (of the item itself when it is top-level), owner excluded. */
  memberCount: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Sharing ---------- */

/** Invite by email address or numeric user id. */
export const InviteInput = z.object({
  user: z.string().trim().min(1, "Enter an email address or a user id").max(200),
});

/** Assign a task to one of the epic's people, or `null` to unassign it. */
export const AssignInput = z.object({
  userId: z.number().int().positive().nullable(),
});

export interface UserRef {
  id: number;
  name: string;
  email: string;
}

export type MemberStatus = "pending" | "accepted" | "rejected";

export interface Member {
  user: UserRef;
  status: MemberStatus;
  invitedBy: UserRef | null;
  invitedAt: string;
  respondedAt: string | null;
}

export interface Members {
  owner: UserRef;
  members: Member[];
}

export interface Invitation {
  epic: { id: number; title: string };
  owner: UserRef;
  invitedBy: UserRef | null;
  invitedAt: string;
}

export interface LogEntry {
  id: number;
  /** The item the entry is about: the epic itself or one of its tasks. */
  itemId: number;
  itemTitle: string;
  action: string;
  actor: UserRef | null;
  /** The person acted on: invited, removed, assigned or unassigned. */
  target: UserRef | null;
  details: Record<string, unknown>;
  createdAt: string;
}

/**
 * The date range last picked in the header. Presets are stored by name so "This week" keeps
 * meaning the current week; anything else is stored as fixed dates.
 */
export const RangeSetting = z.discriminatedUnion("preset", [
  z.object({ preset: z.enum(["this", "next", "last", "next3"]) }),
  z
    .object({ preset: z.literal("custom"), start: DateOnly, end: DateOnly })
    .refine((r) => r.start <= r.end, "Range start must be on or before its end"),
]);

export type RangeSetting = z.infer<typeof RangeSetting>;

export const SettingsPatch = z
  .object({
    weeklyMinutes: Minutes,
    range: RangeSetting,
  })
  .partial();

export type SettingsPatch = z.infer<typeof SettingsPatch>;

export interface Settings {
  weeklyMinutes: number;
  /** Null until the user picks a range; the app then shows this week. */
  range: RangeSetting | null;
}

export const Email = z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address"));

export const LoginInput = z.object({
  email: Email,
  password: z.string().min(1, "Password is required").max(1000),
});

export type LoginInput = z.infer<typeof LoginInput>;

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}
