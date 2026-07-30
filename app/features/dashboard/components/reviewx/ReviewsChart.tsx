import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link, useFetcher } from "react-router";

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

type ChartCoord = {
  x: number;
  y: number;
  point: VolumeSeriesPoint;
};

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

function nearestIndex(coords: ChartCoord[], svgX: number): number {
  if (coords.length === 0) return -1;
  let best = 0;
  let bestDist = Math.abs(coords[0].x - svgX);
  for (let i = 1; i < coords.length; i += 1) {
    const dist = Math.abs(coords[i].x - svgX);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

/** Spec § Section 3 — Reviews collected over time (interactive smooth area chart) */
export function ReviewsChart({ seriesByRange }: ReviewsChartProps) {
  const [range, setRange] = useState<ChartRange>("30d");
  const [series365, setSeries365] = useState(seriesByRange["365d"]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId().replace(/:/g, "");
  const yearFetcher = useFetcher<{ series: VolumeSeriesPoint[] }>();
  const yearLoad = yearFetcher.load;
  const yearState = yearFetcher.state;
  const yearData = yearFetcher.data;

  useEffect(() => {
    if (seriesByRange["365d"].length > 0) {
      setSeries365(seriesByRange["365d"]);
      return;
    }
    if (yearData?.series) {
      setSeries365(yearData.series);
      return;
    }
    setSeries365([]);
  }, [seriesByRange, yearData]);

  useEffect(() => {
    if (range !== "365d") return;
    if (series365.length > 0) return;
    if (yearState !== "idle") return;
    if (yearData) return;
    yearLoad("/app/dashboard-chart?days=365");
  }, [range, series365.length, yearState, yearData, yearLoad]);

  const loadingYear =
    range === "365d" &&
    series365.length === 0 &&
    (yearState === "loading" || yearState === "submitting");

  const raw =
    range === "365d" ? series365 : (seriesByRange[range] ?? []);
  const points = useMemo(
    () => downsample(raw, range === "365d" ? 24 : range === "90d" ? 30 : 60),
    [raw, range],
  );
  const total = points.reduce((sum, p) => sum + p.count, 0);

  const width = 640;
  const height = 240;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const max = niceMax(Math.max(...points.map((p) => p.count), 1));
  const baselineY = height - padBottom;

  const coords: ChartCoord[] = useMemo(
    () =>
      points.map((point, index) => {
        const x =
          padLeft +
          (points.length === 1
            ? (width - padLeft - padRight) / 2
            : (index / (points.length - 1)) * (width - padLeft - padRight));
        const y =
          padTop + (1 - point.count / max) * (height - padTop - padBottom);
        return { x, y, point };
      }),
    [points, max, padLeft, padRight, padTop, padBottom],
  );

  const linePath = catmullRomPath(coords.map(({ x, y }) => ({ x, y })));
  const areaPath = areaFromLinePath(
    linePath,
    coords.map(({ x, y }) => ({ x, y })),
    baselineY,
  );

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
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

  const active = activeIndex != null ? coords[activeIndex] : null;

  const pointerToSvgX = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / Math.max(rect.width, 1);
    return (clientX - rect.left) * scaleX;
  }, []);

  function onPlotPointerMove(event: ReactPointerEvent<SVGRectElement>) {
    if (coords.length === 0) return;
    const svgX = pointerToSvgX(event.clientX);
    setActiveIndex(nearestIndex(coords, svgX));
  }

  function onPlotPointerLeave() {
    setActiveIndex(null);
  }

  function selectRange(next: ChartRange) {
    setRange(next);
    setActiveIndex(null);
    setAnimKey((key) => key + 1);
  }

  const tooltipLeftPct = active
    ? Math.min(92, Math.max(8, (active.x / width) * 100))
    : 50;

  const liveLabel = active
    ? `${active.point.label}: ${active.point.count} review${active.point.count === 1 ? "" : "s"}`
    : "";

  return (
    <section className={styles.card} aria-labelledby="rx-chart-title">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="rx-chart-title" className={styles.sectionTitle}>
            Reviews collected
          </h2>
          <p className={styles.body} style={{ marginTop: 8, marginBottom: 0 }}>
            Trend over the selected period. Hover to inspect each day.
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
              onClick={() => selectRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loadingYear ? (
        <p className={styles.body} role="status">
          Loading year view…
        </p>
      ) : total === 0 ? (
        <EmptyState
          title="No review volume yet"
          description="Once customers submit reviews, you’ll see trends here across the selected range."
          actions={
            <>
              <Link
                className={`${styles.btn} ${styles.btnPrimary}`}
                to="/app/imports"
                prefetch="intent"
              >
                Import Reviews
              </Link>
              <Link
                className={styles.btn}
                to="/app/review-requests"
                prefetch="intent"
              >
                Send Requests
              </Link>
            </>
          }
        />
      ) : (
        <div className={styles.chartWrap}>
          <div className={styles.chartLive} aria-live="polite">
            {liveLabel}
          </div>
          {active ? (
            <div
              className={styles.chartTooltip}
              style={{ left: `${tooltipLeftPct}%` }}
              role="tooltip"
            >
              <strong className={styles.chartTooltipDay}>
                {active.point.label}
              </strong>
              <span className={styles.chartTooltipMeta}>
                reviews: {active.point.count}
              </span>
            </div>
          ) : null}
          <svg
            ref={svgRef}
            key={animKey}
            className={`${styles.chartSvg} ${styles.chartSvgAnimated}`}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Reviews collected over ${range}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#008060" stopOpacity="0.32" />
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
                    x={padLeft - 10}
                    y={tick.y + 4}
                    textAnchor="end"
                    className={styles.chartLabel}
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
            </g>
            <path
              className={styles.chartArea}
              d={areaPath}
              fill={`url(#${gradientId})`}
            />
            <path
              className={styles.chartLine}
              d={linePath}
              pathLength={1}
            />
            <g aria-hidden>
              {xLabels.map((label) => (
                <text
                  key={`${label.label}-${label.x}`}
                  x={label.x}
                  y={height - 10}
                  textAnchor="middle"
                  className={styles.chartLabel}
                >
                  {label.label}
                </text>
              ))}
            </g>
            {active ? (
              <g className={styles.chartActive} aria-hidden>
                <line
                  className={styles.chartCrosshair}
                  x1={active.x}
                  x2={active.x}
                  y1={padTop}
                  y2={baselineY}
                />
                <circle
                  className={styles.chartDotRing}
                  cx={active.x}
                  cy={active.y}
                  r="7"
                />
                <circle
                  className={styles.chartDot}
                  cx={active.x}
                  cy={active.y}
                  r="4"
                />
              </g>
            ) : null}
            <rect
              className={styles.chartHit}
              x={padLeft}
              y={padTop}
              width={width - padLeft - padRight}
              height={height - padTop - padBottom}
              fill="transparent"
              onPointerMove={onPlotPointerMove}
              onPointerLeave={onPlotPointerLeave}
            />
          </svg>
        </div>
      )}
    </section>
  );
}
