import styles from "./dashboard.module.css";
import type { AnalyticsSnapshotData } from "./types";

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const width = 160;
  const height = 40;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className={styles.sparkSvg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <polyline
        fill="none"
        stroke="#008060"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

interface AnalyticsSnapshotProps {
  data: AnalyticsSnapshotData;
}

/** Spec § Section 9 — Analytics snapshot with sparklines */
export function AnalyticsSnapshot({ data }: AnalyticsSnapshotProps) {
  const cards = [
    {
      label: "Average Rating",
      value: data.averageRating == null ? "—" : data.averageRating.toFixed(1),
      spark: data.sparks.rating,
    },
    {
      label: "Reviews This Month",
      value: String(data.reviewsThisMonth),
      spark: data.sparks.volume,
    },
    {
      label: "Email Open Rate",
      value: `${data.emailOpenRate}%`,
      spark: data.sparks.openRate,
      mock: true,
    },
    {
      label: "Conversion Rate",
      value: `${data.conversionRate}%`,
      spark: data.sparks.conversion,
      mock: true,
    },
  ] as const;

  return (
    <section id="analytics" aria-labelledby="rx-analytics-title">
      <h2
        id="rx-analytics-title"
        className={styles.sectionTitle}
        style={{ marginBottom: 16 }}
      >
        Analytics snapshot
      </h2>
      <div className={styles.analyticsGrid}>
        {cards.map((card) => (
          <article key={card.label} className={styles.sparkCard}>
            <div className={styles.statLabel}>
              {card.label}
              {"mock" in card && card.mock ? (
                <span style={{ marginLeft: 6, fontSize: 11 }}>(est.)</span>
              ) : null}
            </div>
            <div className={styles.sparkValue}>{card.value}</div>
            <Sparkline values={[...card.spark]} label={`${card.label} trend`} />
          </article>
        ))}
      </div>
      <p className={styles.footer}>
        Open rate and conversion are placeholders until campaign analytics ship.
      </p>
    </section>
  );
}
