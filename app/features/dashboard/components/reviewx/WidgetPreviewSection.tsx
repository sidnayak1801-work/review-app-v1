import { WidgetPreview } from "../WidgetPreview";
import type { WidgetSettingsInput } from "../../../widget-settings/widget-settings.schema";
import styles from "./dashboard.module.css";

interface WidgetPreviewSectionProps {
  settings: WidgetSettingsInput;
}

/** Live storefront preview at the end of the dashboard */
export function WidgetPreviewSection({ settings }: WidgetPreviewSectionProps) {
  return (
    <section
      id="widget-preview"
      className={styles.card}
      aria-labelledby="rx-widget-title"
    >
      <div className={styles.cardHeader}>
        <div>
          <h2 id="rx-widget-title" className={styles.sectionTitle}>
            Live preview
          </h2>
          <p className={styles.body} style={{ marginTop: 8, marginBottom: 0 }}>
            How customers see ratings, featured reviews, photos, and store
            replies.
          </p>
        </div>
        <a
          className={`${styles.btn} ${styles.btnPrimary}`}
          href="/app#widget-settings"
        >
          Customize Widget
        </a>
      </div>
      <WidgetPreview settings={settings} />
    </section>
  );
}
