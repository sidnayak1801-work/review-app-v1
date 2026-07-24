import type { CSSProperties } from "react";
import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";

interface WidgetPreviewProps {
  settings: WidgetSettingsInput;
}

export function WidgetPreview({ settings }: WidgetPreviewProps) {
  const panelStyle: CSSProperties = {
    background: settings.darkMode ? "#1f1f1f" : "#ffffff",
    color: settings.darkMode ? "#f5f5f5" : "#111111",
    borderRadius: `${settings.borderRadius}px`,
    boxShadow: settings.cardShadow
      ? "0 8px 24px rgba(0,0,0,0.12)"
      : "none",
    border: "1px solid rgba(0,0,0,0.08)",
    padding: "16px",
    fontFamily: "system-ui, sans-serif",
    maxWidth: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const buttonStyle: CSSProperties = {
    background: settings.primaryButtonColor,
    color: "#fff",
    border: "none",
    borderRadius: `${Math.max(4, settings.borderRadius / 2)}px`,
    padding: "8px 12px",
    cursor: "default",
  };

  const layoutClass =
    settings.layout === "GRID"
      ? "grid"
      : settings.layout === "COMPACT"
        ? "compact"
        : "stacked";

  return (
    <s-box padding="base" border="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="base">
        <s-text type="strong">Live preview</s-text>
        {!settings.widgetEnabled ? (
          <s-text color="subdued">Widget disabled</s-text>
        ) : (
          <div style={panelStyle} data-layout={layoutClass}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Customer reviews
                </div>
                <div style={{ color: settings.starColor, letterSpacing: 2 }}>
                  ★★★★☆
                </div>
              </div>
              {settings.showReviewForm ? (
                <button type="button" style={buttonStyle}>
                  Write a review
                </button>
              ) : null}
            </div>

            <div
              style={{
                display: layoutClass === "grid" ? "grid" : "flex",
                gridTemplateColumns:
                  layoutClass === "grid" ? "1fr 1fr" : undefined,
                flexDirection: "column",
                gap: layoutClass === "compact" ? 8 : 12,
              }}
            >
              {[0, 1].map((index) => (
                <div
                  key={index}
                  style={{
                    borderTop:
                      layoutClass === "stacked"
                        ? "1px solid rgba(127,127,127,0.25)"
                        : "none",
                    paddingTop: layoutClass === "stacked" ? 10 : 0,
                    background:
                      layoutClass === "grid" || layoutClass === "compact"
                        ? settings.darkMode
                          ? "#2a2a2a"
                          : "#f7f7f7"
                        : "transparent",
                    borderRadius: `${settings.borderRadius}px`,
                    padding: layoutClass === "stacked" ? 0 : 10,
                  }}
                >
                  <div style={{ color: settings.starColor }}>★★★★★</div>
                  {settings.showCustomerName ? (
                    <div style={{ fontWeight: 600, marginTop: 4 }}>Alex</div>
                  ) : null}
                  {settings.showReviewDate ? (
                    <div style={{ opacity: 0.7, fontSize: 12 }}>Jul 21, 2026</div>
                  ) : null}
                  <p style={{ margin: "8px 0 0", fontSize: 14 }}>
                    Great quality and fast shipping.
                  </p>
                  {settings.showProductImages ? (
                    <div
                      style={{
                        marginTop: 8,
                        height: 40,
                        width: 40,
                        borderRadius: 6,
                        background: settings.accentColor,
                        opacity: 0.35,
                      }}
                      aria-hidden
                    />
                  ) : null}
                  {settings.showCustomerPhotos ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          height: 36,
                          width: 36,
                          borderRadius: 6,
                          background: settings.accentColor,
                        }}
                        aria-hidden
                      />
                      <div
                        style={{
                          height: 36,
                          width: 36,
                          borderRadius: 6,
                          background: settings.primaryButtonColor,
                        }}
                        aria-hidden
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </s-stack>
    </s-box>
  );
}
