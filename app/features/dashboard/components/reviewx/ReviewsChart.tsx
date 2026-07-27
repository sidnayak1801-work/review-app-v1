import { useMemo, useState } from "react";

import type { VolumeSeriesPoint } from "../../../../lib/daily-review-volume";
import styles from "./dashboard.module.css";
import { areaFromLinePath, catmullRomPath } from "./smooth-path";
import type { ChartRange } from "./types";
import { EmptyState } from "./EmptyState";

const RANGES: Array<{ id: ChartRange; label: string }> = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "365d", label: "1 Year" },
];

interface ReviewsChartProps {
  seriesByRange: Record<ChartRange, VolumeSeriesPoint[]>;
}

function downsample(
  points: VolumeSeriesPoint[],
  maxPoints: number,
): VolumeSeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled: VolumeSeriesPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    const slice = points.slice(i, i + step);
    sampled.push({
      dateKey: slice[0].dateKey,
      label: slice[0].label,
      count: slice.reduce((sum, p) => sum + p.count, 0),
    });
  }
  return sampled;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Spec § Section 3 — Reviews collected over time (smooth area chart) */
export function ReviewsChart({ seriesByRange }: ReviewsChartProps) {
  const [range, setRange] = useState<ChartRange>("30d");
  const raw = seriesByRange[range] ?? [];
  const points = useMemo(
    () => downsample(raw, range === "365d" ? 24 : range === "90d" ? 30 : 60),
    [raw, range],
  );
  const total = points.reduce((sum, p) => sum + p.count, 0);

  const width = 640;
  const height = 240;
  const padLeft = 36;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const max = niceMax(Math.max(...points.map((p) => p.count), 1));
  const baselineY = height - padBottom;

  const coords = points.map((point, index) => {
    const x =
      padLeft +
      (points.length === 1
        ? (width - padLeft - padRight) / 2
        : (index / (points.length - 1)) * (width - padLeft - padRight));
    const y =
      padTop + (1 - point.count / max) * (height - padTop - padBottom);
    return { x, y, point };
  });

  const linePath = catmullRomPath(coords.map(({ x, y }) => ({ x, y })));
  const areaPath = areaFromLinePath(
    linePath,
    coords.map(({ x, y }) => ({ x, y })),
    baselineY,
  );

  const yTicks = [0, 0.5, 1].map((ratio) => ({
    ratio,
    value: Math.round(max * ratio),
    y: padTop + (1 - ratio) * (height - padTop - padBottom),
  }));

  const xLabels =
    coords.length === 0
      ? []
      : [
          { x: coords[0].x, label: coords[0].point.label },
          ...(coords.length > 2
            ? [
                {
                  x: coords[Math.floor(coords.length / 2)].x,
                  label: coords[Math.floor(coords.length / 2)].point.label,
                },
              ]
            : []),
          ...(coords.length > 1
            ? [
                {
                  x: coords[coords.length - 1].x,
                  label: coords[coords.length - 1].point.label,
                },
              ]
            : []),
        ];

  return (
    <section className={styles.card} aria-labelledby="rx-chart-title">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="rx-chart-title" className={styles.sectionTitle}>
            Reviews collected
          </h2>
          <p className={styles.body} style={{ marginTop: 8, marginBottom: 0 }}>
            Trend over the selected period.
          </p>
        </div>
        <div className={styles.chips} role="tablist" aria-label="Chart range">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={`${styles.chip} ${range === item.id ? styles.chipActive : ""}`}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          title="No review volume yet"
          description="Once customers submit reviews, you’ll see trends here across the selected range."
          actions={
            <>
              <a
                className={`${styles.btn} ${styles.btnPrimary}`}
                href="/app/imports"
              >
                Import Reviews
              </a>
              <a className={styles.btn} href="/app/review-requests">
                Send Requests
              </a>
            </>
          }
        />
      ) : (
        <svg
          className={styles.chartSvg}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Reviews collected over ${range}`}
        >
          <defs>
            <linearGradient id="rxFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#008060" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#008060" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <g className={styles.chartGrid} aria-hidden>
            {yTicks.map((tick) => (
              <g key={tick.ratio}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={tick.y}
                  y2={tick.y}
                />
                <text
                  x={padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className={styles.chartLabel}
                >
                  {tick.value}
                </text>
              </g>
            ))}
          </g>
          <path className={styles.chartArea} d={areaPath} />
          <path className={styles.chartLine} d={linePath} />
          <g aria-hidden>
            {xLabels.map((label) => (
              <text
                key={`${label.label}-${label.x}`}
                x={label.x}
                y={height - 8}
                textAnchor="middle"
                className={styles.chartLabel}
              >
                {label.label}
              </text>
            ))}
          </g>
        </svg>
      )}
    </section>
  );
}
