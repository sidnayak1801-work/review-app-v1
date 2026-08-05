import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Stars } from "../../../../components/stars";
import {
  formatRelativeTime,
  statusBadgeTone,
} from "../../../../lib/ui-format";
import { toShopifyProductNumericId } from "../../../../lib/shopify-ids";
import styles from "./dashboard.module.css";
import {
  ReviewActionIcons,
  type ReviewModerationResult,
} from "./review-action-icons";
import type { DashboardReviewRow } from "./types";
import { EmptyState } from "./EmptyState";

function productLabel(review: DashboardReviewRow): string {
  if (review.productTitle?.trim()) return review.productTitle.trim();
  try {
    return `Product #${toShopifyProductNumericId(review.shopifyProductId)}`;
  } catch {
    return "Unknown product";
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function statusLabel(status: string): string {
  if (status === "APPROVED") return "Published";
  if (status === "REJECTED") return "Hidden";
  return "Pending";
}

function badgeClass(status: string): string {
  if (status === "REJECTED") return styles.badgeNeutral;
  const tone = statusBadgeTone(status);
  if (tone === "success") return styles.badgeOk;
  if (tone === "warning") return styles.badgeWarn;
  if (tone === "critical") return styles.badgeBad;
  return styles.badgeWarn;
}

function StatusPill({ status }: { status: DashboardReviewRow["status"] }) {
  return (
    <span className={`${styles.badge} ${badgeClass(status)}`}>
      <span className={styles.statusDot} aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

interface LatestReviewsTableProps {
  reviews: DashboardReviewRow[];
  searchFilter: string;
}

/** Spec § Section 5 — Latest reviews with icon actions + scrollable body */
export function LatestReviewsTable({
  reviews,
  searchFilter,
}: LatestReviewsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rows, setRows] = useState(reviews);

  useEffect(() => {
    setRows(reviews);
  }, [reviews]);

  function applyModeration(result: ReviewModerationResult) {
    if (!result.ok) return;
    if (result.kind === "delete") {
      setRows((prev) => prev.filter((row) => row.id !== result.reviewId));
      return;
    }
    const nextStatus = result.kind === "publish" ? "APPROVED" : "REJECTED";
    setRows((prev) =>
      prev.map((row) =>
        row.id === result.reviewId ? { ...row, status: nextStatus } : row,
      ),
    );
  }

  const filtered = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (review) =>
        review.authorName.toLowerCase().includes(q) ||
        review.body.toLowerCase().includes(q) ||
        productLabel(review).toLowerCase().includes(q),
    );
  }, [rows, searchFilter]);

  if (rows.length === 0) {
    return (
      <section className={`${styles.card} ${styles.scrollCard}`} aria-labelledby="rx-latest-title">
        <h2 id="rx-latest-title" className={styles.sectionTitle}>
          Latest reviews
        </h2>
        <EmptyState
          title="No reviews yet"
          description="Start collecting reviews by importing existing reviews or sending your first review request."
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
      </section>
    );
  }

  return (
    <section
      className={`${styles.card} ${styles.scrollCard}`}
      aria-labelledby="rx-latest-title"
    >
      <div className={styles.cardHeader}>
        <div>
          <h2 id="rx-latest-title" className={styles.sectionTitle}>
            Latest reviews
          </h2>
          <p className={styles.body} style={{ marginTop: 8, marginBottom: 0 }}>
            Most recent submissions from your store
          </p>
        </div>
        <Link to="/app/reviews" className={styles.viewAllLink}>
          View all ↗
        </Link>
      </div>

      <div
        className={`${styles.tableWrap} ${styles.desktopTable} ${styles.scrollBody}`}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((review) => {
              const expanded = expandedId === review.id;
              return (
                <Fragment key={review.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className={styles.customerBtn}
                        onClick={() =>
                          setExpandedId(expanded ? null : review.id)
                        }
                        aria-expanded={expanded}
                      >
                        <span className={styles.avatarSm} aria-hidden>
                          {initials(review.authorName)}
                        </span>
                        <span className={styles.customerCell}>
                          <span className={styles.customerName}>
                            {review.authorName}
                          </span>
                          <span className={styles.customerMeta}>
                            {productLabel(review)} ·{" "}
                            {formatRelativeTime(review.createdAt)}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td>
                      <Stars rating={review.rating} />
                    </td>
                    <td className={styles.reviewSnippet}>
                      {review.body.length > 72
                        ? `${review.body.slice(0, 72)}…`
                        : review.body}
                    </td>
                    <td>
                      <StatusPill status={review.status} />
                    </td>
                    <td>
                      <ReviewActionIcons
                        review={review}
                        showView
                        expanded={expanded}
                        onToggleView={() =>
                          setExpandedId(expanded ? null : review.id)
                        }
                        onResult={applyModeration}
                      />
                    </td>
                  </tr>
                  {expanded ? (
                    <tr>
                      <td colSpan={5}>
                        <div className={styles.expandBody}>{review.body}</div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={`${styles.mobileCards} ${styles.scrollBody}`}>
        {filtered.map((review) => {
          const expanded = expandedId === review.id;
          return (
            <article key={review.id} className={styles.mobileCard}>
              <div className={styles.pendingTop}>
                <div className={styles.customerRow}>
                  <span className={styles.avatarSm} aria-hidden>
                    {initials(review.authorName)}
                  </span>
                  <div className={styles.customerCell}>
                    <strong className={styles.customerName}>
                      {review.authorName}
                    </strong>
                    <span className={styles.customerMeta}>
                      {productLabel(review)} ·{" "}
                      {formatRelativeTime(review.createdAt)}
                    </span>
                  </div>
                </div>
                <StatusPill status={review.status} />
              </div>
              <Stars rating={review.rating} />
              <p className={styles.body}>
                {expanded || review.body.length <= 120
                  ? review.body
                  : `${review.body.slice(0, 120)}…`}
              </p>
              <ReviewActionIcons
                review={review}
                showView
                expanded={expanded}
                onToggleView={() =>
                  setExpandedId(expanded ? null : review.id)
                }
                onResult={applyModeration}
              />
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.body}>No reviews match this search.</p>
      ) : null}
    </section>
  );
}
