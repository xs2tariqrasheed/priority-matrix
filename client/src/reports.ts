import type { Item } from "./types";
import { applyFilters, completedOn, isOverdue, type Filters } from "./filters";
import { inRange, today } from "./dates";

export interface AreaStat {
  area: string;
  total: number;
  done: number;
  overdue: number;
  progress: number;
  allocated: number;
  spent: number;
}

export interface Report {
  scoped: Item[];
  total: number;
  open: Item[];
  completed: Item[];
  completedInRange: Item[];
  overdue: Item[];
  dueInRange: Item[];
  /** Mean completion across the scoped tasks; done tasks count as 100. */
  progress: number;
  completionRate: number;
  allocated: number;
  spent: number;
  byArea: AreaStat[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const progressOf = (i: Item) => (i.done ? 100 : i.progress);
const byDeadline = (a: Item, b: Item) => ((a.deadline ?? "") < (b.deadline ?? "") ? -1 : 1);
const byCompletedDesc = (a: Item, b: Item) => ((a.completedAt ?? "") > (b.completedAt ?? "") ? -1 : 1);

export function buildReport(items: Item[], f: Filters): Report {
  const scoped = applyFilters(items, f, { includeDone: true });
  const open = scoped.filter((i) => !i.done);
  const completed = scoped.filter((i) => i.done).sort(byCompletedDesc);
  const completedInRange = completed.filter((i) => {
    const d = completedOn(i);
    return d !== null && inRange(d, f.range);
  });
  const overdue = open.filter(isOverdue).sort(byDeadline);
  const t = today();
  const dueInRange = open.filter((i) => i.deadline !== null && i.deadline >= t && inRange(i.deadline, f.range));

  const groups = new Map<string, Item[]>();
  for (const i of scoped) groups.set(i.area, [...(groups.get(i.area) ?? []), i]);
  const byArea: AreaStat[] = [...groups]
    .map(([area, list]) => ({
      area,
      total: list.length,
      done: list.filter((i) => i.done).length,
      overdue: list.filter(isOverdue).length,
      progress: Math.round(mean(list.map(progressOf))),
      allocated: sum(list.map((i) => i.allocatedMinutes)),
      spent: sum(list.map((i) => i.spentMinutes)),
    }))
    .sort((a, b) => b.total - a.total || a.area.localeCompare(b.area));

  return {
    scoped,
    total: scoped.length,
    open,
    completed,
    completedInRange,
    overdue,
    dueInRange,
    progress: Math.round(mean(scoped.map(progressOf))),
    completionRate: scoped.length ? Math.round((completed.length / scoped.length) * 100) : 0,
    allocated: sum(scoped.map((i) => i.allocatedMinutes)),
    spent: sum(scoped.map((i) => i.spentMinutes)),
    byArea,
  };
}
