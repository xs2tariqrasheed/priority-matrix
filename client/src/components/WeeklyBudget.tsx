import { useState } from "react";
import { Button, InputNumber, Popover, Progress, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { Item } from "../types";
import { formatRange, rangeDays, type DateRange } from "../dates";
import { STEP, formatMinutes, snapMinutes } from "../time";

interface Props {
  weeklyMinutes: number;
  /** Only the tasks that book time inside `range` (see `budgetItems`). */
  items: Item[];
  range: DateRange;
  onChangeWeekly: (minutes: number) => Promise<void>;
}

/** Available time for the selected range and how much of it is allocated to tasks and already worked. */
export function WeeklyBudget({ weeklyMinutes, items, range, onChangeWeekly }: Props) {
  const days = rangeDays(range);
  // A range that isn't a whole week gets a pro-rated share of the weekly setting.
  const available = days === 7 ? weeklyMinutes : snapMinutes((weeklyMinutes / 7) * days);
  const allocated = items.reduce((sum, i) => sum + i.allocatedMinutes, 0);
  const spent = items.reduce((sum, i) => sum + i.spentMinutes, 0);
  const free = available - allocated;
  const pct = (m: number) => (available > 0 ? Math.min(100, (m / available) * 100) : 0);

  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState<number | null>(weeklyMinutes / 60);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (hours === null) return;
    setSaving(true);
    try {
      // Snap to the 15-minute grid the server expects.
      await onChangeWeekly(Math.round((hours * 60) / STEP) * STEP);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="budget" aria-label="Time budget">
      <div className="budget-head">
        <div className="budget-available">
          <span>{days === 7 ? "Available this week" : `Available · ${days} ${days === 1 ? "day" : "days"}`}</span>
          <Tooltip title={days === 7 ? undefined : `Pro-rated from ${formatMinutes(weeklyMinutes)} a week`}>
            <strong>{formatMinutes(available)}</strong>
          </Tooltip>
          <Popover
            trigger="click"
            open={editing}
            onOpenChange={(o) => {
              setEditing(o);
              if (o) setHours(weeklyMinutes / 60);
            }}
            title="Weekly available time"
            content={
              <div className="budget-edit">
                <InputNumber
                  autoFocus
                  min={0}
                  max={168}
                  step={0.25}
                  value={hours}
                  onChange={setHours}
                  onPressEnter={save}
                  suffix="hours"
                  style={{ width: 140 }}
                />
                <Button type="primary" loading={saving} onClick={save}>
                  Save
                </Button>
              </div>
            }
          >
            <Button size="small" type="text" icon={<EditOutlined />} aria-label="Edit weekly available time" />
          </Popover>
        </div>
        <dl className="budget-stats">
          <div>
            <dt>Allocated</dt>
            <dd>{formatMinutes(allocated)}</dd>
          </div>
          <div>
            <dt>Done</dt>
            <dd>{formatMinutes(spent)}</dd>
          </div>
          <div>
            <dt>Remaining work</dt>
            <dd>{formatMinutes(allocated - spent)}</dd>
          </div>
          <div className={free < 0 ? "is-over" : undefined}>
            <dt>{free < 0 ? "Overbooked" : "Unallocated"}</dt>
            <dd>{formatMinutes(Math.abs(free))}</dd>
          </div>
        </dl>
      </div>
      <Progress
        percent={pct(allocated)}
        success={{ percent: pct(spent) }}
        status={free < 0 ? "exception" : "normal"}
        showInfo={false}
        aria-label={`${formatMinutes(allocated)} of ${formatMinutes(available)} allocated, ${formatMinutes(spent)} done`}
      />
      <p className="budget-foot">
        Counting {items.length} {items.length === 1 ? "task" : "tasks"} due {formatRange(range)}, across every area.
      </p>
    </section>
  );
}
