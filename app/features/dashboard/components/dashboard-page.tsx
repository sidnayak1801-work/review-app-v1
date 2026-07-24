import { useEffect, useState } from "react";
import { Form } from "react-router";

import type { ActivityFeedItem } from "../dashboard.activity";
import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import { ActivityFeed } from "./ActivityFeed";
import { QuickActions } from "./QuickActions";
import { RecentReviews } from "./RecentReviews";
import { SetupGuide, isWidgetCustomized } from "./SetupGuide";
import { StatsCards, type DashboardStats } from "./StatsCards";
import { WidgetSettingsPanel } from "./WidgetSettings";

const WELCOME_DISMISS_KEY = "vouch.welcome.dismissed";

interface DashboardPageProps {
  stats: DashboardStats;
  recentReviews: Array<{
    id: string;
    authorName: string;
    rating: number;
    shopifyProductId: string;
    productTitle?: string | null;
    status: string;
    createdAt: string;
  }>;
  activity: ActivityFeedItem[];
  settings: WidgetSettingsInput;
  hasReviewRequestActivity: boolean;
  actionMessage?: { ok: boolean; message: string };
  isSubmitting: boolean;
}

export function DashboardPage({
  stats,
  recentReviews,
  activity,
  settings: initialSettings,
  hasReviewRequestActivity,
  actionMessage,
  isSubmitting,
}: DashboardPageProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    setWelcomeDismissed(
      window.localStorage.getItem(WELCOME_DISMISS_KEY) === "1",
    );
  }, []);

  const widgetCustomized = isWidgetCustomized(settings);
  const setupLikelyIncomplete =
    !widgetCustomized ||
    stats.totalReviews === 0 ||
    stats.pendingReviews > 0 ||
    !hasReviewRequestActivity;

  function dismissWelcome() {
    window.localStorage.setItem(WELCOME_DISMISS_KEY, "1");
    setWelcomeDismissed(true);
  }

  return (
    <s-page heading="Review App">
      <s-stack direction="block" gap="large">
        <s-box padding="base" border="base" borderRadius="large" background="subdued">
          <s-stack direction="block" gap="small-200">
            <s-heading>Build trust with product reviews</s-heading>
            <s-text color="subdued">
              Moderate feedback, customize your storefront widget, and grow
              reviews with post-purchase emails — all in one place.
            </s-text>
          </s-stack>
        </s-box>

        {actionMessage ? (
          <s-banner
            heading={actionMessage.ok ? "Saved" : "Could not save"}
            tone={actionMessage.ok ? "success" : "critical"}
          >
            {actionMessage.message}
          </s-banner>
        ) : null}

        {stats.pendingReviews > 0 ? (
          <s-banner
            heading={`${stats.pendingReviews} review${stats.pendingReviews === 1 ? "" : "s"} need moderation`}
            tone="warning"
          >
            <s-stack direction="block" gap="small">
              <s-text>
                Publish great feedback and hide spam before it reaches your storefront.
              </s-text>
              <s-button href="/app/reviews?status=PENDING" variant="primary">
                Review pending queue
              </s-button>
            </s-stack>
          </s-banner>
        ) : null}

        {!welcomeDismissed &&
        stats.pendingReviews === 0 &&
        setupLikelyIncomplete ? (
          <s-banner heading="Welcome — finish your setup guide" tone="info">
            <s-stack direction="block" gap="small">
              <s-text>
                Install the widget, customize branding, and turn on review
                requests to start collecting social proof.
              </s-text>
              <s-stack direction="inline" gap="small">
                <s-button href="#setup-guide" variant="primary">
                  View setup guide
                </s-button>
                <s-button type="button" variant="tertiary" onClick={dismissWelcome}>
                  Dismiss
                </s-button>
              </s-stack>
            </s-stack>
          </s-banner>
        ) : null}

        <div id="setup-guide">
          <SetupGuide
            stats={stats}
            hasReviewRequestActivity={hasReviewRequestActivity}
            widgetCustomized={widgetCustomized}
          />
        </div>

        <StatsCards stats={stats} />
        <QuickActions />
        <RecentReviews reviews={recentReviews} />

        <div id="widget-settings">
          <Form method="post">
            <input type="hidden" name="intent" value="saveWidgetSettings" />
            <input
              type="hidden"
              name="widgetEnabled"
              value={settings.widgetEnabled ? "true" : "false"}
            />
            <input type="hidden" name="accentColor" value={settings.accentColor} />
            <input
              type="hidden"
              name="primaryButtonColor"
              value={settings.primaryButtonColor}
            />
            <input type="hidden" name="starColor" value={settings.starColor} />
            <input
              type="hidden"
              name="borderRadius"
              value={String(settings.borderRadius)}
            />
            <input
              type="hidden"
              name="cardShadow"
              value={settings.cardShadow ? "true" : "false"}
            />
            <input type="hidden" name="layout" value={settings.layout} />
            <input
              type="hidden"
              name="showCustomerName"
              value={settings.showCustomerName ? "true" : "false"}
            />
            <input
              type="hidden"
              name="showReviewDate"
              value={settings.showReviewDate ? "true" : "false"}
            />
            <input
              type="hidden"
              name="showProductImages"
              value={settings.showProductImages ? "true" : "false"}
            />
            <input
              type="hidden"
              name="showCustomerPhotos"
              value={settings.showCustomerPhotos ? "true" : "false"}
            />
            <input
              type="hidden"
              name="autoPublishReviews"
              value={settings.autoPublishReviews ? "true" : "false"}
            />
            <input
              type="hidden"
              name="darkMode"
              value={settings.darkMode ? "true" : "false"}
            />
            <input
              type="hidden"
              name="showReviewForm"
              value={settings.showReviewForm ? "true" : "false"}
            />
            <input
              type="hidden"
              name="reviewsPerPage"
              value={String(settings.reviewsPerPage)}
            />
            <WidgetSettingsPanel
              settings={settings}
              onChange={setSettings}
              isSubmitting={isSubmitting}
            />
          </Form>
        </div>

        <ActivityFeed items={activity} />
      </s-stack>
    </s-page>
  );
}
