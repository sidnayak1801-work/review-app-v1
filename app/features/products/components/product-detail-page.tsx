import { useEffect, useRef, useState } from "react";

import { Stars } from "../../../components/stars";
import {
  formatRelativeTime,
  statusBadgeTone,
} from "../../../lib/ui-format";
import type {
  ProductRatingTrendPoint,
  ProductReviewStats,
  ProductReviewTrendPoint,
} from "../../../repositories/review.repository.server";
import type { ShopifyProductDetails } from "../../../services/shopify-products.server";
import {
  ReviewModerationActions,
  type ModerationPatch,
} from "../../reviews/components/review-moderation-actions";
import type { ProductInsight } from "../product-insights.types";

type ReviewMediaItem = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
};

interface ProductDetailReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  featured: boolean;
  merchantReply: string | null;
  createdAt: string;
  media: ReviewMediaItem[];
}

interface ProductDetailPageProps {
  title: string;
  numericId: string;
  shopifyAdminHref: string;
  shopify: ShopifyProductDetails | null;
  stats: ProductReviewStats;
  volumeTrend: ProductReviewTrendPoint[];
  ratingTrend: ProductRatingTrendPoint[];
  insights: ProductInsight[];
  reviews: ProductDetailReview[];
  nextHref: string | null;
  reviewsListHref: string;
  hasAnyReviews: boolean;
  atPublishedLimit?: boolean;
}

const MEDIA_MODAL_ID = "product-review-media-lightbox";

const thumbStyle = {
  width: 56,
  height: 56,
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <s-stack direction="block" gap="none">
      <s-text color="subdued">{label}</s-text>
      <s-text>{value}</s-text>
    </s-stack>
  );
}

function VolumeTrendChart({ points }: { points: ProductReviewTrendPoint[] }) {
  const width = 560;
  const height = 200;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const maxCount = Math.max(...points.map((p) => p.count), 0);
  const hasData = maxCount > 0;
  const yMax = Math.max(maxCount, 1);
  const yTicks = Array.from(
    new Set([0, Math.ceil(yMax / 2), yMax]),
  );

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padLeft + chartW / 2
        : padLeft + (index / (points.length - 1)) * chartW;
    const y = padTop + chartH - (point.count / yMax) * chartH;
    return { x, y, ...point };
  });

  const line = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <s-box padding="base" border="base" borderRadius="large" background="base">
      <s-stack direction="block" gap="small">
        <s-text type="strong">Review volume</s-text>
        <s-text color="subdued">Last 12 months</s-text>
        {!hasData ? (
          <s-text color="subdued">No reviews in this period.</s-text>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={180}
            role="img"
            aria-label="Monthly review volume"
          >
            {yTicks.map((tick) => {
              const y = padTop + chartH - (tick / yMax) * chartH;
              return (
                <g key={`vol-y-${tick}`}>
                  <line
                    x1={padLeft}
                    x2={width - padRight}
                    y1={y}
                    y2={y}
                    stroke="var(--p-color-border-secondary, #e1e3e5)"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--p-color-text-secondary, #6d7175)"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}
            <path
              d={line}
              fill="none"
              stroke="var(--p-color-bg-fill-brand, #2c6ecb)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {coords.map((p) => (
              <circle
                key={p.monthKey}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill="var(--p-color-bg-fill-brand, #2c6ecb)"
              />
            ))}
            {coords.map((p, index) =>
              index % 2 === 0 || index === coords.length - 1 ? (
                <text
                  key={`${p.monthKey}-label`}
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--p-color-text-secondary, #6d7175)"
                >
                  {p.label}
                </text>
              ) : null,
            )}
          </svg>
        )}
      </s-stack>
    </s-box>
  );
}

function RatingTrendChart({ points }: { points: ProductRatingTrendPoint[] }) {
  const width = 560;
  const height = 200;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const hasData = points.some((p) => p.averageRating != null);
  const ratingTicks = [1, 2, 3, 4, 5];

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padLeft + chartW / 2
        : padLeft + (index / (points.length - 1)) * chartW;
    const rating = point.averageRating ?? 1;
    const y = padTop + chartH - ((rating - 1) / 4) * chartH;
    return { x, y, ...point };
  });

  const line = coords
    .filter((p) => p.averageRating != null)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <s-box padding="base" border="base" borderRadius="large" background="base">
      <s-stack direction="block" gap="small">
        <s-text type="strong">Rating trend</s-text>
        <s-text color="subdued">Published average · last 12 months</s-text>
        {!hasData ? (
          <s-text color="subdued">No published ratings yet.</s-text>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={180}
            role="img"
            aria-label="Monthly average rating"
          >
            {ratingTicks.map((tick) => {
              const y = padTop + chartH - ((tick - 1) / 4) * chartH;
              return (
                <g key={`rating-y-${tick}`}>
                  <line
                    x1={padLeft}
                    x2={width - padRight}
                    y1={y}
                    y2={y}
                    stroke="var(--p-color-border-secondary, #e1e3e5)"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--p-color-text-secondary, #6d7175)"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}
            <path
              d={line}
              fill="none"
              stroke="var(--p-color-bg-fill-success, #29845a)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {coords
              .filter((p) => p.averageRating != null)
              .map((p) => (
                <circle
                  key={p.monthKey}
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill="var(--p-color-bg-fill-success, #29845a)"
                />
              ))}
            {coords.map((p, index) =>
              index % 2 === 0 || index === coords.length - 1 ? (
                <text
                  key={`${p.monthKey}-label`}
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--p-color-text-secondary, #6d7175)"
                >
                  {p.label}
                </text>
              ) : null,
            )}
          </svg>
        )}
      </s-stack>
    </s-box>
  );
}

function applyPatch(
  reviews: ProductDetailReview[],
  patch: ModerationPatch,
): ProductDetailReview[] {
  if (patch.deleted) {
    return reviews.filter((review) => review.id !== patch.reviewId);
  }

  return reviews.map((review) => {
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
}

export function ProductDetailPage({
  title,
  numericId,
  shopifyAdminHref,
  shopify,
  stats: initialStats,
  volumeTrend,
  ratingTrend,
  insights,
  reviews: initialReviews,
  nextHref,
  reviewsListHref,
  hasAnyReviews,
  atPublishedLimit = false,
}: ProductDetailPageProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [stats, setStats] = useState(initialStats);
  const [actionMessage, setActionMessage] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [gallery, setGallery] = useState<{
    items: ReviewMediaItem[];
    index: number;
  } | null>(null);
  const mediaModalRef = useRef<HTMLElement | null>(null);
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);
  const snapshotRef = useRef<ProductDetailReview[] | null>(null);

  useEffect(() => {
    setReviews(initialReviews);
    setStats(initialStats);
  }, [initialReviews, initialStats]);

  const totalForBars = Math.max(
    Object.values(stats.ratingDistribution).reduce((sum, n) => sum + n, 0),
    1,
  );

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

  function handleOptimistic(patch: ModerationPatch) {
    snapshotRef.current = reviews;
    setReviews((current) => applyPatch(current, patch));
    setStats((current) => {
      const next = { ...current };
      if (patch.deleted) {
        next.totalReviews = Math.max(0, next.totalReviews - 1);
        return next;
      }
      if (patch.status === "APPROVED") {
        const prev = snapshotRef.current?.find((r) => r.id === patch.reviewId);
        if (prev?.status === "PENDING") {
          next.pendingReviews = Math.max(0, next.pendingReviews - 1);
          next.approvedReviews += 1;
        } else if (prev?.status === "REJECTED") {
          next.rejectedReviews = Math.max(0, next.rejectedReviews - 1);
          next.approvedReviews += 1;
        }
      }
      if (patch.status === "REJECTED") {
        const prev = snapshotRef.current?.find((r) => r.id === patch.reviewId);
        if (prev?.status === "PENDING") {
          next.pendingReviews = Math.max(0, next.pendingReviews - 1);
          next.rejectedReviews += 1;
        } else if (prev?.status === "APPROVED") {
          next.approvedReviews = Math.max(0, next.approvedReviews - 1);
          next.rejectedReviews += 1;
        }
      }
      return next;
    });
  }

  function handleResult(result: {
    ok: boolean;
    message: string;
    patch?: ModerationPatch;
  }) {
    if (!result.ok) {
      setActionMessage({ ok: false, message: result.message });
      if (snapshotRef.current) {
        setReviews(snapshotRef.current);
        setStats(initialStats);
      }
    }
    snapshotRef.current = null;
  }

  const overviewMetrics = [
    { label: "Total", value: String(stats.totalReviews) },
    { label: "Published", value: String(stats.approvedReviews) },
    { label: "Pending", value: String(stats.pendingReviews) },
    { label: "Hidden", value: String(stats.rejectedReviews) },
    {
      label: "Avg rating",
      value: stats.averageApprovedRating?.toFixed(1) ?? "—",
    },
  ];

  return (
    <s-page heading={title}>
      <s-stack direction="block" gap="large">
        <s-stack
          direction="inline"
          gap="base"
          alignItems="center"
          justifyContent="space-between"
        >
          <s-button href="/app/reviews" variant="secondary">
            Back to reviews
          </s-button>
          <s-stack direction="inline" gap="small">
            <s-button href={reviewsListHref} variant="secondary">
              Filter in Reviews
            </s-button>
            <s-button href={shopifyAdminHref} variant="primary">
              Open in Shopify
            </s-button>
          </s-stack>
        </s-stack>

        {actionMessage ? (
          <s-banner
            heading={actionMessage.ok ? "Updated" : "Could not update"}
            tone={actionMessage.ok ? "success" : "critical"}
          >
            {actionMessage.message}
          </s-banner>
        ) : null}

        {!hasAnyReviews ? (
          <s-banner heading="No reviews for this product" tone="info">
            Stats and trends appear after the first review is collected or
            imported.
          </s-banner>
        ) : null}

        <s-box padding="base" border="base" borderRadius="large" background="base">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="large" alignItems="start">
              {shopify?.imageUrl ? (
                <img
                  src={shopify.imageUrl}
                  alt={shopify.imageAlt || title}
                  width={88}
                  height={88}
                  style={{
                    borderRadius: 12,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <s-box padding="large" background="subdued" borderRadius="base">
                  <s-text color="subdued">No image</s-text>
                </s-box>
              )}
              <s-stack direction="block" gap="small">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-heading>{title}</s-heading>
                  {shopify?.status ? (
                    <s-badge
                      tone={
                        shopify.status.toUpperCase() === "ACTIVE"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {shopify.status}
                    </s-badge>
                  ) : null}
                </s-stack>
                {stats.averageApprovedRating != null ? (
                  <s-stack direction="inline" gap="small" alignItems="center">
                    <Stars rating={stats.averageApprovedRating} size="1.25rem" />
                    <s-text type="strong">
                      {stats.averageApprovedRating.toFixed(1)}
                    </s-text>
                  </s-stack>
                ) : (
                  <s-text color="subdued">No published rating yet</s-text>
                )}
              </s-stack>
            </s-stack>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(7.5rem, 1fr))",
                gap: "0.75rem",
                paddingTop: "0.25rem",
                borderTop: "1px solid var(--p-color-border-secondary, #e1e3e5)",
              }}
            >
              {overviewMetrics.map((metric) => (
                <div key={metric.label} style={{ minWidth: 0 }}>
                  <s-stack direction="block" gap="small-200">
                    <s-text color="subdued">{metric.label}</s-text>
                    <s-heading>{metric.value}</s-heading>
                  </s-stack>
                </div>
              ))}
            </div>
          </s-stack>
        </s-box>

        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 900px) 2fr 1fr, 1fr"
            gap="large"
          >
            <s-grid-item>
              <s-stack direction="block" gap="large">
                <s-box
                  padding="base"
                  border="base"
                  borderRadius="large"
                  background="base"
                >
                  <s-stack direction="block" gap="small">
                    <s-text type="strong">Rating mix</s-text>
                    {([5, 4, 3, 2, 1] as const).map((rating) => {
                      const count = stats.ratingDistribution[rating];
                      const width = `${Math.round((count / totalForBars) * 100)}%`;
                      return (
                        <s-stack
                          key={rating}
                          direction="inline"
                          gap="small"
                          alignItems="center"
                        >
                          <s-text>{rating}★</s-text>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              borderRadius: 999,
                              background:
                                "var(--p-color-bg-surface-secondary, #f1f2f3)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width,
                                height: "100%",
                                borderRadius: 999,
                                background:
                                  "var(--p-color-bg-fill-brand, #2c6ecb)",
                              }}
                            />
                          </div>
                          <s-text color="subdued">{count}</s-text>
                        </s-stack>
                      );
                    })}
                  </s-stack>
                </s-box>

                <VolumeTrendChart points={volumeTrend} />
                <RatingTrendChart points={ratingTrend} />

                <s-section heading="Reviews">
                  <s-stack direction="block" gap="base">
                    {reviews.length === 0 ? (
                      <s-box
                        padding="base"
                        border="base"
                        borderRadius="large"
                        background="subdued"
                      >
                        <s-text color="subdued">
                          No reviews to show for this product yet.
                        </s-text>
                      </s-box>
                    ) : (
                      <s-stack direction="block" gap="small">
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
                                <s-stack direction="block" gap="none">
                                  <s-text type="strong">
                                    {review.authorName}
                                  </s-text>
                                  <s-text color="subdued">
                                    {formatRelativeTime(review.createdAt)}
                                  </s-text>
                                </s-stack>
                                <s-stack
                                  direction="inline"
                                  gap="small"
                                  alignItems="center"
                                >
                                  <s-badge tone={statusBadgeTone(review.status)}>
                                    {review.status === "APPROVED"
                                      ? "Published"
                                      : review.status}
                                  </s-badge>
                                  {review.featured ? (
                                    <s-badge tone="info">Featured</s-badge>
                                  ) : null}
                                </s-stack>
                              </s-stack>
                              <Stars rating={review.rating} />
                              {review.title ? (
                                <s-text type="strong">{review.title}</s-text>
                              ) : null}
                              <s-paragraph>{review.body}</s-paragraph>
                              {review.media.length > 0 ? (
                                <s-stack direction="inline" gap="small">
                                  {review.media.map((item, index) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      style={thumbButtonStyle}
                                      aria-label={
                                        item.kind === "VIDEO"
                                          ? "View video"
                                          : "View photo"
                                      }
                                      onClick={() =>
                                        openMediaGallery(review.media, index)
                                      }
                                    >
                                      {item.kind === "VIDEO" ? (
                                        <video
                                          src={item.url}
                                          muted
                                          preload="metadata"
                                          style={thumbStyle}
                                        />
                                      ) : (
                                        <img
                                          src={item.url}
                                          alt=""
                                          width={56}
                                          height={56}
                                          style={thumbStyle}
                                        />
                                      )}
                                    </button>
                                  ))}
                                </s-stack>
                              ) : null}
                              <ReviewModerationActions
                                review={review}
                                atPublishedLimit={atPublishedLimit}
                                onOptimistic={handleOptimistic}
                                onResult={handleResult}
                              />
                            </s-stack>
                          </s-box>
                        ))}
                      </s-stack>
                    )}
                    {nextHref ? (
                      <s-button href={nextHref} variant="secondary">
                        Load more reviews
                      </s-button>
                    ) : null}
                  </s-stack>
                </s-section>
              </s-stack>
            </s-grid-item>

            <s-grid-item>
              <s-stack direction="block" gap="base">
                <s-box
                  padding="base"
                  border="base"
                  borderRadius="large"
                  background="base"
                >
                  <s-stack direction="block" gap="base">
                    <s-text type="strong">Product details</s-text>
                    <MetaRow label="Product id" value={numericId} />
                    <MetaRow
                      label="Handle"
                      value={shopify?.handle || "Unavailable"}
                    />
                    <MetaRow
                      label="Vendor"
                      value={shopify?.vendor || "Unavailable"}
                    />
                    <MetaRow
                      label="Type"
                      value={shopify?.productType || "None"}
                    />
                  </s-stack>
                </s-box>

                <s-box
                  padding="base"
                  border="base"
                  borderRadius="large"
                  background="base"
                >
                  <s-stack direction="block" gap="small">
                    <s-text type="strong">Review timeline</s-text>
                    {reviews.length === 0 ? (
                      <s-text color="subdued">No recent activity.</s-text>
                    ) : (
                      reviews.slice(0, 8).map((review) => (
                        <s-stack
                          key={`timeline-${review.id}`}
                          direction="inline"
                          gap="small"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <s-text color="subdued">
                            {formatRelativeTime(review.createdAt)}
                          </s-text>
                          <s-text>{review.rating}★</s-text>
                        </s-stack>
                      ))
                    )}
                  </s-stack>
                </s-box>

                <s-box
                  padding="base"
                  border="base"
                  borderRadius="large"
                  background="subdued"
                >
                  <s-stack direction="block" gap="small">
                    <s-stack
                      direction="inline"
                      gap="small"
                      alignItems="center"
                    >
                      <s-text type="strong">AI insights</s-text>
                      <s-badge tone="info">Coming soon</s-badge>
                    </s-stack>
                    {insights.length === 0 ? (
                      <s-text color="subdued">
                        Review themes and sentiment will appear here when they
                        are available. No sample insights are shown.
                      </s-text>
                    ) : (
                      insights.map((insight) => (
                        <s-box
                          key={insight.id}
                          padding="small"
                          border="base"
                          borderRadius="base"
                          background="base"
                        >
                          <s-stack direction="block" gap="small-200">
                            <s-text type="strong">{insight.headline}</s-text>
                            {insight.detail ? (
                              <s-text color="subdued">{insight.detail}</s-text>
                            ) : null}
                          </s-stack>
                        </s-box>
                      ))
                    )}
                  </s-stack>
                </s-box>
              </s-stack>
            </s-grid-item>
          </s-grid>
        </s-query-container>
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
