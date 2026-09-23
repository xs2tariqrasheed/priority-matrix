import type { Focus, Impact, QuadrantKey } from "./types";

export const IMPACT: Record<Impact, { name: string; hint: string; color: string; tint: string }> = {
  P: { name: "Pain killer", hint: "Immediate", color: "#B42318", tint: "#FEF3F2" },
  V: { name: "Vitamin", hint: "Low priority", color: "#2F7D6D", tint: "#F0F7F5" },
};

export const FOCUS: Record<Focus, { name: string; slot: string }> = {
  S: { name: "Short focus", slot: "Fits Mon–Wed (~7 h days)" },
  L: { name: "Long focus", slot: "Fits Thu–Sat (~12 h days)" },
};

export const QUADRANTS: { key: QuadrantKey; impact: Impact; focus: Focus; advice: string }[] = [
  { key: "PS", impact: "P", focus: "S", advice: "Knock these out first" },
  { key: "VS", impact: "V", focus: "S", advice: "Fill gaps between bigger work" },
  { key: "PL", impact: "P", focus: "L", advice: "Block deep time for these" },
  { key: "VL", impact: "V", focus: "L", advice: "Schedule when there's room" },
];

export const DEFAULT_AREAS = ["Company", "Academia", "Job"];
