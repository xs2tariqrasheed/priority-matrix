export type Impact = "P" | "V";
export type Focus = "S" | "L";
export type QuadrantKey = `${Impact}${Focus}`;

/** An item as the API returns it. */
export interface ApiItem {
  id: number;
  title: string;
  area: string;
  category: string;
  impact: Impact;
  focus: Focus;
  notes: string;
  done: boolean;
  /** Time budgeted for the task, in minutes. */
  allocatedMinutes: number;
  /** Time actually worked, in minutes (independent of progress). */
  spentMinutes: number;
  /** Completion, 0–100. */
  progress: number;
  /** Due date as YYYY-MM-DD, or null. */
  deadline: string | null;
  /** The epic this task sits in, or null for a top-level item (one level deep). */
  parentId: number | null;
  /** Whose matrix the item belongs to; a task inside an epic belongs to the epic's owner. */
  owner: UserRef;
  /** Who picked up the task (tasks inside an epic only). */
  assignee: UserRef | null;
  /** People the item's epic is shared with (accepted members, owner excluded). */
  memberCount: number;
  /** ISO timestamp set when the task was marked done. */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * An item as the app shows it. Anything with tasks under it is an epic: `childCount` > 0 and
 * `progress` is the mean of its tasks' progress (see `withRollups`).
 */
export interface Item extends ApiItem {
  childCount: number;
}

export interface ItemInput {
  title: string;
  area: string;
  category?: string;
  impact: Impact;
  focus: Focus;
  notes?: string;
  done?: boolean;
  allocatedMinutes?: number;
  spentMinutes?: number;
  progress?: number;
  deadline?: string | null;
  parentId?: number | null;
}

export type ItemPatch = Partial<ItemInput>;

/** The numbers edited together in the quick time editor; an epic's progress is left out. */
export interface TimePatch {
  allocatedMinutes: number;
  spentMinutes: number;
  progress?: number;
}

/** Saved header range: presets by name (so "This week" follows the calendar), anything else as fixed dates. */
export type RangeSetting =
  | { preset: "this" | "next" | "last" | "next3" }
  | { preset: "custom"; start: string; end: string };

export interface Settings {
  weeklyMinutes: number;
  /** Null until the user picks a range. */
  range: RangeSetting | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

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

/** An epic's people: the owner plus everyone invited (accepted, pending or rejected). */
export interface Members {
  owner: UserRef;
  members: Member[];
}

/** An invitation to the signed-in user, waiting for an answer. */
export interface Invitation {
  epic: { id: number; title: string };
  owner: UserRef;
  invitedBy: UserRef | null;
  invitedAt: string;
}

export interface LogEntry {
  id: number;
  /** The epic itself or one of its tasks. */
  itemId: number;
  itemTitle: string;
  action: string;
  actor: UserRef | null;
  target: UserRef | null;
  details: Record<string, unknown>;
  createdAt: string;
}
