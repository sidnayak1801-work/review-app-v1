import { useEffect, useState } from "react";
import { Form, Link } from "react-router";

import { WidgetPreview } from "../../dashboard/components/WidgetPreview";
import { WidgetSettingsPanel } from "../../dashboard/components/WidgetSettings";
import styles from "../../dashboard/components/reviewtrix/dashboard.module.css";
import { UninstallSurveySection } from "../../uninstall/components/uninstall-survey-section";
import type { WidgetSettingsInput } from "../widget-settings.schema";

interface SettingsPageProps {
  shopDomain: string;
  initialSettings: WidgetSettingsInput;
  actionMessage?: { ok: boolean; message: string; issues?: readonly string[] };
  isSubmitting: boolean;
}

/**
 * Full Settings experience: ReviewTrix card controls + live preview (richer than Home).
 */
export function SettingsPage({
  shopDomain,
  initialSettings,
  actionMessage,
  isSubmitting,
}: SettingsPageProps) {
  const [settings, setSettings] =
    useState<WidgetSettingsInput>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  return (
    <div className={styles.content}>
      <div className={styles.stack}>
      <header className={styles.settingsPageHeader}>
        <div>
          <h1 className={styles.sectionTitle}>Widget settings</h1>
          <p className={styles.body} style={{ marginTop: 8, marginBottom: 0 }}>
            Customize storefront display, preview live, then save to publish.
          </p>
        </div>
        <Link className={styles.viewAllLink} to="/app#widget-settings">
          Edit on Home ↗
        </Link>
      </header>

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
          <strong>Could not save</strong>
          <p style={{ margin: "6px 0 0", color: "inherit" }}>
            {actionMessage.message}
          </p>
          {actionMessage.issues?.length ? (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {actionMessage.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div
        className={`${styles.settingsPageSplit} ${styles.settingsPageSplitFill}`}
      >
        <section
          className={`${styles.card} ${styles.settingsCard}`}
          aria-labelledby="rx-settings-controls-title"
        >
          <div className={styles.cardHeader}>
            <div>
              <h2
                id="rx-settings-controls-title"
                className={styles.sectionTitle}
              >
                Controls
              </h2>
              <p
                className={styles.body}
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                Display, colors, and layout for the storefront widget.
              </p>
            </div>
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
          className={`${styles.card} ${styles.settingsPreviewFill}`}
          aria-labelledby="rx-settings-preview-title"
        >
          <div className={styles.cardHeader}>
            <div>
              <h2
                id="rx-settings-preview-title"
                className={styles.sectionTitle}
              >
                Live preview
              </h2>
              <p
                className={styles.body}
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                Updates as you change controls — save to publish to the
                storefront.
              </p>
            </div>
          </div>
          <WidgetPreview settings={settings} />
        </section>
      </div>

      <section className={styles.card} style={{ padding: 20 }}>
        <h2 className={styles.sectionTitle}>Theme setup</h2>
        <p className={styles.body} style={{ marginTop: 8 }}>
          Online Store → Themes → Customize → add Product Reviews / Star Rating
          blocks to your product template.
        </p>
        <Link
          to="/app"
          className={`${styles.btn} ${styles.btnPrimary}`}
          style={{ display: "inline-flex", marginTop: 12 }}
        >
          Open Home dashboard
        </Link>
      </section>

      <section className={styles.card} style={{ padding: 20 }}>
        <h2 className={styles.sectionTitle}>Support and legal</h2>
        <p className={styles.body} style={{ marginTop: 8 }}>
          Reach us any time after install. Privacy and terms stay available
          outside the embedded admin.
        </p>
        <nav
          className={styles.footerLinks}
          aria-label="Support and legal"
          style={{ marginTop: 12 }}
        >
          <Link to="/app/support">Support</Link>
          <span aria-hidden>·</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy policy
          </a>
          <span aria-hidden>·</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of service
          </a>
        </nav>
      </section>

      <div>
        <UninstallSurveySection shopDomain={shopDomain} />
      </div>
      </div>
    </div>
  );
}
