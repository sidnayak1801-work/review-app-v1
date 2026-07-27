import styles from "./dashboard.module.css";
import type { KpiTrend } from "./types";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  trend: KpiTrend;
}

/** Spec § Section 2 — KPI card */
export function StatCard({ label, value, icon, trend }: StatCardProps) {
  const trendClass =
    trend.direction === "up"
      ? styles.trendUp
      : trend.direction === "down"
        ? styles.trendDown
        : undefined;
  const arrow =
    trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";

  return (
    <article className={styles.statCard}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statIcon} aria-hidden>
          {icon}
        </span>
      </div>
      <p className={styles.statValue}>{value}</p>
      <div className={styles.statTrend}>
        <span className={trendClass}>
          {arrow}{" "}
          {trend.percent == null ? "—" : `${Math.abs(trend.percent)}%`}
        </span>
        <span>{trend.label}</span>
      </div>
    </article>
  );
}
