import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import styles from "./reviewx/dashboard.module.css";

interface WidgetSettingsPanelProps {
  settings: WidgetSettingsInput;
  onChange: (next: WidgetSettingsInput) => void;
  isSubmitting: boolean;
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.settingsToggle}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
    </label>
  );
}

export function WidgetSettingsPanel({
  settings,
  onChange,
  isSubmitting,
}: WidgetSettingsPanelProps) {
  function setBool(name: keyof WidgetSettingsInput, value: boolean) {
    onChange({ ...settings, [name]: value });
  }

  return (
    <div className={styles.settingsBody}>
      <div className={styles.settingsGrid}>
        <div className={styles.settingsGroup}>
          <h3 className={styles.settingsGroupTitle}>Display</h3>
          <ToggleRow
            label="Widget enabled"
            checked={settings.widgetEnabled}
            onChange={(v) => setBool("widgetEnabled", v)}
          />
          <ToggleRow
            label="Show review form"
            checked={settings.showReviewForm}
            onChange={(v) => setBool("showReviewForm", v)}
          />
          <ToggleRow
            label="Show customer name"
            checked={settings.showCustomerName}
            onChange={(v) => setBool("showCustomerName", v)}
          />
          <ToggleRow
            label="Show review date"
            checked={settings.showReviewDate}
            onChange={(v) => setBool("showReviewDate", v)}
          />
          <ToggleRow
            label="Show product images"
            checked={settings.showProductImages}
            onChange={(v) => setBool("showProductImages", v)}
          />
          <ToggleRow
            label="Show customer photos"
            checked={settings.showCustomerPhotos}
            onChange={(v) => setBool("showCustomerPhotos", v)}
          />
          <label className={styles.settingsField}>
            Reviews per page
            <select
              className={styles.settingsControl}
              value={settings.reviewsPerPage}
              onChange={(event) =>
                onChange({
                  ...settings,
                  reviewsPerPage: Number(event.target.value),
                })
              }
              aria-label="Reviews per page"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        <div className={styles.settingsGroup}>
          <h3 className={styles.settingsGroupTitle}>Colors & style</h3>
          <label className={styles.settingsField}>
            Accent color
            <input
              className={styles.settingsColor}
              type="color"
              value={settings.accentColor}
              onChange={(event) =>
                onChange({ ...settings, accentColor: event.target.value })
              }
              aria-label="Accent color"
            />
          </label>
          <label className={styles.settingsField}>
            Primary button
            <input
              className={styles.settingsColor}
              type="color"
              value={settings.primaryButtonColor}
              onChange={(event) =>
                onChange({
                  ...settings,
                  primaryButtonColor: event.target.value,
                })
              }
              aria-label="Primary button color"
            />
          </label>
          <label className={styles.settingsField}>
            Star color
            <input
              className={styles.settingsColor}
              type="color"
              value={settings.starColor}
              onChange={(event) =>
                onChange({ ...settings, starColor: event.target.value })
              }
              aria-label="Star color"
            />
          </label>
          <label className={styles.settingsField}>
            Border radius ({settings.borderRadius}px)
            <input
              className={styles.settingsRange}
              type="range"
              min={0}
              max={20}
              value={settings.borderRadius}
              onChange={(event) =>
                onChange({
                  ...settings,
                  borderRadius: Number(event.target.value),
                })
              }
              aria-label="Border radius"
            />
          </label>
          <ToggleRow
            label="Card shadow"
            checked={settings.cardShadow}
            onChange={(v) => setBool("cardShadow", v)}
          />
          <ToggleRow
            label="Dark mode"
            checked={settings.darkMode}
            onChange={(v) => setBool("darkMode", v)}
          />
        </div>

        <div className={styles.settingsGroup}>
          <h3 className={styles.settingsGroupTitle}>Layout & behavior</h3>
          <label className={styles.settingsField}>
            Widget layout
            <select
              className={styles.settingsControl}
              value={settings.layout}
              onChange={(event) =>
                onChange({
                  ...settings,
                  layout: event.target.value as WidgetSettingsInput["layout"],
                })
              }
              aria-label="Widget layout"
            >
              <option value="STACKED">Stacked</option>
              <option value="COMPACT">Compact</option>
              <option value="GRID">Grid</option>
              <option value="CAROUSEL" disabled>
                Carousel (coming soon)
              </option>
            </select>
          </label>
          <ToggleRow
            label="Auto publish reviews"
            checked={settings.autoPublishReviews}
            onChange={(v) => setBool("autoPublishReviews", v)}
          />
        </div>
      </div>

      <div className={styles.settingsActions}>
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving…" : "Save widget settings"}
        </button>
      </div>
    </div>
  );
}
