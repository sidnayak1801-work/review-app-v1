import { Link } from "react-router";

import type { OnboardingPublicStatus } from "../onboarding.types";
import { OnboardingShell } from "./onboarding-shell";
import { ProgressRing } from "./progress-ring";

type LaunchChecklistProps = {
  status: OnboardingPublicStatus;
  search: string;
};

type ChecklistItem = {
  id: "theme" | "automation" | "import" | "branding";
  title: string;
  description: string;
  badge: string;
  badgeTone: "critical" | "warning" | "info" | "success";
  cta: string;
  done: boolean;
};

export function LaunchChecklist({ status, search }: LaunchChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: "theme",
      title: "Show reviews on your storefront",
      description:
        "Enable the ReviewTrix theme app extension so customers see ratings and reviews.",
      badge: status.themeEnabled ? "Completed" : "Required",
      badgeTone: status.themeEnabled ? "success" : "critical",
      cta: "Enable",
      done: status.themeEnabled,
    },
    {
      id: "automation",
      title: "Collect reviews automatically",
      description:
        "Send post-fulfillment review requests with sensible defaults.",
      badge: status.automationConfigured ? "Completed" : "Recommended",
      badgeTone: status.automationConfigured ? "success" : "warning",
      cta: "Configure",
      done: status.automationConfigured,
    },
    {
      id: "import",
      title: "Import existing reviews",
      description:
        "Bring reviews from CSV exports so your storefront isn’t empty.",
      badge: status.reviewsImported ? "Completed" : "Optional",
      badgeTone: status.reviewsImported ? "success" : "info",
      cta: "Import",
      done: status.reviewsImported,
    },
    {
      id: "branding",
      title: "Personalize review widgets",
      description: "Match accent color and style to your brand.",
      badge: status.brandingConfigured ? "Completed" : "Optional",
      badgeTone: status.brandingConfigured ? "success" : "info",
      cta: "Customize",
      done: status.brandingConfigured,
    },
  ];

  return (
    <OnboardingShell
      title="You're almost ready"
      subtitle="Complete a few quick tasks to start collecting and displaying authentic customer reviews."
    >
      <ProgressRing progress={status.progress} />

      <s-stack direction="block" gap="base">
        {items.map((item) => (
          <s-box
            key={item.id}
            padding="base"
            border="base"
            borderRadius="large"
            background="base"
          >
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-heading>
                  {item.done ? "✓ " : ""}
                  {item.title}
                </s-heading>
                <s-badge tone={item.badgeTone}>{item.badge}</s-badge>
              </s-stack>
              <s-text color="subdued">{item.description}</s-text>
              {!item.done ? (
                <Link to={`/app/onboarding?screen=${item.id}${search}`}>
                  <s-button variant="primary">{item.cta}</s-button>
                </Link>
              ) : (
                <s-text>Detected automatically — nice work.</s-text>
              )}
            </s-stack>
          </s-box>
        ))}
      </s-stack>

      {status.themeEnabled ? (
        <Link to={`/app/onboarding?screen=celebration${search}`}>
          <s-button variant="primary">Finish setup</s-button>
        </Link>
      ) : (
        <s-text color="subdued">
          Enable storefront reviews to unlock the celebration screen.
        </s-text>
      )}
    </OnboardingShell>
  );
}
