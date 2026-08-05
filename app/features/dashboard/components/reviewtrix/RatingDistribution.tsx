import { Link } from "react-router";

import styles from "./dashboard.module.css";
import type { RatingDistributionData } from "./types";
import { EmptyState } from "./EmptyState";

interface RatingDistributionProps {
  summary: RatingDistributionData;
}

/** Spec § Section 4 — Lovable-pattern rating card with hero average */
export function RatingDistribution({ summary }: RatingDistributionProps) {
  const total = summary.approvedCount;
  const avg = summary.averageRating;
  const roundedStars = avg == null ? 0 : Math.round(avg);
  const rows = ([5, 4, 3, 2, 1] as const).map((stars) => {
    const count = summary.ratingDistribution[stars] ?? 0;
    const percent = total === 0 ? 0 : Math.round((count / total) * 100);
    return { stars, count, percent };
  });

  return (
    <section className={styles.card} aria-labelledby="rx-rating-dist-title">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="rx-rating-dist-title" className={styles.sectionTitle}>
            Rating distribution
          </h2>
          <p className={styles.body} style={{ marginTop: 8, marginBottom: 0 }}>
            All-time breakdown.
          </p>
        </div>
        {avg != null ? (
          <div className={styles.ratingHero}>
            <div className={styles.ratingHeroValue}>{avg.toFixed(2)}</div>
            <div
              className={styles.ratingHeroStars}
              aria-label={`${avg.toFixed(1)} out of 5`}
            >
              {"★".repeat(Math.min(5, Math.max(0, roundedStars)))}
              {"☆".repeat(Math.max(0, 5 - roundedStars))}
            </div>
          </div>
        ) : null}
      </div>

      {total === 0 ? (
        <EmptyState
          title="No published ratings"
          description="Approve reviews to build your rating mix."
          actions={
            <Link
              className={`${styles.btn} ${styles.btnPrimary}`}
              to="/app/reviews?status=PENDING"
              prefetch="intent"
            >
              Moderate reviews
            </Link>
          }
        />
      ) : (
        <div className={styles.ratingList}>
          {rows.map((row) => (
            <div key={row.stars} className={styles.ratingRow}>
              <span
                className={styles.ratingStarLabel}
                aria-label={`${row.stars} stars`}
              >
                {row.stars}{" "}
                <span className={styles.stars} aria-hidden>
                  ★
                </span>
              </span>
              <div className={styles.barTrack} aria-hidden>
                <div
                  className={styles.barFill}
                  style={{ width: `${row.percent}%` }}
                />
              </div>
              <span className={styles.ratingCount}>
                {row.count.toLocaleString()}
              </span>
              <span className={styles.ratingPercent}>{row.percent}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
