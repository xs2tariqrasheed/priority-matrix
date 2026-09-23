export type Impact = "P" | "V";
export type Focus = "S" | "L";
export type QuadrantKey = `${Impact}${Focus}`;

export interface Item {
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
  /** ISO timestamp set when the task was marked done. */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
}

export type ItemPatch = Partial<ItemInput>;

/** The three numbers edited together in the quick time editor. */
export interface TimePatch {
  allocatedMinutes: number;
  spentMinutes: number;
  progress: number;
}

export interface Settings {
  weeklyMinutes: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}
