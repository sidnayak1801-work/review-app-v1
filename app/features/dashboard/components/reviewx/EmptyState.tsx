import type { ReactNode } from "react";

import styles from "./dashboard.module.css";

export function EmptyState({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.empty} role="status">
      <div
        className={styles.skeleton}
        style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px" }}
        aria-hidden
      />
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDesc}>{description}</p>
      {actions ? <div className={styles.emptyActions}>{actions}</div> : null}
    </div>
  );
}

export function SkeletonBlock({
  height = 16,
  width = "100%",
}: {
  height?: number | string;
  width?: number | string;
}) {
  return (
    <div
      className={styles.skeleton}
      style={{ height, width }}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <SkeletonBlock height={40} width="40%" />
      <div style={{ height: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} height={120} />
        ))}
      </div>
      <div style={{ height: 24 }} />
      <SkeletonBlock height={280} />
    </div>
  );
}
