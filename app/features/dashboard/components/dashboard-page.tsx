import { useEffect, useState } from "react";
import { Form, Link } from "react-router";

import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import { AnalyticsSnapshot } from "./reviewx/AnalyticsSnapshot";
import { DashboardFooter } from "./reviewx/DashboardFooter";
import { DashboardLayout } from "./reviewx/DashboardLayout";
import { KPIGrid } from "./reviewx/KPIGrid";
import { LatestReviewsTable } from "./reviewx/LatestReviewsTable";
import { PendingModerationCard } from "./reviewx/PendingModerationCard";
import { QuickActions } from "./reviewx/QuickActions";
import { RatingDistribution } from "./reviewx/RatingDistribution";
import { ReviewsChart } from "./reviewx/ReviewsChart";
import type { ReviewXDashboardData } from "./reviewx/types";
import { WelcomeSection } from "./reviewx/WelcomeSection";
import { WidgetPreview } from "./WidgetPreview";
import { WidgetSettingsPanel } from "./WidgetSettings";
import styles from "./reviewx/dashboard.module.css";

interface DashboardPageProps {
  data: ReviewXDashboardData;
  actionMessage?: { ok: boolean; message: string };
  isSubmitting: boolean;
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
}: DashboardPageProps) {
  const [settings, setSettings] = useState<WidgetSettingsInput>(data.settings);

  useEffect(() => {
    setSettings(data.settings);
  }, [data.settings]);

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

      <WelcomeSection />
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
