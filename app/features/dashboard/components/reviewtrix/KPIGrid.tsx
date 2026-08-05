import { StatCard } from "./StatCard";
import styles from "./dashboard.module.css";
import type { DashboardKpis } from "./types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

interface KPIGridProps {
  kpis: DashboardKpis;
}

/** Spec § Section 2 — Reviews / Average Rating / Pending / Emails Sent */
export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <section aria-label="Key metrics">
      <div className={styles.kpiGrid}>
        <StatCard
          label="Reviews"
          value={formatNumber(kpis.totalReviews)}
          icon="★"
          trend={kpis.trends.reviews}
        />
        <StatCard
          label="Average Rating"
          value={
            kpis.averageRating == null ? "—" : kpis.averageRating.toFixed(1)
          }
          icon="◈"
          trend={kpis.trends.rating}
        />
        <StatCard
          label="Pending"
          value={formatNumber(kpis.pendingReviews)}
          icon="◷"
          trend={kpis.trends.pending}
        />
        <StatCard
          label="Emails Sent"
          value={formatNumber(kpis.emailsSent)}
          icon="✉"
          trend={kpis.trends.emails}
        />
      </div>
    </section>
  );
}
