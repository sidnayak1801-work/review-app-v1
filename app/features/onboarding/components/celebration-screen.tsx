import { useEffect, useState } from "react";
import { Form, Link } from "react-router";

import type { OnboardingPublicStatus } from "../onboarding.types";
import { OnboardingShell } from "./onboarding-shell";

type CelebrationScreenProps = {
  status: OnboardingPublicStatus;
  storeUrl: string;
  search: string;
};

export function CelebrationScreen({
  status,
  storeUrl,
  search,
}: CelebrationScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setShowConfetti(false), 2000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <OnboardingShell>
      <s-stack direction="block" gap="large" alignItems="center">
        {showConfetti ? (
          <div aria-hidden style={{ fontSize: 40, lineHeight: 1 }}>
            🎉
          </div>
        ) : null}
        <h1
          style={{
            margin: 0,
            textAlign: "center",
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            fontWeight: 650,
            letterSpacing: "-0.03em",
          }}
        >
          Your store is ready!
        </h1>
        <s-stack direction="block" gap="small-200" alignItems="center">
          {status.themeEnabled ? (
            <s-text>✓ Storefront reviews enabled</s-text>
          ) : null}
          <s-text>
            {status.automationConfigured
              ? "✓ Review requests configured"
              : "○ Automation can be finished anytime"}
          </s-text>
          <s-text>
            {status.reviewsImported
              ? "✓ Reviews imported"
              : "○ Import reviews anytime from Imports"}
          </s-text>
          <s-text>
            {status.brandingConfigured
              ? "✓ Widgets personalized"
              : "○ Branding can be tuned in Settings"}
          </s-text>
        </s-stack>

        <s-stack direction="inline" gap="base">
          <Form method="post">
            <input type="hidden" name="intent" value="complete" />
            <s-button type="submit" variant="primary">
              Go to Dashboard
            </s-button>
          </Form>
          <s-button href={storeUrl} target="_blank">
            View Store
          </s-button>
        </s-stack>

        <Link to={`/app/onboarding?screen=checklist${search}`}>
          <s-button variant="tertiary">Back to checklist</s-button>
        </Link>
      </s-stack>
    </OnboardingShell>
  );
}
