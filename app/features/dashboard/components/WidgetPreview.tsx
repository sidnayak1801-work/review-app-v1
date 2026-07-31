import type { CSSProperties } from "react";
import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";

interface WidgetPreviewProps {
  settings: WidgetSettingsInput;
}

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=160&h=160&fit=crop",
  "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=160&h=160&fit=crop",
] as const;

const SAMPLE_PRODUCT =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=96&h=96&fit=crop";

const SAMPLE_REVIEWS = [
  {
    initial: "E",
    name: "Eileen Gu",
    title: "Extraordinary product",
    body: "Evidence over affirmation. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    featured: true,
    reply: "Best review so far. Thanks Eileen!",
    date: "07/23/2026",
    stars: 5,
  },
  {
    initial: "J",
    name: "Jordan Lee",
    title: "Solid quality",
    body: "Comfortable ride and great finish. Would buy again for the whole team.",
    featured: false,
    reply: null,
    date: "07/20/2026",
    stars: 4,
  },
] as const;

function starsLabel(count: number): string {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

/** Live storefront preview matching the Customer reviews card mockup. */
export function WidgetPreview({ settings }: WidgetPreviewProps) {
  const isDark = settings.darkMode;
  const isCompact = settings.layout === "COMPACT";
  const isGrid = settings.layout === "GRID";
  const text = isDark ? "#f5f5f5" : "#111111";
  const muted = isDark ? "rgba(245,245,245,0.65)" : "#6d7175";
  const cardBg = isDark ? "#1f1f1f" : "#ffffff";
  const replyBg = isDark ? "#2a2a2a" : "#f3f4f5";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const pad = isCompact ? 14 : 20;
  const titleSize = isCompact ? 18 : 22;
  const bodySize = isCompact ? 13 : 14;

  const panelStyle: CSSProperties = {
    background: cardBg,
    color: text,
    borderRadius: `${settings.borderRadius}px`,
    boxShadow: settings.cardShadow
      ? "0 8px 24px rgba(0,0,0,0.10)"
      : "none",
    border: `1px solid ${border}`,
    borderTop: `3px solid ${settings.accentColor}`,
    padding: `${pad}px`,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    maxWidth: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const buttonStyle: CSSProperties = {
    background: settings.primaryButtonColor || "#111111",
    color: "#fff",
    border: `2px solid ${settings.accentColor}`,
    borderRadius: `${Math.max(6, Math.round(settings.borderRadius / 2))}px`,
    padding: isCompact ? "8px 12px" : "10px 14px",
    cursor: "default",
    fontSize: isCompact ? 12 : 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const reviewCardStyle: CSSProperties = {
    marginTop: isCompact ? 10 : 16,
    padding: isCompact ? 12 : 16,
    borderRadius: `${Math.max(8, settings.borderRadius)}px`,
    border: `1px solid ${border}`,
    background: isDark ? "#242424" : "#ffffff",
    boxShadow: settings.cardShadow
      ? "0 2px 10px rgba(0,0,0,0.06)"
      : "none",
  };

  if (!settings.widgetEnabled) {
    return (
      <div style={{ ...panelStyle, opacity: 0.7 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Customer reviews</div>
        <div style={{ color: muted, fontSize: 14 }}>Widget disabled</div>
      </div>
    );
  }

  function renderReviewCard(
    review: (typeof SAMPLE_REVIEWS)[number],
    index: number,
  ) {
    return (
      <article key={review.name} style={reviewCardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCompact ? 8 : 10,
            marginBottom: isCompact ? 8 : 12,
            flexWrap: "wrap",
          }}
        >
          {settings.showProductImages && index === 0 ? (
            <img
              src={SAMPLE_PRODUCT}
              alt=""
              width={isCompact ? 32 : 40}
              height={isCompact ? 32 : 40}
              style={{
                width: isCompact ? 32 : 40,
                height: isCompact ? 32 : 40,
                objectFit: "cover",
                borderRadius: 8,
                border: `1px solid ${border}`,
                flexShrink: 0,
                background: settings.accentColor,
              }}
            />
          ) : null}
          {settings.showCustomerName ? (
            <>
              <span
                style={{
                  width: isCompact ? 28 : 36,
                  height: isCompact ? 28 : 36,
                  borderRadius: "50%",
                  background: isDark ? "#3a3a3a" : "#dfe3e8",
                  color: text,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: isCompact ? 12 : 14,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {review.initial}
              </span>
              <span
                style={{ fontWeight: 700, fontSize: isCompact ? 13 : 15 }}
              >
                {review.name}
              </span>
            </>
          ) : null}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: isDark ? "#86efac" : "#15803d",
              background: isDark
                ? "rgba(34, 197, 94, 0.22)"
                : "rgba(34, 197, 94, 0.14)",
              border: `1px solid ${
                isDark ? "rgba(34, 197, 94, 0.4)" : "rgba(34, 197, 94, 0.28)"
              }`,
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              aria-hidden
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"
              />
            </svg>
            Verified
          </span>
          {review.featured ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#8a6d1d",
                background: "rgba(185, 137, 0, 0.18)",
                borderRadius: 999,
                padding: "3px 10px",
              }}
            >
              Featured
            </span>
          ) : null}
          {settings.showReviewDate ? (
            <span
              style={{
                marginLeft: "auto",
                color: muted,
                fontSize: isCompact ? 12 : 13,
              }}
            >
              {review.date}
            </span>
          ) : null}
        </div>

        <div
          style={{
            color: settings.starColor,
            letterSpacing: 1,
            fontSize: isCompact ? 13 : 15,
            marginBottom: 8,
          }}
          aria-label={`${review.stars} out of 5 stars`}
        >
          {starsLabel(review.stars)}
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            fontSize: isCompact ? 14 : 16,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {review.title}
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: bodySize,
            lineHeight: 1.55,
            color: muted,
          }}
        >
          {review.body}
        </p>

        {settings.showCustomerPhotos && index === 0 ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: isCompact ? 10 : 14,
            }}
          >
            {SAMPLE_PHOTOS.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                width={isCompact ? 56 : 72}
                height={isCompact ? 56 : 72}
                style={{
                  width: isCompact ? 56 : 72,
                  height: isCompact ? 56 : 72,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: `1px solid ${border}`,
                  background: settings.accentColor,
                }}
              />
            ))}
          </div>
        ) : null}

        {review.reply ? (
          <div
            style={{
              marginTop: isCompact ? 12 : 16,
              padding: isCompact ? "10px 12px" : "12px 14px",
              borderRadius: 10,
              background: replyBg,
              display: "flex",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 3,
                borderRadius: 2,
                background: settings.accentColor,
                flexShrink: 0,
                opacity: 0.9,
              }}
              aria-hidden
            />
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                STORE REPLY
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: bodySize,
                  lineHeight: 1.45,
                  color: text,
                }}
              >
                {review.reply}
              </p>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  const reviewsToShow = isGrid ? SAMPLE_REVIEWS : [SAMPLE_REVIEWS[0]];

  return (
    <div style={panelStyle} data-preview="customer-reviews">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            {settings.showProductImages ? (
              <img
                src={SAMPLE_PRODUCT}
                alt=""
                width={isCompact ? 36 : 44}
                height={isCompact ? 36 : 44}
                style={{
                  width: isCompact ? 36 : 44,
                  height: isCompact ? 36 : 44,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: `1px solid ${border}`,
                  flexShrink: 0,
                  background: settings.accentColor,
                }}
              />
            ) : null}
            <div
              style={{
                fontWeight: 700,
                fontSize: titleSize,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Customer reviews
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: isCompact ? 16 : 18 }}>
              4.4
            </span>
            <span
              style={{
                color: settings.starColor,
                letterSpacing: 1,
                fontSize: isCompact ? 14 : 16,
                lineHeight: 1,
              }}
              aria-label="4.4 out of 5 stars"
            >
              ★★★★☆
            </span>
            <span style={{ color: muted, fontSize: isCompact ? 12 : 14 }}>
              (5 reviews+)
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              color: muted,
              fontSize: 12,
            }}
          >
            Showing 1 of {settings.reviewsPerPage} per page
          </div>
        </div>
        {settings.showReviewForm ? (
          <button type="button" style={buttonStyle}>
            Add review
          </button>
        ) : null}
      </div>

      <div
        style={
          isGrid
            ? {
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }
            : undefined
        }
      >
        {reviewsToShow.map((review, index) => renderReviewCard(review, index))}
      </div>
    </div>
  );
}
