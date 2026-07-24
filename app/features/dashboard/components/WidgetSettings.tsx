import type { CSSProperties, ReactNode } from "react";

import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import { WidgetPreview } from "./WidgetPreview";

interface WidgetSettingsPanelProps {
  settings: WidgetSettingsInput;
  onChange: (next: WidgetSettingsInput) => void;
  isSubmitting: boolean;
}

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  fontSize: 13,
};

function Group({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <s-box padding="base" border="base" borderRadius="large" background="subdued">
      <s-stack direction="block" gap="base">
        <s-text type="strong">{title}</s-text>
        {children}
      </s-stack>
    </s-box>
  );
}

function ToggleRow({
  field,
  label,
  checked,
  onChange,
}: {
  field: keyof WidgetSettingsInput;
  label: string;
  checked: boolean;
  onChange: (name: keyof WidgetSettingsInput, value: boolean) => void;
}) {
  return (
    <label style={rowStyle}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(field, event.target.checked)}
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
    <s-section heading="Customize widget">
      <s-paragraph>
        Changes preview instantly. Save to publish to your storefront.
      </s-paragraph>
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size > 720px) minmax(0, 1.15fr) minmax(0, 0.85fr), 1fr"
          gap="base"
        >
          <s-grid-item>
        <s-stack direction="block" gap="base">
          <Group title="Display">
            <ToggleRow
              field="widgetEnabled"
              label="Widget enabled"
              checked={settings.widgetEnabled}
              onChange={setBool}
            />
            <ToggleRow
              field="showReviewForm"
              label="Show review form"
              checked={settings.showReviewForm}
              onChange={setBool}
            />
            <ToggleRow
              field="showCustomerName"
              label="Show customer name"
              checked={settings.showCustomerName}
              onChange={setBool}
            />
            <ToggleRow
              field="showReviewDate"
              label="Show review date"
              checked={settings.showReviewDate}
              onChange={setBool}
            />
            <ToggleRow
              field="showProductImages"
              label="Show product images"
              checked={settings.showProductImages}
              onChange={setBool}
            />
            <ToggleRow
              field="showCustomerPhotos"
              label="Show customer photos"
              checked={settings.showCustomerPhotos}
              onChange={setBool}
            />
            <label style={fieldStyle}>
              Reviews per page
              <select
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
          </Group>

          <Group title="Colors & style">
            <label style={fieldStyle}>
              Accent color
              <input
                type="color"
                value={settings.accentColor}
                onChange={(event) =>
                  onChange({ ...settings, accentColor: event.target.value })
                }
                aria-label="Accent color"
              />
            </label>
            <label style={fieldStyle}>
              Primary button color
              <input
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
            <label style={fieldStyle}>
              Star color
              <input
                type="color"
                value={settings.starColor}
                onChange={(event) =>
                  onChange({ ...settings, starColor: event.target.value })
                }
                aria-label="Star color"
              />
            </label>
            <label style={fieldStyle}>
              Border radius ({settings.borderRadius}px)
              <input
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
              field="cardShadow"
              label="Card shadow"
              checked={settings.cardShadow}
              onChange={setBool}
            />
            <ToggleRow
              field="darkMode"
              label="Dark mode"
              checked={settings.darkMode}
              onChange={setBool}
            />
          </Group>

          <Group title="Layout & behavior">
            <label style={fieldStyle}>
              Widget layout
              <select
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
              field="autoPublishReviews"
              label="Auto publish reviews"
              checked={settings.autoPublishReviews}
              onChange={setBool}
            />
          </Group>

          <s-button type="submit" variant="primary" disabled={isSubmitting}>
            Save widget settings
          </s-button>
        </s-stack>
          </s-grid-item>

          <s-grid-item>
            <WidgetPreview settings={settings} />
          </s-grid-item>
        </s-grid>
      </s-query-container>
    </s-section>
  );
}
