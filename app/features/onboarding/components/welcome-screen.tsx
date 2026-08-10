import { Form } from "react-router";

import { OnboardingSampleReview } from "./onboarding-sample-review";
import { OnboardingShell } from "./onboarding-shell";

type WelcomeScreenProps = {
  shopDomain: string;
};

export function WelcomeScreen({ shopDomain }: WelcomeScreenProps) {
  return (
    <OnboardingShell title={null}>
      <s-stack direction="block" gap="large" alignItems="center">
        <s-stack direction="block" gap="small" alignItems="center">
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
        <div><h2>Live preview</h2></div>
        <OnboardingSampleReview />

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
