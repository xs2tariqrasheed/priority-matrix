import { InputNumber, Slider } from "antd";
import { STEP, formatMinutes, hoursToMinutes, minutesToHours } from "../time";

/** One-tap minute presets offered beside the allocated and spent sliders. */
const MINUTE_PRESETS = [30, 60, 90, 120, 240];
/** One-tap percentages offered beside the progress slider. */
const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

export interface TimeValues {
  allocated: number;
  spent: number;
  progress: number;
}

interface Props extends TimeValues {
  /** Upper end of the time sliders, normally the weekly available time. */
  max: number;
  onChange: (next: TimeValues) => void;
  /** Fires when a slider is released or a number input is committed; use it to persist. */
  onCommit?: (next: TimeValues) => void;
}

/** Allocated time, time spent and progress: each a slider with a precise number input beside it. */
export function TimeFields({ allocated, spent, progress, max, onChange, onCommit }: Props) {
  const values: TimeValues = { allocated, spent, progress };
  const sliderMax = Math.max(max, allocated, spent, 4 * 60);
  const set = (patch: Partial<TimeValues>, commit = false) => {
    const next = { ...values, ...patch };
    onChange(next);
    if (commit) onCommit?.(next);
  };
  const remaining = allocated - spent;

  return (
    <div className="time-fields">
      <TimeRow
        label="Allocated"
        hint="Budgeted for this task"
        value={allocated}
        max={sliderMax}
        onChange={(v) => set({ allocated: v })}
        onCommit={(v) => set({ allocated: v }, true)}
      />
      <TimeRow
        label="Time spent"
        hint="Actually worked so far"
        value={spent}
        max={sliderMax}
        onChange={(v) => set({ spent: v })}
        onCommit={(v) => set({ spent: v }, true)}
      />
      <div className="time-row">
        <div className="time-row-head">
          <span className="time-row-label">
            Progress <small>How complete it is</small>
          </span>
        </div>
        <div className="time-row-controls">
          <Slider
            min={0}
            max={100}
            step={5}
            value={progress}
            tooltip={{ formatter: (v) => `${v ?? 0}%` }}
            onChange={(v) => set({ progress: v })}
            onChangeComplete={(v) => set({ progress: v }, true)}
            aria-label="Progress"
          />
          <InputNumber
            min={0}
            max={100}
            step={5}
            value={progress}
            suffix="%"
            className="time-number"
            onChange={(v) => set({ progress: Math.max(0, Math.min(100, Math.round(v ?? 0))) })}
            onBlur={() => onCommit?.(values)}
            onPressEnter={() => onCommit?.(values)}
            aria-label="Progress percent"
          />
        </div>
        <QuickPicks
          label="Progress"
          picks={PROGRESS_PRESETS.map((p) => ({ value: p, label: `${p}%` }))}
          value={progress}
          onPick={(v) => set({ progress: v }, true)}
        />
      </div>
      <p className="time-summary">
        {allocated === 0 && spent === 0 ? (
          "Allocate time to plan this task, then log time as you work."
        ) : remaining >= 0 ? (
          <>
            <strong>{formatMinutes(remaining)}</strong> of {formatMinutes(allocated)} left
          </>
        ) : (
          <>
            <strong className="text-warn">{formatMinutes(-remaining)}</strong> over the {formatMinutes(allocated)} allocated
          </>
        )}
      </p>
    </div>
  );
}

interface RowProps {
  label: string;
  hint: string;
  value: number;
  max: number;
  onChange: (minutes: number) => void;
  onCommit: (minutes: number) => void;
}

function TimeRow({ label, hint, value, max, onChange, onCommit }: RowProps) {
  return (
    <div className="time-row">
      <div className="time-row-head">
        <span className="time-row-label">
          {label} <small>{hint}</small>
        </span>
      </div>
      <div className="time-row-controls">
        <Slider
          min={0}
          max={max}
          step={STEP}
          value={value}
          tooltip={{ formatter: (v) => formatMinutes(v ?? 0) }}
          onChange={onChange}
          onChangeComplete={onCommit}
          aria-label={label}
        />
        <InputNumber
          min={0}
          max={7 * 24}
          step={0.25}
          precision={2}
          value={minutesToHours(value)}
          suffix="h"
          className="time-number"
          onChange={(v) => onChange(hoursToMinutes(v ?? 0))}
          onBlur={() => onCommit(value)}
          onPressEnter={() => onCommit(value)}
          aria-label={`${label} in hours`}
        />
      </div>
      <QuickPicks
        label={label}
        picks={MINUTE_PRESETS.map((m) => ({ value: m, label: formatMinutes(m) }))}
        value={value}
        onPick={onCommit}
      />
    </div>
  );
}

interface QuickPicksProps {
  /** Name of the field these presets set, used for the accessible button labels. */
  label: string;
  picks: { value: number; label: string }[];
  value: number;
  onPick: (value: number) => void;
}

/** Row of one-tap buttons that set the field to a common value. */
function QuickPicks({ label, picks, value, onPick }: QuickPicksProps) {
  return (
    <div className="quick-picks">
      {picks.map((pick) => (
        <button
          key={pick.value}
          type="button"
          className={`quick-pick${value === pick.value ? " is-active" : ""}`}
          aria-pressed={value === pick.value}
          aria-label={`Set ${label.toLowerCase()} to ${pick.label}`}
          onClick={() => onPick(pick.value)}
        >
          {pick.label}
        </button>
      ))}
    </div>
  );
}
