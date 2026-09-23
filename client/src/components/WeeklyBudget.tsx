import { useState } from "react";
import { Button, InputNumber, Popover, Progress } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { Item } from "../types";
import { STEP, formatMinutes } from "../time";

interface Props {
  weeklyMinutes: number;
  items: Item[];
  onChangeWeekly: (minutes: number) => Promise<void>;
}

/** Weekly available time and how much of it is allocated to tasks and already worked. */
export function WeeklyBudget({ weeklyMinutes, items, onChangeWeekly }: Props) {
  const allocated = items.reduce((sum, i) => sum + i.allocatedMinutes, 0);
  const spent = items.reduce((sum, i) => sum + i.spentMinutes, 0);
  const free = weeklyMinutes - allocated;
  const pct = (m: number) => (weeklyMinutes > 0 ? Math.min(100, (m / weeklyMinutes) * 100) : 0);

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
    <section className="budget" aria-label="Weekly time">
      <div className="budget-head">
        <div className="budget-available">
          <span>Available this week</span>
          <strong>{formatMinutes(weeklyMinutes)}</strong>
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
        aria-label={`${formatMinutes(allocated)} of ${formatMinutes(weeklyMinutes)} allocated, ${formatMinutes(spent)} done`}
      />
    </section>
  );
}
