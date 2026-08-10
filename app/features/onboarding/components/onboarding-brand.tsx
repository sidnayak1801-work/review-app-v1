/** Centered ReviewTrix wordmark for onboarding screens. */
export function OnboardingBrand() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        marginBottom: 4,
      }}
    >
      <img
        src="/reviewtrix-wordmark.png"
        alt="ReviewTrix"
        style={{
          display: "block",
          width: "100%",
          maxWidth: 260,
          maxHeight: 64,
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
