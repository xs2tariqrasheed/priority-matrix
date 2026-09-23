import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/en-gb";

dayjs.extend(isoWeek);
dayjs.locale("en-gb"); // weeks start on Monday

export const ISO = "YYYY-MM-DD";

/** Inclusive calendar range, both ends as YYYY-MM-DD. */
export interface DateRange {
  start: string;
  end: string;
}

export const today = () => dayjs().format(ISO);

/** Monday–Sunday week containing today, shifted by `offset` weeks. */
export function weekRange(offset = 0): DateRange {
  const start = dayjs().startOf("isoWeek").add(offset, "week");
  return { start: start.format(ISO), end: start.add(6, "day").format(ISO) };
}

export const isSameRange = (a: DateRange, b: DateRange) => a.start === b.start && a.end === b.end;

export type RangePreset = "this" | "next" | "last" | "custom";

export function presetOf(r: DateRange): RangePreset {
  if (isSameRange(r, weekRange(0))) return "this";
  if (isSameRange(r, weekRange(1))) return "next";
  if (isSameRange(r, weekRange(-1))) return "last";
  return "custom";
}

export const rangeDays = (r: DateRange) => dayjs(r.end).diff(dayjs(r.start), "day") + 1;

/** Moves the range forward or back by its own length. */
export function shiftRange(r: DateRange, dir: 1 | -1): DateRange {
  const n = rangeDays(r) * dir;
  return { start: dayjs(r.start).add(n, "day").format(ISO), end: dayjs(r.end).add(n, "day").format(ISO) };
}

/** ISO date strings compare correctly as plain strings. */
export const inRange = (date: string, r: DateRange) => date >= r.start && date <= r.end;

export const toLocalDate = (iso: string) => dayjs(iso).format(ISO);

/** Whole days from today to `date` (negative when past). */
export const daysUntil = (date: string) => dayjs(date).startOf("day").diff(dayjs().startOf("day"), "day");

export const formatDate = (date: string, fmt = "ddd D MMM") => dayjs(date).format(fmt);
export const formatDateTime = (iso: string) => dayjs(iso).format("ddd D MMM, HH:mm");

export function formatRange(r: DateRange): string {
  const s = dayjs(r.start);
  const e = dayjs(r.end);
  if (s.isSame(e, "day")) return s.format("D MMM YYYY");
  if (s.isSame(e, "month")) return `${s.format("D")} – ${e.format("D MMM")}`;
  if (s.isSame(e, "year")) return `${s.format("D MMM")} – ${e.format("D MMM")}`;
  return `${s.format("D MMM YYYY")} – ${e.format("D MMM YYYY")}`;
}

export function rangeTitle(r: DateRange): string {
  switch (presetOf(r)) {
    case "this":
      return "This week";
    case "next":
      return "Next week";
    case "last":
      return "Last week";
    default:
      return rangeDays(r) === 7 ? "Week" : rangeDays(r) === 1 ? "Day" : "Custom range";
  }
}

export type Urgency = "overdue" | "today" | "soon" | "later";

export function urgencyOf(deadline: string, done: boolean): Urgency {
  if (done) return "later";
  const d = daysUntil(deadline);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 3) return "soon";
  return "later";
}

export function relativeDeadline(deadline: string): string {
  const d = daysUntil(deadline);
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d === -1) return "1 day overdue";
  if (d < 0) return `${-d} days overdue`;
  if (d <= 13) return `Due in ${d} days`;
  return `Due ${dayjs(deadline).format("D MMM YYYY")}`;
}

/** Short label for chips: "Today", "Tomorrow", "Fri 26 Sep". */
export function shortDeadline(deadline: string): string {
  const d = daysUntil(deadline);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return formatDate(deadline, dayjs(deadline).isSame(dayjs(), "year") ? "ddd D MMM" : "D MMM YYYY");
}

export { dayjs };
export type { Dayjs };
