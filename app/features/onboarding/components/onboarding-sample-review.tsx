const STAR_COLOR = "#22c55e";
const ACCENT = "#0f766e";

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=160&h=160&fit=crop",
  "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=160&h=160&fit=crop",
] as const;

/** Static storefront-style review card for the welcome screen. */
export function OnboardingSampleReview() {
  return (
    <div
      aria-hidden
      style={{
        width: "min(100%, 340px)",
        borderRadius: 16,
        border: "1px solid rgba(0, 0, 0, 0.08)",
        background: "#fff",
        boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
        padding: "1.1rem 1.15rem",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(15, 118, 110, 0.12)",
            color: ACCENT,
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          E
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontWeight: 650, fontSize: 14, color: "#111" }}>
              Eileen Gu
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: "#14532d",
                background: "rgba(34, 197, 94, 0.16)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              Verified
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "#6d7175",
              }}
            >
              07/23/2026
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          color: STAR_COLOR,
          letterSpacing: 1,
          fontSize: 15,
          marginBottom: 8,
        }}
      >
        ★★★★★
      </div>

      <h3
        style={{
          margin: "0 0 6px",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: "#111",
        }}
      >
        Exactly what I needed
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: "#6d7175",
        }}
      >
        Great quality and arrived quickly. The widgets look clean on our product
        page — customers trust the verified reviews.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {SAMPLE_PHOTOS.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            width={64}
            height={64}
            style={{
              width: 64,
              height: 64,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid rgba(0, 0, 0, 0.08)",
              background: "#f3f4f5",
            }}
          />
        ))}
      </div>
    </div>
  );
}
