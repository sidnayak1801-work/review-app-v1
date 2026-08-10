import { useEffect, useState } from "react";
import { Form, Link } from "react-router";

import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import { AnalyticsSnapshot } from "./reviewtrix/AnalyticsSnapshot";
import { DashboardFooter } from "./reviewtrix/DashboardFooter";
import { DashboardLayout } from "./reviewtrix/DashboardLayout";
import { KPIGrid } from "./reviewtrix/KPIGrid";
import { LatestReviewsTable } from "./reviewtrix/LatestReviewsTable";
import { PendingModerationCard } from "./reviewtrix/PendingModerationCard";
import { QuickActions } from "./reviewtrix/QuickActions";
import { RatingDistribution } from "./reviewtrix/RatingDistribution";
import { ReviewsChart } from "./reviewtrix/ReviewsChart";
import type { ReviewTrixDashboardData } from "./reviewtrix/types";
import {
  isFreshAfterOnboarding,
  WelcomeSection,
} from "./reviewtrix/WelcomeSection";
import { WidgetPreview } from "./WidgetPreview";
import { WidgetSettingsPanel } from "./WidgetSettings";
import styles from "./reviewtrix/dashboard.module.css";

interface DashboardPageProps {
  data: ReviewTrixDashboardData;
  actionMessage?: { ok: boolean; message: string };
  isSubmitting: boolean;
  onboardingReminder?: {
    themeEnabled: boolean;
    reviewsImported: boolean;
    automationConfigured: boolean;
    brandingConfigured: boolean;
    completed: boolean;
    skipped: boolean;
    completedAt: string | null;
    progress: number;
  } | null;
}

/**
 * Spec section order (docs/15_DASHBOARD_UI_SPEC.md):
 * Welcome → KPI → Chart/Rating → Pending/Latest → Quick actions →
 * Analytics → Widget settings + Live preview → Footer
 */
export function DashboardPage({
  data,
  actionMessage,
  isSubmitting,
  onboardingReminder = null,
}: DashboardPageProps) {
  const [settings, setSettings] = useState<WidgetSettingsInput>(data.settings);

  useEffect(() => {
    setSettings(data.settings);
  }, [data.settings]);

  const showSetupComplete = Boolean(onboardingReminder?.completed);
  const showReminders =
    onboardingReminder &&
    (onboardingReminder.skipped || onboardingReminder.completed) &&
    (!onboardingReminder.themeEnabled ||
      !onboardingReminder.automationConfigured ||
      !onboardingReminder.reviewsImported ||
      !onboardingReminder.brandingConfigured);
  const freshWelcome = isFreshAfterOnboarding(onboardingReminder);

  return (
    <DashboardLayout>
      {actionMessage && !actionMessage.ok ? (
        <div
          role="status"
          className={styles.card}
          style={{
            padding: 16,
            borderColor: "rgba(215,44,13,0.35)",
            color: "var(--rx-danger)",
          }}
        >
          {actionMessage.message}
        </div>
      ) : null}

      {showSetupComplete ? (
        <div className={styles.card} style={{ padding: 16 }} role="status">
          <strong>Setup complete.</strong> Everything is ready — ReviewTrix is
          collecting and displaying reviews.
        </div>
      ) : null}

      {showReminders ? (
        <div className={styles.card} style={{ padding: 16 }} role="status">
          <strong>Finish setup</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {!onboardingReminder.themeEnabled ? (
              <li>
                Show reviews on your storefront —{" "}
                <Link to="/app/onboarding?screen=theme">enable theme embed</Link>
                .
              </li>
            ) : null}
            {!onboardingReminder.automationConfigured ? (
              <li>
                Collect reviews automatically —{" "}
                <Link to="/app/review-requests">configure emails</Link>.
              </li>
            ) : null}
            {!onboardingReminder.reviewsImported ? (
              <li>
                Import existing reviews —{" "}
                <Link to="/app/imports">open Imports</Link>.
              </li>
            ) : null}
            {!onboardingReminder.brandingConfigured ? (
              <li>
                Personalize widgets —{" "}
                <Link to="/app/settings">open Settings</Link>.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <WelcomeSection isFreshAfterOnboarding={freshWelcome} />
      <KPIGrid kpis={data.kpis} />
      <div className={styles.split}>
        <ReviewsChart seriesByRange={data.chartSeriesByRange} />
        <RatingDistribution summary={data.ratingSummary} />
      </div>
      <div className={styles.splitModeration}>
        <PendingModerationCard reviews={data.pendingReviews} />
        <LatestReviewsTable reviews={data.latestReviews} searchFilter="" />
      </div>
      <QuickActions />
      <AnalyticsSnapshot data={data.analytics} />

      <div
        className={`${styles.settingsPageSplit} ${styles.settingsPageSplitFill}`}
      >
        <section
          id="widget-settings"
          className={`${styles.card} ${styles.settingsCard}`}
          aria-labelledby="rx-widget-settings-title"
        >
          <div className={styles.cardHeader}>
            <div>
              <h2 id="rx-widget-settings-title" className={styles.sectionTitle}>
                Widget settings
              </h2>
              <p
                className={styles.body}
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                Changes update the preview instantly. Save to publish.
              </p>
            </div>
            <Link className={styles.viewAllLink} to="/app/settings">
              Full settings ↗
            </Link>
          </div>
          <Form method="post">
            <input type="hidden" name="intent" value="saveWidgetSettings" />
            <input
              type="hidden"
              name="widgetEnabled"
              value={settings.widgetEnabled ? "true" : "false"}
            />
            <input
              type="hidden"
              name="accentColor"
              value={settings.accentColor}
            />
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
        </section>

        <section
          id="widget-preview"
          className={`${styles.card} ${styles.settingsPreviewFill}`}
          aria-labelledby="rx-widget-preview-title"
        >
          <div className={styles.cardHeader}>
            <div>
              <h2 id="rx-widget-preview-title" className={styles.sectionTitle}>
                Live preview
              </h2>
              <p
                className={styles.body}
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                How customers see ratings, featured reviews, photos, and store
                replies.
              </p>
            </div>
          </div>
          <WidgetPreview settings={settings} />
        </section>
      </div>

      <DashboardFooter />
    </DashboardLayout>
  );
}
