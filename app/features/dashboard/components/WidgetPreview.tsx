import type { CSSProperties } from "react";
import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";

interface WidgetPreviewProps {
  settings: WidgetSettingsInput;
}

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=160&h=160&fit=crop",
  "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=160&h=160&fit=crop",
] as const;

/** Live storefront preview matching the Customer reviews card mockup. */
export function WidgetPreview({ settings }: WidgetPreviewProps) {
  const isDark = settings.darkMode;
  const text = isDark ? "#f5f5f5" : "#111111";
  const muted = isDark ? "rgba(245,245,245,0.65)" : "#6d7175";
  const cardBg = isDark ? "#1f1f1f" : "#ffffff";
  const replyBg = isDark ? "#2a2a2a" : "#f3f4f5";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  const panelStyle: CSSProperties = {
    background: cardBg,
    color: text,
    borderRadius: `${settings.borderRadius}px`,
    boxShadow: settings.cardShadow
      ? "0 8px 24px rgba(0,0,0,0.10)"
      : "none",
    border: `1px solid ${border}`,
    padding: "20px",
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    maxWidth: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const buttonStyle: CSSProperties = {
    background: settings.primaryButtonColor || "#111111",
    color: "#fff",
    border: "none",
    borderRadius: `${Math.max(6, Math.round(settings.borderRadius / 2))}px`,
    padding: "10px 14px",
    cursor: "default",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const reviewCardStyle: CSSProperties = {
    marginTop: 16,
    padding: 16,
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
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "-0.02em",
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            Customer reviews
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 18 }}>4.4</span>
            <span
              style={{
                color: settings.starColor,
                letterSpacing: 1,
                fontSize: 16,
                lineHeight: 1,
              }}
              aria-label="4.4 out of 5 stars"
            >
              ★★★★☆
            </span>
            <span style={{ color: muted, fontSize: 14 }}>(5 reviews+)</span>
          </div>
        </div>
        {settings.showReviewForm ? (
          <button type="button" style={buttonStyle}>
            Add review
          </button>
        ) : null}
      </div>

      <article style={reviewCardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          {settings.showCustomerName ? (
            <>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: isDark ? "#3a3a3a" : "#dfe3e8",
                  color: text,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                E
              </span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Eileen Gu</span>
            </>
          ) : null}
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
          {settings.showReviewDate ? (
            <span
              style={{
                marginLeft: "auto",
                color: muted,
                fontSize: 13,
              }}
            >
              07/23/2026
            </span>
          ) : null}
        </div>

        <div
          style={{
            color: settings.starColor,
            letterSpacing: 1,
            fontSize: 15,
            marginBottom: 8,
          }}
          aria-label="5 out of 5 stars"
        >
          ★★★★★
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          Extraordinary product
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: muted,
          }}
        >
          Evidence over affirmation. Lorem ipsum dolor sit amet, consectetur
          adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua.
        </p>

        {settings.showCustomerPhotos ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
            }}
          >
            {SAMPLE_PHOTOS.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                width={72}
                height={72}
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: `1px solid ${border}`,
                  background: settings.accentColor,
                }}
              />
            ))}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
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
              background: text,
              flexShrink: 0,
              opacity: 0.85,
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
                fontSize: 14,
                lineHeight: 1.45,
                color: text,
              }}
            >
              Best review so far. Thanks Eileen!
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
