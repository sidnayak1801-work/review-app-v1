import { useEffect, useMemo, useRef, useState } from "react";
import { Form, Link } from "react-router";

import { Stars } from "../../../components/stars";
import {
  avatarInitial,
  formatRelativeTime,
} from "../../../lib/ui-format";
import {
  toAppProductHref,
  toShopifyProductNumericId,
} from "../../../lib/shopify-ids";
import { ModerationQueueToolbar } from "../../moderation/moderation-queue-toolbar";
import { ModerationStatusBadge } from "../../moderation/moderation-status-badge";
import {
  ReviewModerationActions,
  type ModerationPatch,
} from "./review-moderation-actions";

type ReviewQueueFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

type ReviewMediaItem = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
};

interface ReviewListItem {
  id: string;
  shopifyProductId: string;
  productTitle?: string | null;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  status: string;
  source?: string;
  featured?: boolean;
  merchantReply?: string | null;
  createdAt: string;
  media?: ReviewMediaItem[];
}

interface ReviewsPageProps {
  reviews: ReviewListItem[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  filters: {
    status: ReviewQueueFilter;
    productId: string;
  };
  queueCounts: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
  };
  publishedReviewUsage: {
    used: number;
    limit: number | null;
  };
  shopPlan: "FREE" | "PRO";
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
  };
  isSubmitting: boolean;
  nextHref: string | null;
}

type MediaGalleryState = {
  items: ReviewMediaItem[];
  index: number;
};

const MEDIA_MODAL_ID = "review-media-lightbox";

const thumbStyle = {
  width: 72,
  height: 72,
  objectFit: "cover" as const,
  borderRadius: 8,
  display: "block",
  pointerEvents: "none" as const,
};

const thumbButtonStyle = {
  appearance: "none" as const,
  margin: 0,
  padding: 0,
  border: 0,
  background: "transparent",
  cursor: "pointer",
  borderRadius: 8,
  overflow: "hidden" as const,
  lineHeight: 0,
};

function ReviewMediaThumb({ item }: { item: ReviewMediaItem }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        style={{
          ...thumbStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "#6d7175",
          background: "var(--p-color-bg-surface-secondary, #f1f2f3)",
          pointerEvents: "none",
        }}
      >
        Unavailable
      </span>
    );
  }

  if (item.kind === "VIDEO") {
    return (
      <video
        src={item.url}
        muted
        preload="metadata"
        style={thumbStyle}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={item.url}
      alt=""
      width={72}
      height={72}
      style={thumbStyle}
      onError={() => setFailed(true)}
    />
  );
}

function buildQueueHref(
  status: ReviewQueueFilter,
  productId: string,
): string {
  const params = new URLSearchParams();
  if (status !== "ALL") {
    params.set("status", status);
  }
  if (productId) {
    params.set("productId", productId);
  }
  const query = params.toString();
  return query ? `?${query}` : "?";
}

function productLabel(review: {
  shopifyProductId: string;
  productTitle?: string | null;
}): string {
  if (review.productTitle?.trim()) {
    return review.productTitle.trim();
  }
  try {
    return `Product #${toShopifyProductNumericId(review.shopifyProductId)}`;
  } catch {
    return "Unknown product";
  }
}

function emptyQueueMessage(status: ReviewQueueFilter): string {
  switch (status) {
    case "ALL":
      return "No reviews yet. Import reviews or collect them from your storefront.";
    case "PENDING":
      return "No pending reviews. New storefront submissions will appear here.";
    case "APPROVED":
      return "No published reviews yet.";
    case "REJECTED":
      return "No rejected reviews.";
  }
}

export function ReviewsPage({
  reviews: initialReviews,
  filters,
  queueCounts,
  publishedReviewUsage,
  shopPlan,
  actionData,
  isSubmitting,
  nextHref,
}: ReviewsPageProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gallery, setGallery] = useState<MediaGalleryState | null>(null);
  const mediaModalRef = useRef<HTMLElement | null>(null);
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  function applyReviewPatch(patch: ModerationPatch) {
    setReviews((current) => {
      if (patch.deleted) {
        return current.filter((review) => review.id !== patch.reviewId);
      }
      return current.map((review) => {
        if (review.id !== patch.reviewId) {
          return review;
        }
        return {
          ...review,
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
          ...(patch.merchantReply !== undefined
            ? { merchantReply: patch.merchantReply }
            : {}),
        };
      });
    });
  }

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const totalCount =
    queueCounts.PENDING + queueCounts.APPROVED + queueCounts.REJECTED;

  const tabs: Array<{ status: ReviewQueueFilter; label: string; count: number }> =
    [
      { status: "ALL", label: "All reviews", count: totalCount },
      { status: "PENDING", label: "Pending", count: queueCounts.PENDING },
      { status: "APPROVED", label: "Published", count: queueCounts.APPROVED },
      { status: "REJECTED", label: "Rejected", count: queueCounts.REJECTED },
    ];

  const canBulk =
    selectedIds.length > 0 &&
    reviews.some((review) => selectedSet.has(review.id));

  const atPublishedLimit =
    shopPlan === "FREE" &&
    publishedReviewUsage.limit !== null &&
    publishedReviewUsage.used >= publishedReviewUsage.limit;

  const currentMedia = gallery?.items[gallery.index] ?? null;
  const hasMultipleMedia = (gallery?.items.length ?? 0) > 1;

  function pauseStageVideo() {
    stageVideoRef.current?.pause();
  }

  function showMediaModal() {
    const modal = mediaModalRef.current as
      | (HTMLElement & { showOverlay?: () => void })
      | null;
    modal?.showOverlay?.();
  }

  function openMediaGallery(items: ReviewMediaItem[], index: number) {
    pauseStageVideo();
    setGallery({ items, index });
  }

  function stepMedia(delta: number) {
    setGallery((current) => {
      if (!current || current.items.length === 0) {
        return current;
      }
      pauseStageVideo();
      const nextIndex =
        (current.index + delta + current.items.length) % current.items.length;
      return { ...current, index: nextIndex };
    });
  }

  useEffect(() => {
    if (gallery) {
      showMediaModal();
    }
  }, [gallery != null]);

  useEffect(() => {
    const modal = mediaModalRef.current;
    if (!modal) {
      return;
    }

    const handleHide = () => {
      pauseStageVideo();
      setGallery(null);
    };

    modal.addEventListener("hide", handleHide);
    return () => modal.removeEventListener("hide", handleHide);
  }, []);

  useEffect(() => {
    if (!gallery) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepMedia(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepMedia(1);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [gallery]);

  function toggleSelected(reviewId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(reviewId) ? current : [...current, reviewId];
      }
      return current.filter((id) => id !== reviewId);
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? reviews.map((review) => review.id) : []);
  }

  return (
    <s-page heading="Reviews">
      <s-stack direction="block" gap="large">
        <s-stack
          direction="inline"
          gap="small"
          alignItems="center"
          justifyContent="space-between"
        >
          <s-text color="subdued">
            Moderate and publish customer feedback · Sorted by newest
          </s-text>
          <s-stack direction="inline" gap="small">
            <s-button href="/app/imports" variant="secondary">
              Import
            </s-button>
            <s-button href="/app/settings" variant="secondary">
              Widget
            </s-button>
          </s-stack>
        </s-stack>

        {actionData ? (
          <s-banner
            heading={actionData.ok ? "Saved" : "Could not save"}
            tone={actionData.ok ? "success" : "critical"}
          >
            {actionData.message}
            {actionData.issues?.length ? (
              <s-unordered-list>
                {actionData.issues.map((issue) => (
                  <s-list-item key={issue}>{issue}</s-list-item>
                ))}
              </s-unordered-list>
            ) : null}
          </s-banner>
        ) : null}

        {publishedReviewUsage.limit !== null ? (
          <s-box padding="base" border="base" borderRadius="large" background="subdued">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-text type="strong">
                Published {publishedReviewUsage.used} / {publishedReviewUsage.limit}
              </s-text>
              {atPublishedLimit ? (
                <s-text color="subdued">
                  Free plan limit reached.{" "}
                  <Link to="/app/billing">Upgrade on Billing</Link>
                </s-text>
              ) : (
                <s-text color="subdued">{shopPlan} plan</s-text>
              )}
            </s-stack>
          </s-box>
        ) : null}

        <ModerationQueueToolbar
          tabs={tabs}
          activeStatus={filters.status}
          buildHref={(status) =>
            buildQueueHref(status as ReviewQueueFilter, filters.productId)
          }
          search={{
            name: "productId",
            label: "Filter by Shopify product GID or numeric ID",
            value: filters.productId,
            statusValue: filters.status,
            allStatusValue: "ALL",
          }}
        />

        {canBulk ? (
          <s-box padding="base" border="base" borderRadius="large" background="subdued">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-text type="strong">{selectedIds.length} selected</s-text>
              <Form method="post">
                <input type="hidden" name="intent" value="bulk-update-status" />
                <input type="hidden" name="status" value="APPROVED" />
                {selectedIds.map((id) => (
                  <input key={id} type="hidden" name="reviewIds" value={id} />
                ))}
                <s-button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || atPublishedLimit}
                >
                  Publish
                </s-button>
              </Form>
              <Form method="post">
                <input type="hidden" name="intent" value="bulk-update-status" />
                <input type="hidden" name="status" value="REJECTED" />
                {selectedIds.map((id) => (
                  <input key={id} type="hidden" name="reviewIds" value={id} />
                ))}
                <s-button type="submit" variant="secondary" disabled={isSubmitting}>
                  Hide
                </s-button>
              </Form>
              <s-button
                type="button"
                variant="tertiary"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </s-button>
            </s-stack>
          </s-box>
        ) : null}

        {reviews.length > 0 ? (
          <label>
            <input
              type="checkbox"
              checked={
                reviews.length > 0 &&
                reviews.every((review) => selectedSet.has(review.id))
              }
              onChange={(event) => toggleSelectAll(event.currentTarget.checked)}
            />{" "}
            Select all on this page
          </label>
        ) : null}

        {reviews.length === 0 ? (
          <s-box
            padding="base"
            border="base"
            borderRadius="large"
            background="subdued"
          >
            <s-stack direction="block" gap="small">
              <s-text type="strong">{emptyQueueMessage(filters.status)}</s-text>
              <s-stack direction="inline" gap="small">
                <s-button href="/app/imports" variant="primary">
                  Import reviews
                </s-button>
              </s-stack>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {reviews.map((review) => (
              <s-box
                key={review.id}
                padding="base"
                border="base"
                borderRadius="large"
                background="base"
              >
                <s-stack direction="block" gap="small">
                  <s-stack
                    direction="inline"
                    gap="base"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <label aria-label={`Select review by ${review.authorName}`}>
                        <input
                          type="checkbox"
                          checked={selectedSet.has(review.id)}
                          onChange={(event) =>
                            toggleSelected(
                              review.id,
                              event.currentTarget.checked,
                            )
                          }
                        />
                      </label>
                      <s-box
                        padding="small-200"
                        background="subdued"
                        borderRadius="base"
                      >
                        <s-text type="strong">
                          {avatarInitial(review.authorName)}
                        </s-text>
                      </s-box>
                      <s-stack direction="block" gap="none">
                        <s-text type="strong">{review.authorName}</s-text>
                        <s-text color="subdued">
                          {formatRelativeTime(review.createdAt)}
                          {review.source ? ` · via ${review.source}` : ""}
                        </s-text>
                      </s-stack>
                    </s-stack>
                    <ModerationStatusBadge
                      status={review.status}
                      label={
                        review.status === "APPROVED"
                          ? "Published"
                          : review.status
                      }
                    />
                    {review.featured ? (
                      <s-badge tone="info">Featured</s-badge>
                    ) : null}
                  </s-stack>

                  <Stars rating={review.rating} />
                  {review.title ? (
                    <s-text type="strong">{review.title}</s-text>
                  ) : null}
                  <s-paragraph>{review.body}</s-paragraph>
                  {(() => {
                    const href = toAppProductHref(
                      review.shopifyProductId,
                    );
                    const label = productLabel(review);
                    return href ? (
                      <s-text color="subdued">
                        Product: <s-link href={href}>{label}</s-link>
                        {" · "}insights
                      </s-text>
                    ) : (
                      <s-text color="subdued">Product: {label}</s-text>
                    );
                  })()}

                  {review.media && review.media.length > 0 ? (
                    <s-stack direction="inline" gap="small">
                      {review.media.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          style={thumbButtonStyle}
                          aria-label={
                            item.kind === "VIDEO" ? "View video" : "View photo"
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openMediaGallery(review.media ?? [], index);
                          }}
                        >
                          <ReviewMediaThumb item={item} />
                        </button>
                      ))}
                    </s-stack>
                  ) : null}

                  <ReviewModerationActions
                    review={{
                      id: review.id,
                      status: review.status,
                      featured: Boolean(review.featured),
                      merchantReply: review.merchantReply ?? null,
                    }}
                    atPublishedLimit={atPublishedLimit}
                    onOptimistic={applyReviewPatch}
                  />
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}

        {nextHref ? (
          <s-button href={nextHref} variant="secondary">
            Load more
          </s-button>
        ) : null}
      </s-stack>

      <s-modal
        id={MEDIA_MODAL_ID}
        heading="Review media"
        size="large"
        padding="none"
        ref={mediaModalRef as never}
      >
        <s-box padding="base" background="subdued">
          <s-stack direction="block" gap="base" alignItems="center">
            {currentMedia ? (
              currentMedia.kind === "VIDEO" ? (
                <video
                  key={currentMedia.id}
                  ref={stageVideoRef}
                  src={currentMedia.url}
                  controls
                  playsInline
                  style={{
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: 8,
                    background: "#000",
                  }}
                />
              ) : (
                <img
                  key={currentMedia.id}
                  src={currentMedia.url}
                  alt=""
                  style={{
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              )
            ) : (
              <s-text color="subdued">No media selected.</s-text>
            )}
            {hasMultipleMedia && gallery ? (
              <s-text color="subdued">
                {gallery.index + 1} / {gallery.items.length}
              </s-text>
            ) : null}
          </s-stack>
        </s-box>
        {hasMultipleMedia ? (
          <s-button
            slot="secondary-actions"
            variant="secondary"
            onClick={() => stepMedia(-1)}
          >
            Previous
          </s-button>
        ) : null}
        <s-button
          slot="secondary-actions"
          variant="secondary"
          commandFor={MEDIA_MODAL_ID}
          command="--hide"
          onClick={() => {
            pauseStageVideo();
            setGallery(null);
          }}
        >
          Close
        </s-button>
        {hasMultipleMedia ? (
          <s-button
            slot="primary-action"
            variant="primary"
            onClick={() => stepMedia(1)}
          >
            Next
          </s-button>
        ) : null}
      </s-modal>
    </s-page>
  );
}
