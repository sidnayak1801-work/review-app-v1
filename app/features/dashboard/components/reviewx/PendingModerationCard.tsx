import { useEffect, useState } from "react";
import { Link } from "react-router";

import { Stars } from "../../../../components/stars";
import { toShopifyProductNumericId } from "../../../../lib/shopify-ids";
import styles from "./dashboard.module.css";
import {
  ReviewActionIcons,
  type ReviewModerationResult,
} from "./review-action-icons";
import type { DashboardReviewRow } from "./types";

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

interface PendingModerationCardProps {
  reviews: DashboardReviewRow[];
}

/** Spec § Section 6 — Compact pending list with icon actions + internal scroll */
export function PendingModerationCard({ reviews }: PendingModerationCardProps) {
  const [rows, setRows] = useState(reviews);

  useEffect(() => {
    setRows(reviews);
  }, [reviews]);

  function applyModeration(result: ReviewModerationResult) {
    if (!result.ok) return;
    setRows((prev) => prev.filter((row) => row.id !== result.reviewId));
  }

  const items = rows.slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={`${styles.card} ${styles.scrollCard}`}
      aria-labelledby="rx-pending-title"
    >
      <div className={styles.cardHeader}>
        <div>
          <h2 id="rx-pending-title" className={styles.sectionTitle}>
            Pending moderation
          </h2>
          <p className={styles.body} style={{ marginTop: 8, marginBottom: 0 }}>
            {rows.length} waiting for a decision
          </p>
        </div>
        <Link className={styles.viewAllLink} to="/app/reviews?status=PENDING">
          Open queue ↗
        </Link>
      </div>

      <div className={styles.pendingScroll}>
        {items.map((review) => (
          <div key={review.id} className={styles.pendingItem}>
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
                    {productLabel(review)}
                  </span>
                </div>
              </div>
              <Stars rating={review.rating} />
            </div>
            <p className={styles.pendingPreview}>{review.body}</p>
            <ReviewActionIcons review={review} onResult={applyModeration} />
          </div>
        ))}
      </div>
    </section>
  );
}
