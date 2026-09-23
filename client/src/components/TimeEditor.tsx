import { useEffect, useState, type ReactNode } from "react";
import { Popover } from "antd";
import type { Item, TimePatch } from "../types";
import { TimeFields, type TimeValues } from "./TimeFields";

interface Props {
  item: Item;
  weeklyMinutes: number;
  onSave: (item: Item, patch: TimePatch) => void;
  children: ReactNode;
}

const current = (item: Item): TimeValues => ({
  allocated: item.allocatedMinutes,
  spent: item.spentMinutes,
  progress: item.progress,
});

/** Popover with the time fields; saves when a slider is released, a number is committed, or the popover closes. */
export function TimeEditor({ item, weeklyMinutes, onSave, children }: Props) {
  const [draft, setDraft] = useState<TimeValues>(() => current(item));

  useEffect(() => {
    setDraft(current(item));
  }, [item.allocatedMinutes, item.spentMinutes, item.progress]);

  const commit = (v: TimeValues) => {
    if (v.allocated === item.allocatedMinutes && v.spent === item.spentMinutes && v.progress === item.progress) return;
    onSave(item, { allocatedMinutes: v.allocated, spentMinutes: v.spent, progress: v.progress });
  };

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      destroyOnHidden
      onOpenChange={(open) => {
        if (!open) commit(draft);
      }}
      title={
        <div className="time-editor-title">
          <span>Time &amp; progress</span>
          <small>{item.title}</small>
        </div>
      }
      content={
        <div className="time-editor">
          <TimeFields {...draft} max={weeklyMinutes} onChange={setDraft} onCommit={commit} />
        </div>
      }
    >
      {children}
    </Popover>
  );
}
