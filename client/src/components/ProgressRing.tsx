interface Props {
  percent: number;
  /** Where progress should be by now; drawn as a faint arc behind the value. */
  expected?: number | null;
  size?: number;
  stroke?: number;
  className?: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Small SVG completion ring; turns green at 100%. A warning arc shows any shortfall against `expected`. */
export function ProgressRing({ percent, expected, size = 16, stroke = 2.5, className }: Props) {
  const pct = clamp(percent);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const half = size / 2;
  return (
    <svg
      className={`ring${pct >= 100 ? " is-complete" : ""}${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle className="ring-track" cx={half} cy={half} r={r} strokeWidth={stroke} fill="none" />
      {expected != null && expected > pct && (
        <circle
          className="ring-expected"
          cx={half}
          cy={half}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamp(expected) / 100)}
          transform={`rotate(-90 ${half} ${half})`}
        />
      )}
      <circle
        className="ring-value"
        cx={half}
        cy={half}
        r={r}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform={`rotate(-90 ${half} ${half})`}
      />
    </svg>
  );
}
