import type { ApiItem, Item } from "./types";
import { sortItems, type Sort } from "./filters";

const progressOf = (i: ApiItem) => (i.done ? 100 : i.progress);

/**
 * Adds `childCount` and derives each epic's progress from its tasks: the mean of their
 * progress, with done tasks counting as 100. The server stores the same value; deriving it
 * here keeps an epic in step while a task's change is still in flight.
 */
export function withRollups(items: ApiItem[]): Item[] {
  const tasks = new Map<number, ApiItem[]>();
  for (const i of items) {
    if (i.parentId !== null) tasks.set(i.parentId, [...(tasks.get(i.parentId) ?? []), i]);
  }
  return items.map((i) => {
    const list = tasks.get(i.id);
    if (!list) return { ...i, childCount: 0 };
    const progress = Math.round(list.reduce((sum, t) => sum + progressOf(t), 0) / list.length);
    return { ...i, childCount: list.length, progress };
  });
}

export const isEpic = (i: Item) => i.childCount > 0;

export type TreeRow = Item & { children?: TreeRow[] };

/**
 * Nests the visible tasks under their epics. An epic that is filtered out still shows when
 * one of its tasks is visible, so the task keeps its context. Epics and the tasks inside
 * each epic follow the chosen sort.
 */
export function buildTree(visible: Item[], all: Item[], sort: Sort): TreeRow[] {
  const byId = new Map(all.map((i) => [i.id, i]));
  const tasks = new Map<number, Item[]>();
  const top = new Map<number, Item>();
  for (const i of visible) {
    const parent = i.parentId === null ? undefined : byId.get(i.parentId);
    if (!parent) {
      top.set(i.id, i);
      continue;
    }
    tasks.set(parent.id, [...(tasks.get(parent.id) ?? []), i]);
    top.set(parent.id, parent);
  }
  return sortItems([...top.values()], sort).map((i) => {
    const list = tasks.get(i.id);
    return list ? { ...i, children: sortItems(list, sort) } : i;
  });
}

/** Rows in display order, skipping the tasks of collapsed epics. */
export function flattenTree(rows: TreeRow[], collapsed: ReadonlySet<number> = new Set()): Item[] {
  return rows.flatMap((r) => (r.children && !collapsed.has(r.id) ? [r, ...r.children] : [r]));
}
