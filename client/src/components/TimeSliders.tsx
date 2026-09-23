import { Slider } from "antd";
import { STEP, formatMinutes, progressPercent } from "../time";

interface Props {
  allocated: number;
  spent: number;
  /** Upper end of the allocation slider, normally the weekly available time. */
  max: number;
  onChange: (allocated: number, spent: number) => void;
  /** Fires when the user releases a slider; use it to persist. */
  onChangeComplete?: (allocated: number, spent: number) => void;
}

/** Allocated time and progress (time spent), both in 15-minute steps. */
export function TimeSliders({ allocated, spent, max, onChange, onChangeComplete }: Props) {
  const allocMax = Math.max(max, allocated, STEP);
  const remaining = allocated - spent;
  // Lowering the allocation below the time already spent pulls progress down with it.
  const setAllocated = (a: number) => [a, Math.min(spent, a)] as const;

  return (
    <div className="time-sliders">
      <div className="time-slider">
        <div className="time-slider-label">
          <span>Allocated this week</span>
          <strong>{formatMinutes(allocated)}</strong>
        </div>
        <Slider
          min={0}
          max={allocMax}
          step={STEP}
          value={allocated}
          tooltip={{ formatter: (v) => formatMinutes(v ?? 0) }}
          onChange={(v) => onChange(...setAllocated(v))}
          onChangeComplete={(v) => onChangeComplete?.(...setAllocated(v))}
          aria-label="Allocated time"
        />
      </div>

      <div className="time-slider">
        <div className="time-slider-label">
          <span>Progress</span>
          <strong>
            {formatMinutes(spent)} done · {progressPercent(spent, allocated)}%
          </strong>
        </div>
        <Slider
          min={0}
          max={Math.max(allocated, STEP)}
          step={STEP}
          value={spent}
          disabled={allocated === 0}
          tooltip={{ formatter: (v) => formatMinutes(v ?? 0) }}
          onChange={(v) => onChange(allocated, v)}
          onChangeComplete={(v) => onChangeComplete?.(allocated, v)}
          aria-label="Time spent"
        />
      </div>

      <p className="time-remaining">
        {allocated === 0 ? (
          "Allocate time to start tracking progress."
        ) : (
          <>
            <strong>{formatMinutes(remaining)}</strong> remaining
          </>
        )}
      </p>
    </div>
  );
}
