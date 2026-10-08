import { useSyncExternalStore } from "react";
import type { Item } from "./types";
import { dayjs } from "./dates";

/**
 * Where progress should be by now if the task moves at a steady pace: 0% when it was
 * added, rising linearly to 100% at the end of its deadline day. Null for tasks with
 * no deadline and for finished tasks.
 */
export function expectedProgress(item: Item, now = Date.now()): number | null {
  if (!item.deadline || item.done) return null;
  const start = dayjs(item.createdAt).valueOf();
  const end = dayjs(item.deadline).endOf("day").valueOf();
  if (now >= end || end <= start) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

export type PaceStatus = "behind" | "on-track" | "ahead";

export interface Pace {
  status: PaceStatus;
  /** Actual minus expected progress, in percentage points. */
  diff: number;
}

/** Gap (in points) either side of the expected value that still counts as on track. */
const TOLERANCE = 5;

export function paceOf(progress: number, expected: number): Pace {
  const diff = progress - expected;
  return { status: diff < -TOLERANCE ? "behind" : diff > TOLERANCE ? "ahead" : "on-track", diff };
}

/** "15% behind", "On track", "10% ahead". */
export function paceLabel({ status, diff }: Pace): string {
  if (status === "behind") return `${-diff}% behind`;
  if (status === "ahead") return `${diff}% ahead`;
  return "On track";
}

/* One shared minute ticker so every on-screen task re-renders together as time passes. */
const TICK_MS = 60_000;
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current time, refreshed once a minute. */
export const useNow = () => useSyncExternalStore(subscribe, () => now);

/** Live expected progress and pace for a task (both null when there is nothing to expect). */
export function useExpectedProgress(item: Item): { expected: number | null; pace: Pace | null } {
  const expected = expectedProgress(item, useNow());
  return { expected, pace: expected === null ? null : paceOf(item.progress, expected) };
}
