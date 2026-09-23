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

export const progressPercent = (spent: number, allocated: number) =>
  allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
