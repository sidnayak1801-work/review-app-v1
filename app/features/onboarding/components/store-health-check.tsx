import { Form } from "react-router";

import { OnboardingShell } from "./onboarding-shell";

export type OnboardingThemeOption = {
  id: string;
  name: string;
  role: string;
  isLive: boolean;
};

export type StoreHealthSnapshot = {
  shopDomain: string;
  planLabel: string;
  themes: OnboardingThemeOption[];
  selectedThemeId: string | null;
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
  const defaultThemeId =
    health.selectedThemeId ??
    health.themes.find((theme) => theme.isLive)?.id ??
    health.themes[0]?.id ??
    "";

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
          <HealthRow
            label="App access"
            value={health.scopesOk ? "Ready" : "Limited"}
          />
        </s-stack>
      </s-box>

      <s-stack direction="block" gap="small">
        <s-text type="strong">Theme to configure</s-text>
        <s-text color="subdued">
          Choose which installed theme ReviewTrix should set up. Widgets appear
          on your live theme; if you pick an unpublished theme, publish it in
          Shopify Themes after enabling the embed.
        </s-text>

        {health.themes.length === 0 ? (
          <s-banner tone="info" heading="Themes unavailable">
            We couldn’t list themes right now. You can continue — Theme Editor
            will open the live theme.
          </s-banner>
        ) : null}
      </s-stack>

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
        {health.themes.length > 0 ? (
          <s-stack direction="block" gap="small">
            {health.themes.map((theme) => (
              <label
                key={theme.id}
                style={{
                  display: "block",
                  cursor: "pointer",
                }}
              >
                <s-box
                  padding="base"
                  border="base"
                  borderRadius="large"
                  background="base"
                >
                  <s-stack
                    direction="inline"
                    gap="base"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <s-stack
                      direction="inline"
                      gap="base"
                      alignItems="center"
                    >
                      <input
                        type="radio"
                        name="selectedThemeId"
                        value={theme.id}
                        defaultChecked={theme.id === defaultThemeId}
                        required
                      />
                      <s-text type="strong">{theme.name}</s-text>
                    </s-stack>
                    {theme.isLive ? (
                      <s-badge tone="success">Live</s-badge>
                    ) : null}
                  </s-stack>
                </s-box>
              </label>
            ))}
          </s-stack>
        ) : null}
        {/* Name for the selected id — resolved on the server from this map. */}
        {health.themes.map((theme) => (
          <input
            key={`name-${theme.id}`}
            type="hidden"
            name={`themeName:${theme.id}`}
            value={theme.name}
          />
        ))}
        <s-box paddingBlockStart="base">
          <s-button type="submit" variant="primary">
            Continue to checklist
          </s-button>
        </s-box>
      </Form>
    </OnboardingShell>
  );
}
