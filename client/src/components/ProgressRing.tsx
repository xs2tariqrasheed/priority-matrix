interface Props {
  percent: number;
  size?: number;
  stroke?: number;
  className?: string;
}

/** Small SVG completion ring; turns green at 100%. */
export function ProgressRing({ percent, size = 16, stroke = 2.5, className }: Props) {
  const pct = Math.max(0, Math.min(100, percent));
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
