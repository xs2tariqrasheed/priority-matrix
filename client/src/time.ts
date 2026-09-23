/** Time is tracked in whole minutes, adjusted in 15-minute steps. */
export const STEP = 15;

/** 90 → "1h 30m", 45 → "45m", 0 → "0h". */
export function formatMinutes(total: number): string {
  const sign = total < 0 ? "-" : "";
  const m = Math.abs(total);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h && rest) return `${sign}${h}h ${rest}m`;
  if (rest) return `${sign}${rest}m`;
  return `${sign}${h}h`;
}

/** Rounds to the nearest 15-minute step and clamps at zero. */
export const snapMinutes = (minutes: number) => Math.max(0, Math.round(minutes / STEP) * STEP);

export const hoursToMinutes = (hours: number) => snapMinutes(hours * 60);
export const minutesToHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
