import type { Item, QuadrantKey } from "./types";
import { type DateRange, inRange, toLocalDate, today, weekRange } from "./dates";

export type SortKey = "deadline" | "title" | "area" | "progress" | "allocated" | "spent" | "created";
export type SortDir = "asc" | "desc";

export interface Sort {
  key: SortKey;
  dir: SortDir;
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "deadline", label: "Deadline" },
  { value: "title", label: "Title" },
  { value: "area", label: "Area" },
  { value: "progress", label: "Progress" },
  { value: "allocated", label: "Allocated time" },
  { value: "spent", label: "Time spent" },
  { value: "created", label: "Date added" },
];

export interface Filters {
  range: DateRange;
  area: string;
  /** Empty means every label. */
  labels: QuadrantKey[];
  query: string;
  /** Keep showing open tasks whose deadline has already passed. */
  includeOverdue: boolean;
  /** Show tasks that have no deadline at all. */
  includeUndated: boolean;
  /** Show tasks marked done (the Reports page always includes them). */
  includeDone: boolean;
  sort: Sort;
}

export const DEFAULT_SORT: Sort = { key: "deadline", dir: "asc" };

export const defaultFilters = (): Filters => ({
  range: weekRange(0),
  area: "All",
  labels: [],
  query: "",
  includeOverdue: true,
  includeUndated: true,
  includeDone: false,
  sort: DEFAULT_SORT,
});

export const isOverdue = (i: Item) => !i.done && i.deadline !== null && i.deadline < today();

/** Local calendar date the task was completed on, or null. */
export const completedOn = (i: Item) => (i.done && i.completedAt ? toLocalDate(i.completedAt) : null);

/** Whether the task belongs to the selected date range (before area, label and search filters). */
export function inDateScope(i: Item, f: Filters): boolean {
  if (i.deadline === null) {
    const done = completedOn(i);
    return f.includeUndated || (done !== null && inRange(done, f.range));
  }
  if (inRange(i.deadline, f.range)) return true;
  const done = completedOn(i);
  if (done !== null && inRange(done, f.range)) return true;
  return f.includeOverdue && isOverdue(i);
}

/**
 * Whether a task books time inside `r`: it is due in the range, or it was completed in it.
 * Overdue carry-over and undated tasks are deliberately left out — the weekly budget answers
 * "how full is this week", not "how much work exists".
 */
export function booksTimeIn(i: Item, r: DateRange): boolean {
  if (i.deadline !== null && inRange(i.deadline, r)) return true;
  const done = completedOn(i);
  return done !== null && inRange(done, r);
}

/** The tasks the weekly budget counts; area, label and search filters don't narrow it. */
export const budgetItems = (items: Item[], r: DateRange): Item[] => items.filter((i) => booksTimeIn(i, r));

export function matchesFilters(i: Item, f: Filters): boolean {
  const q = f.query.trim().toLowerCase();
  return (
    (f.area === "All" || i.area === f.area) &&
    (f.labels.length === 0 || f.labels.includes(`${i.impact}${i.focus}`)) &&
    (!q || `${i.title} ${i.category} ${i.notes}`.toLowerCase().includes(q))
  );
}

export function applyFilters(items: Item[], f: Filters, opts: { includeDone?: boolean } = {}): Item[] {
  const includeDone = opts.includeDone ?? f.includeDone;
  return items.filter((i) => (includeDone || !i.done) && inDateScope(i, f) && matchesFilters(i, f));
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

const compare: Record<SortKey, (a: Item, b: Item) => number> = {
  deadline: (a, b) => {
    if (a.deadline === b.deadline) return 0;
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    return a.deadline < b.deadline ? -1 : 1;
  },
  title: (a, b) => collator.compare(a.title, b.title),
  area: (a, b) => collator.compare(`${a.area} ${a.category}`, `${b.area} ${b.category}`),
  progress: (a, b) => a.progress - b.progress,
  allocated: (a, b) => a.allocatedMinutes - b.allocatedMinutes,
  spent: (a, b) => a.spentMinutes - b.spentMinutes,
  created: (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0),
};

/** Open tasks first, then the chosen key; undated tasks always sink to the bottom of a deadline sort. */
export function sortItems(items: Item[], sort: Sort): Item[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const c = compare[sort.key](a, b);
    if (sort.key === "deadline" && (a.deadline === null) !== (b.deadline === null)) return c;
    return c * sign || compare.deadline(a, b) || collator.compare(a.title, b.title);
  });
}
