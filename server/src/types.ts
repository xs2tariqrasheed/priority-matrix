import { z } from "zod";

/** P = Pain killer (immediate), V = Vitamin (low priority) */
export const Impact = z.enum(["P", "V"]);
/** S = Short focus, L = Long focus */
export const Focus = z.enum(["S", "L"]);

/** Minutes in 15-minute steps, capped at one week. */
const Minutes = z.number().int().min(0).max(7 * 24 * 60).multipleOf(15, "Time must be in 15-minute steps");

/** Field rules shared by create and update (no defaults here). */
const ItemFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  area: z.string().trim().min(1, "Area is required").max(60),
  category: z.string().trim().max(60),
  impact: Impact,
  focus: Focus,
  notes: z.string().max(2000),
  done: z.boolean(),
  /** Time budgeted for the task this week. */
  allocatedMinutes: Minutes,
  /** Time already worked; progress is spent / allocated. */
  spentMinutes: Minutes,
});

/** Create: optional fields get defaults. */
export const ItemInput = ItemFields.extend({
  category: ItemFields.shape.category.default(""),
  notes: ItemFields.shape.notes.default(""),
  done: ItemFields.shape.done.default(false),
  allocatedMinutes: Minutes.default(0),
  spentMinutes: Minutes.default(0),
}).refine((i) => i.spentMinutes <= i.allocatedMinutes, {
  message: "Progress can't exceed the allocated time",
  path: ["spentMinutes"],
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
  createdAt: string;
  updatedAt: string;
}

export const SettingsPatch = z.object({
  weeklyMinutes: Minutes,
}).partial();

export type SettingsPatch = z.infer<typeof SettingsPatch>;

export interface Settings {
  weeklyMinutes: number;
}
