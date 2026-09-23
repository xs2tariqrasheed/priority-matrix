import { Progress } from "antd";
import type { Item } from "../types";
import { formatMinutes, progressPercent } from "../time";

/** Compact "remaining time" readout with a progress ring; clickable. */
export function TimeChip({ item }: { item: Item }) {
  const { allocatedMinutes: allocated, spentMinutes: spent } = item;
  if (allocated === 0) {
    return (
      <button type="button" className="time-chip is-empty" aria-label={`Allocate time to "${item.title}"`}>
        + time
      </button>
    );
  }
  const pct = progressPercent(spent, allocated);
  return (
    <button
      type="button"
      className="time-chip"
      aria-label={`${formatMinutes(allocated - spent)} left of ${formatMinutes(allocated)}, ${pct}% done. Edit time`}
      title={`${formatMinutes(spent)} of ${formatMinutes(allocated)} done`}
    >
      <Progress type="circle" size={14} percent={pct} showInfo={false} strokeWidth={14} />
      {formatMinutes(allocated - spent)} left
    </button>
  );
}
