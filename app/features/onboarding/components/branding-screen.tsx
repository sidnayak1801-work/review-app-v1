import { useState } from "react";
import { Form, Link } from "react-router";

import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import { OnboardingShell } from "./onboarding-shell";

const PRESETS = [
  { label: "Match store", value: "#111111" },
  { label: "Green", value: "#0F9D7A" },
  { label: "Blue", value: "#2563EB" },
  { label: "Purple", value: "#7C3AED" },
  { label: "Black", value: "#0A0A0A" },
] as const;

type BrandingScreenProps = {
  search: string;
  settings: WidgetSettingsInput;
  message?: string;
  ok?: boolean;
};

export function BrandingScreen({
  search,
  settings,
  message,
  ok,
}: BrandingScreenProps) {
  const [accent, setAccent] = useState(settings.accentColor || "#0F9D7A");
  const [radius, setRadius] = useState(settings.borderRadius ?? 8);

  return (
    <OnboardingShell
      title="Personalize review widgets"
      subtitle="Pick an accent and corner style. You can refine everything later in Settings."
    >
      <Form method="post">
        <s-stack direction="block" gap="base">
          <input type="hidden" name="intent" value="save-branding" />
          <input type="hidden" name="accentColor" value={accent} />
          <input type="hidden" name="borderRadius" value={String(radius)} />
          <input
            type="hidden"
            name="primaryButtonColor"
            value={settings.primaryButtonColor}
          />
          <input type="hidden" name="starColor" value={accent} />
          <input type="hidden" name="layout" value={settings.layout} />

          <s-text type="strong">Accent color</s-text>
          <s-stack direction="inline" gap="small">
            {PRESETS.map((preset) => (
              <s-button
                key={preset.value}
                type="button"
                variant={
                  accent.toLowerCase() === preset.value.toLowerCase()
                    ? "primary"
                    : "secondary"
                }
                onClick={() => setAccent(preset.value)}
              >
                {preset.label}
              </s-button>
            ))}
          </s-stack>

          <s-text-field
            label="Custom hex"
            autocomplete="off"
            value={accent}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              setAccent(target.value);
            }}
          />

          <label>
            <s-text>Corner radius ({radius}px)</s-text>
            <input
              type="range"
              min={0}
              max={20}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              aria-label="Corner radius"
              style={{ width: "100%", marginTop: 8 }}
            />
          </label>

          <s-box
            padding="base"
            border="base"
            borderRadius="large"
            background="base"
          >
            <div
              style={{
                borderRadius: radius,
                border: `1px solid ${accent}33`,
                padding: "1rem",
                background: "#fff",
              }}
            >
              <s-stack direction="block" gap="small-200">
                <s-text type="strong">★★★★★ Preview card</s-text>
                <s-text color="subdued">
                  Accent and corners update live.
                </s-text>
                <div style={{ marginTop: 12 }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: accent,
                      color: "#fff",
                      borderRadius: Math.max(4, radius / 2),
                      padding: "6px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Write a review
                  </span>
                </div>
              </s-stack>
            </div>
          </s-box>

          <s-button type="submit" variant="primary">
            Save branding
          </s-button>
        </s-stack>
      </Form>

      <Form method="post">
        <input type="hidden" name="intent" value="skip-optional" />
        <input type="hidden" name="task" value="branding" />
        <s-button type="submit">Skip for now</s-button>
      </Form>

      {message ? (
        <s-banner
          tone={ok ? "success" : "warning"}
          heading={ok ? "Saved" : "Could not save"}
        >
          {message}
        </s-banner>
      ) : null}

      <Link to={`/app/onboarding?screen=checklist${search}`}>
        <s-button>Back to checklist</s-button>
      </Link>
    </OnboardingShell>
  );
}
