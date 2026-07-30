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
  return <AdminPageSkeleton label="Loading dashboard" />;
}

/** Content-area placeholder while a merchant admin route loader runs. */
export function AdminPageSkeleton({
  label = "Loading page",
}: {
  label?: string;
}) {
  return (
    <div
      className={styles.adminPageSkeleton}
      aria-busy="true"
      aria-label={label}
    >
      <SkeletonBlock height={36} width="36%" />
      <div style={{ height: 20 }} />
      <div className={styles.adminPageSkeletonKpis}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} height={96} />
        ))}
      </div>
      <div style={{ height: 24 }} />
      <SkeletonBlock height={220} />
      <div style={{ height: 24 }} />
      <div className={styles.adminPageSkeletonSplit}>
        <SkeletonBlock height={180} />
        <SkeletonBlock height={180} />
      </div>
    </div>
  );
}
