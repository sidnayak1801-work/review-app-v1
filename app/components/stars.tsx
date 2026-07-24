import { STAR_EMPTY, STAR_FILL } from "../lib/ui-format";

export function Stars({
  rating,
  size = "1rem",
}: {
  rating: number;
  size?: string;
}) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span aria-label={`${filled} out of 5 stars`} style={{ letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, index) => {
        const on = index < filled;
        return (
          <span
            key={index}
            style={{ color: on ? STAR_FILL : STAR_EMPTY, fontSize: size }}
            aria-hidden="true"
          >
            {on ? "★" : "☆"}
          </span>
        );
      })}
    </span>
  );
}
