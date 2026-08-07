import { Form } from "react-router";

import { OnboardingShell } from "./onboarding-shell";

type WelcomeScreenProps = {
  shopDomain: string;
};

export function WelcomeScreen({ shopDomain }: WelcomeScreenProps) {
  return (
    <OnboardingShell>
      <s-stack direction="block" gap="large" alignItems="center">
        <s-stack direction="block" gap="small" alignItems="center">
          <s-text type="strong">ReviewTrix</s-text>
          <h1
            style={{
              margin: 0,
              textAlign: "center",
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              fontWeight: 650,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              maxWidth: "28rem",
            }}
          >
            Turn happy customers into your biggest marketing asset.
          </h1>
          <s-text color="subdued">
            Collect, moderate, and display product reviews for {shopDomain}.
          </s-text>
        </s-stack>

        <s-stack direction="block" gap="small-200" alignItems="center">
          <s-text>✓ Collect reviews after fulfillment</s-text>
          <s-text>✓ Display trusted widgets on your storefront</s-text>
          <s-text>✓ Import existing reviews in minutes</s-text>
        </s-stack>

        <s-text type="strong">✓ Setup takes about 2 minutes</s-text>

        <div
          aria-hidden
          style={{
            width: "min(100%, 280px)",
            borderRadius: 16,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            background: "#fff",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
            padding: "1.25rem",
          }}
        >
          <s-stack direction="block" gap="small-200">
            <s-text color="subdued">Sample review</s-text>
            <s-text type="strong">★★★★★ “Exactly what I needed.”</s-text>
            <s-text color="subdued">Verified buyer</s-text>
          </s-stack>
        </div>

        <s-stack direction="inline" gap="base" alignItems="center">
          <Form method="post">
            <input type="hidden" name="intent" value="start" />
            <s-button type="submit" variant="primary">
              Get Started
            </s-button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="skip" />
            <s-button type="submit" variant="tertiary">
              Skip for now
            </s-button>
          </Form>
        </s-stack>
      </s-stack>
    </OnboardingShell>
  );
}
