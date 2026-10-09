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
