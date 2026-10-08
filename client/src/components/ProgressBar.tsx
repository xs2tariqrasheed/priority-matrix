import { Progress, type ProgressProps } from "antd";

interface Props {
  percent: number;
  /** Where progress should be by now; drawn as a tick on the track. */
  expected?: number | null;
  done?: boolean;
  size?: ProgressProps["size"];
}

/** Linear progress bar with an optional "expected by now" marker. */
export function ProgressBar({ percent, expected, done, size }: Props) {
  return (
    <span className={`progress-bar${expected != null && percent < expected ? " is-behind" : ""}`}>
      <Progress percent={percent} size={size} showInfo={false} strokeColor={done ? "var(--ok)" : "var(--accent)"} />
      {expected != null && <span className="expected-marker" style={{ left: `${expected}%` }} aria-hidden="true" />}
    </span>
  );
}
