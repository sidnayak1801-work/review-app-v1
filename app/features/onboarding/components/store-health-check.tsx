import { Form } from "react-router";

import { OnboardingShell } from "./onboarding-shell";

export type StoreHealthSnapshot = {
  shopDomain: string;
  planLabel: string;
  themeName: string | null;
  scopesOk: boolean;
};

type StoreHealthCheckProps = {
  health: StoreHealthSnapshot;
};

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <s-stack
      direction="inline"
      gap="base"
      justifyContent="space-between"
      alignItems="center"
    >
      <s-text color="subdued">{label}</s-text>
      <s-text type="strong">{value}</s-text>
    </s-stack>
  );
}

export function StoreHealthCheck({ health }: StoreHealthCheckProps) {
  return (
    <OnboardingShell
      title="Checking your store"
      subtitle="We’re making sure ReviewTrix can launch cleanly on your Shopify store."
    >
      <s-box
        padding="base"
        border="base"
        borderRadius="large"
        background="subdued"
      >
        <s-stack direction="block" gap="base">
          <HealthRow label="Store" value={health.shopDomain} />
          <HealthRow label="Plan" value={health.planLabel} />
          <HealthRow label="Theme" value={health.themeName ?? "Detected"} />
          <HealthRow
            label="App access"
            value={health.scopesOk ? "Ready" : "Limited"}
          />
        </s-stack>
      </s-box>

      {health.scopesOk ? (
        <s-banner tone="success" heading="Store looks healthy">
          Continue to the launch checklist.
        </s-banner>
      ) : (
        <s-banner tone="warning" heading="Permissions may be incomplete">
          You can continue — we’ll guide you through theme setup next.
        </s-banner>
      )}

      <Form method="post">
        <input type="hidden" name="intent" value="continue-checklist" />
        <s-button type="submit" variant="primary">
          Continue to checklist
        </s-button>
      </Form>
    </OnboardingShell>
  );
}
