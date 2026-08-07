type ProgressRingProps = {
  progress: number;
  label?: string;
};

export function ProgressRing({
  progress,
  label = "Getting your store ready…",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        role="img"
        aria-label={`Setup progress ${clamped} percent`}
      >
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--p-color-border)"
          strokeWidth="8"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--p-color-bg-fill-success)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
        <text
          x="44"
          y="48"
          textAnchor="middle"
          fontSize="16"
          fontWeight="650"
          fill="var(--p-color-text)"
        >
          {clamped}%
        </text>
      </svg>
      <div>
        <div style={{ fontWeight: 650 }}>{label}</div>
        <div style={{ color: "var(--p-color-text-secondary)", fontSize: 13 }}>
          Progress updates as we detect completed tasks
        </div>
      </div>
    </div>
  );
}
