import type { ComponentPropsWithRef } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { Item } from "../types";
import { formatMinutes } from "../time";
import { ProgressRing } from "./ProgressRing";

type Props = { item: Item } & Omit<ComponentPropsWithRef<"button">, "children">;

/**
 * Compact progress ring + time readout. Extra props (including the click handler and ref
 * the surrounding TimeEditor popover attaches) are forwarded to the button.
 */
export function TimeChip({ item, className, ...rest }: Props) {
  const { allocatedMinutes: allocated, spentMinutes: spent } = item;
  const progress = item.done ? 100 : item.progress;
  if (!allocated && !spent && !progress) {
    return (
      <button
        type="button"
        {...rest}
        className={`time-chip is-empty${className ? ` ${className}` : ""}`}
        aria-label={`Set time for "${item.title}"`}
      >
        <PlusOutlined /> time
      </button>
    );
  }
  return (
    <button
      type="button"
      {...rest}
      className={`time-chip${className ? ` ${className}` : ""}`}
      aria-label={`${progress}% complete, ${formatMinutes(spent)} spent${allocated ? ` of ${formatMinutes(allocated)} allocated` : ""}. Edit time and progress`}
    >
      <ProgressRing percent={progress} />
      <span className="time-chip-pct">{progress}%</span>
      <span className="time-chip-sep" />
      <span className="time-chip-time">
        {formatMinutes(spent)}
        {allocated ? <span className="time-chip-of"> / {formatMinutes(allocated)}</span> : null}
      </span>
    </button>
  );
}
