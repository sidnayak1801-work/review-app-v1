import { Form, Link, useNavigation } from "react-router";
import { useEffect, useId, useRef, useState } from "react";

import type { OnboardingPublicStatus } from "../onboarding.types";
import { ONBOARDING_WIDGET_OPTIONS } from "../onboarding-widgets";

export type OnboardingStep =
  | "welcome"
  | "theme"
  | "widget"
  | "import"
  | "email"
  | "finish";

type OnboardingPageProps = {
  status: OnboardingPublicStatus;
  shopDomain: string;
  shopPlan: "FREE" | "PRO";
  themeEditorUrl: string;
  storeUrl: string;
  widgetEditorUrls: Record<string, string>;
  settings: {
    requestDelayDays: number;
    reminderEnabled: boolean;
    reminderDelayDays: number;
    emailSubject: string;
  };
  actionData?: {
    ok: boolean;
    message?: string;
    status?: OnboardingPublicStatus;
    issues?: readonly string[];
  };
  proTrialDays: number;
  proMonthlyPrice: number;
};

function progressCount(status: OnboardingPublicStatus): number {
  return [
    status.themeEnabled,
    status.widgetAdded,
    status.reviewsImported,
    status.emailConfigured,
    status.completed,
  ].filter(Boolean).length;
}

function resolveStep(status: OnboardingPublicStatus): OnboardingStep {
  if (status.currentStep <= 0) return "welcome";
  if (!status.themeEnabled && status.currentStep <= 1) return "theme";
  if (status.currentStep === 1) return "theme";
  if (status.currentStep === 2) return "widget";
  if (status.currentStep === 3) return "import";
  if (status.currentStep === 4) return "email";
  return "finish";
}

function StepProgress({
  status,
  stepLabel,
}: {
  status: OnboardingPublicStatus;
  stepLabel: string;
}) {
  const done = Math.min(progressCount(status), 5);
  const pct = Math.round((done / 5) * 100);
  return (
    <s-box padding="base" border="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-text type="strong">Setup Progress</s-text>
          <s-badge>{done} / 5 completed</s-badge>
          <s-text tone="neutral">{stepLabel}</s-text>
        </s-stack>
        <div
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-label="Onboarding progress"
          style={{
            height: 8,
            borderRadius: 999,
            background: "rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "#008060",
              transition: "width 200ms ease",
            }}
          />
        </div>
      </s-stack>
    </s-box>
  );
}

export function OnboardingPage(props: OnboardingPageProps) {
  const {
    status,
    shopDomain,
    shopPlan,
    themeEditorUrl,
    storeUrl,
    widgetEditorUrls,
    settings,
    actionData,
    proTrialDays,
    proMonthlyPrice,
  } = props;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const headingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const statusNow = actionData?.status ?? status;
  const step = resolveStep(statusNow);
  const formId = useId();

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (actionData?.message && liveRef.current) {
      liveRef.current.textContent = actionData.message;
    }
  }, [actionData?.message]);

  return (
    <s-page heading="Onboarding" inlineSize="base">
      <div
        ref={liveRef}
        aria-live="polite"
        className="visually-hidden"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
        }}
      />
      <s-stack direction="block" gap="large">
        {step !== "welcome" ? (
          <StepProgress
            status={statusNow}
            stepLabel={
              step === "theme"
                ? "Step 1 · Theme"
                : step === "widget"
                  ? "Step 2 · Widgets"
                  : step === "import"
                    ? "Step 3 · Import"
                    : step === "email"
                      ? "Step 4 · Emails"
                      : "Step 5 · Finish"
            }
          />
        ) : null}

        {actionData && !actionData.ok ? (
          <s-banner tone="critical" heading="Something went wrong">
            <s-text>
              {actionData.message ??
                "Unable to connect to Shopify. Please try again."}
            </s-text>
            {actionData.issues?.length ? (
              <ul>
                {actionData.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
          </s-banner>
        ) : null}

        {step === "welcome" ? (
          <WelcomeStep
            headingRef={headingRef}
            busy={busy}
            formId={formId}
          />
        ) : null}
        {step === "theme" ? (
          <ThemeStep
            headingRef={headingRef}
            busy={busy}
            themeEditorUrl={themeEditorUrl}
            enabled={statusNow.themeEnabled}
          />
        ) : null}
        {step === "widget" ? (
          <WidgetStep
            headingRef={headingRef}
            busy={busy}
            widgetEditorUrls={widgetEditorUrls}
            added={statusNow.widgetAdded}
          />
        ) : null}
        {step === "import" ? (
          <ImportStep
            headingRef={headingRef}
            busy={busy}
            imported={statusNow.reviewsImported}
          />
        ) : null}
        {step === "email" ? (
          <EmailStep
            headingRef={headingRef}
            busy={busy}
            settings={settings}
            configured={statusNow.emailConfigured}
            shopPlan={shopPlan}
          />
        ) : null}
        {step === "finish" ? (
          <FinishStep
            headingRef={headingRef}
            busy={busy}
            status={statusNow}
            storeUrl={storeUrl}
            shopDomain={shopDomain}
            shopPlan={shopPlan}
            proTrialDays={proTrialDays}
            proMonthlyPrice={proMonthlyPrice}
          />
        ) : null}
      </s-stack>
    </s-page>
  );
}

function WelcomeStep({
  headingRef,
  busy,
  formId,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  busy: boolean;
  formId: string;
}) {
  return (
    <s-box padding="large" border="base" borderRadius="large" background="base">
      <s-stack direction="block" gap="large" alignItems="center">
        <img
          src="/reviewtrix-logo.svg"
          alt="ReviewTrix"
          width={160}
          height={48}
          style={{ objectFit: "contain" }}
        />
        <h1
          ref={headingRef}
          tabIndex={-1}
          style={{ margin: 0, fontSize: "1.75rem", textAlign: "center" }}
        >
          Welcome to ReviewTrix
        </h1>
        <s-text>
          Collect authentic reviews. Display them beautifully. Increase
          conversions.
        </s-text>
        <s-badge>Estimated setup · 2–5 minutes</s-badge>
        <s-text tone="success">Trusted by Shopify merchants</s-text>
        <s-stack direction="block" gap="small" alignItems="center">
          <Form method="post" id={formId}>
            <input type="hidden" name="intent" value="start" />
            <s-button type="submit" variant="primary" disabled={busy} {...(busy ? { loading: true } : {})}>
              Start Setup
            </s-button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="skip" />
            <s-button type="submit" variant="tertiary" disabled={busy}>
              Skip for now
            </s-button>
          </Form>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function ThemeStep({
  headingRef,
  busy,
  themeEditorUrl,
  enabled,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  busy: boolean;
  themeEditorUrl: string;
  enabled: boolean;
}) {
  return (
    <s-box padding="large" border="base" borderRadius="large">
      <s-stack direction="block" gap="base">
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0 }}>
          Enable Theme App Extension
        </h2>
        <s-text>
          Review widgets require the Theme App Extension to display on your
          storefront.
        </s-text>
        {enabled ? (
          <s-banner tone="success" heading="Theme Extension Enabled">
            <s-text>You can continue to the next step.</s-text>
          </s-banner>
        ) : (
          <s-banner tone="info" heading="Open the theme editor">
            <s-text>
              Enable the ReviewTrix app embed, then return here. We detect when
              it is active (requires theme read access).
            </s-text>
          </s-banner>
        )}
        <s-stack direction="inline" gap="base">
          <s-button
            href={themeEditorUrl}
            target="_blank"
            variant={enabled ? "secondary" : "primary"}
          >
            Enable Extension
          </s-button>
          <Form method="post">
            <input type="hidden" name="intent" value="poll-theme" />
            <s-button type="submit" disabled={busy} {...(busy ? { loading: true } : {})}>
              {enabled ? "Refresh status" : "Check status"}
            </s-button>
          </Form>
          {!enabled ? (
            <Form method="post">
              <input type="hidden" name="intent" value="theme" />
              <s-button type="submit" variant="tertiary" disabled={busy}>
                I've enabled it
              </s-button>
            </Form>
          ) : null}
          {enabled ? (
            <Form method="post">
              <input type="hidden" name="intent" value="set-step" />
              <input type="hidden" name="currentStep" value="2" />
              <s-button type="submit" variant="primary" disabled={busy}>
                Continue
              </s-button>
            </Form>
          ) : null}
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function WidgetStep({
  headingRef,
  busy,
  widgetEditorUrls,
  added,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  busy: boolean;
  widgetEditorUrls: Record<string, string>;
  added: boolean;
}) {
  return (
    <s-box padding="large" border="base" borderRadius="large">
      <s-stack direction="block" gap="base">
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0 }}>
          Add your first widget
        </h2>
        <s-text>
          Place a ReviewTrix block on your product template so shoppers see
          social proof.
        </s-text>
        {added ? (
          <s-banner tone="success" heading="Widget Added">
            <s-text>Great — continue when you are ready.</s-text>
          </s-banner>
        ) : null}
        <s-stack direction="block" gap="base">
          {ONBOARDING_WIDGET_OPTIONS.map((option) => (
            <s-box
              key={option.id}
              padding="base"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-stack direction="block" gap="none">
                  <s-text type="strong">{option.title}</s-text>
                  <s-text>{option.description}</s-text>
                </s-stack>
                <s-button
                  href={widgetEditorUrls[option.id] ?? "#"}
                  target="_blank"
                  variant="secondary"
                >
                  Add
                </s-button>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
        <s-stack direction="inline" gap="base">
          <Form method="post">
            <input type="hidden" name="intent" value="poll-widget" />
            <s-button type="submit" disabled={busy} {...(busy ? { loading: true } : {})}>
              Check placement
            </s-button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="widget" />
            <s-button type="submit" variant="tertiary" disabled={busy}>
              I've added a widget
            </s-button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="skip-step" />
            <input type="hidden" name="step" value="widget" />
            <s-button type="submit" variant="tertiary" disabled={busy}>
              Skip for now
            </s-button>
          </Form>
          {added ? (
            <Form method="post">
              <input type="hidden" name="intent" value="set-step" />
              <input type="hidden" name="currentStep" value="3" />
              <s-button type="submit" variant="primary" disabled={busy}>
                Continue
              </s-button>
            </Form>
          ) : null}
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function ImportStep({
  headingRef,
  busy,
  imported,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  busy: boolean;
  imported: boolean;
}) {
  const [source, setSource] = useState<"csv" | "judgeme" | "loox" | "ali" | null>(
    null,
  );

  return (
    <s-box padding="large" border="base" borderRadius="large">
      <s-stack direction="block" gap="base">
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0 }}>
          Import existing reviews
        </h2>
        <s-text>
          Prevent an empty storefront. Export from your previous app, then upload
          a ReviewTrix CSV (one-click migrations are on the roadmap).
        </s-text>
        {imported ? (
          <s-banner tone="success" heading="Import finished">
            <s-text>Imported reviews are ready for moderation.</s-text>
          </s-banner>
        ) : null}
        <s-stack direction="block" gap="small">
          {(
            [
              ["judgeme", "Import from Judge.me"],
              ["loox", "Import from Loox"],
              ["ali", "Import from Ali Reviews"],
              ["csv", "Import CSV"],
            ] as const
          ).map(([id, label]) => (
            <s-box key={id} padding="base" border="base" borderRadius="base">
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-text type="strong">{label}</s-text>
                <button
                  type="button"
                  onClick={() => setSource(id)}
                  disabled={busy}
                >
                  Import
                </button>
              </s-stack>
            </s-box>
          ))}
        </s-stack>

        {source ? (
          <s-box padding="base" border="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              <s-text type="strong">CSV upload</s-text>
              <s-text>
                {source === "csv"
                  ? "Upload a file using the ReviewTrix sample headers."
                  : `Export reviews from ${source}, map columns to the ReviewTrix CSV format, then upload below.`}
              </s-text>
              <s-link href="/app/imports/download?type=sample">Download sample CSV</s-link>
              <Form method="post" encType="multipart/form-data">
                <input type="hidden" name="intent" value="upload-import" />
                <s-stack direction="block" gap="small">
                  <input
                    type="file"
                    name="file"
                    accept=".csv,text/csv"
                    required
                    aria-label="CSV file"
                  />
                  <s-button type="submit" variant="primary" disabled={busy} {...(busy ? { loading: true } : {})}>
                    Upload and import
                  </s-button>
                </s-stack>
              </Form>
            </s-stack>
          </s-box>
        ) : null}

        <s-stack direction="inline" gap="base">
          <Form method="post">
            <input type="hidden" name="intent" value="skip-step" />
            <input type="hidden" name="step" value="import" />
            <s-button type="submit" variant="tertiary" disabled={busy}>
              Skip
            </s-button>
          </Form>
          {imported ? (
            <Form method="post">
              <input type="hidden" name="intent" value="set-step" />
              <input type="hidden" name="currentStep" value="4" />
              <s-button type="submit" variant="primary" disabled={busy}>
                Continue
              </s-button>
            </Form>
          ) : null}
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function EmailStep({
  headingRef,
  busy,
  settings,
  configured,
  shopPlan,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  busy: boolean;
  settings: OnboardingPageProps["settings"];
  configured: boolean;
  shopPlan: "FREE" | "PRO";
}) {
  return (
    <s-box padding="large" border="base" borderRadius="large">
      <s-stack direction="block" gap="base">
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0 }}>
          Configure review request emails
        </h2>
        <s-text>
          Start collecting new reviews after fulfillment. You can refine templates
          later under Review requests.
        </s-text>
        {configured ? (
          <s-banner tone="success" heading="Email configured">
            <s-text>Automation is ready.</s-text>
          </s-banner>
        ) : null}
        <Form method="post">
          <input type="hidden" name="intent" value="save-email" />
          <s-stack direction="block" gap="base">
            <label>
              <s-text type="strong">Request timing (days after fulfillment)</s-text>
              <select
                name="requestDelayDays"
                defaultValue={String(settings.requestDelayDays)}
                aria-label="Request delay days"
              >
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
                <option value="1">1 day (custom)</option>
                <option value="10">10 days (custom)</option>
                <option value="14">14 days (custom)</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                name="reminderEnabled"
                value="true"
                defaultChecked={settings.reminderEnabled}
              />{" "}
              Send reminder
            </label>
            <label>
              <s-text>Reminder delay (days after first email)</s-text>
              <input
                type="number"
                name="reminderDelayDays"
                min={1}
                max={30}
                defaultValue={settings.reminderDelayDays}
              />
            </label>
            <label>
              <s-text>Email subject</s-text>
              <input
                type="text"
                name="emailSubject"
                defaultValue={settings.emailSubject}
                required
                style={{ width: "100%" }}
              />
            </label>
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-text type="strong">Preview</s-text>
              <s-text>
                Subject: {settings.emailSubject} · Plan: {shopPlan}
              </s-text>
            </s-box>
            <s-button type="submit" variant="primary" disabled={busy} {...(busy ? { loading: true } : {})}>
              Save configuration
            </s-button>
          </s-stack>
        </Form>
        <s-stack direction="inline" gap="base">
          <Form method="post">
            <input type="hidden" name="intent" value="skip-step" />
            <input type="hidden" name="step" value="email" />
            <s-button type="submit" variant="tertiary" disabled={busy}>
              Skip
            </s-button>
          </Form>
          {configured ? (
            <Form method="post">
              <input type="hidden" name="intent" value="set-step" />
              <input type="hidden" name="currentStep" value="5" />
              <s-button type="submit" variant="primary" disabled={busy}>
                Continue
              </s-button>
            </Form>
          ) : null}
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function FinishStep({
  headingRef,
  busy,
  status,
  storeUrl,
  shopPlan,
  proTrialDays,
  proMonthlyPrice,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  busy: boolean;
  status: OnboardingPublicStatus;
  storeUrl: string;
  shopDomain: string;
  shopPlan: "FREE" | "PRO";
  proTrialDays: number;
  proMonthlyPrice: number;
}) {
  useEffect(() => {
    // Lightweight confetti via CSS burst (no dependency).
    const root = document.getElementById("onboarding-confetti");
    if (!root) return;
    root.dataset.show = "1";
  }, []);

  const rows = [
    { label: "Theme", ok: status.themeEnabled },
    { label: "Widgets", ok: status.widgetAdded },
    { label: "Import", ok: status.reviewsImported },
    { label: "Emails", ok: status.emailConfigured },
  ];

  return (
    <s-box padding="large" border="base" borderRadius="large">
      <div
        id="onboarding-confetti"
        aria-hidden
        style={{
          pointerEvents: "none",
          textAlign: "center",
          fontSize: 28,
          minHeight: 32,
        }}
      >
        ✦
      </div>
      <s-stack direction="block" gap="large" alignItems="center">
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, textAlign: "center" }}>
          You&apos;re ready!
        </h2>
        <s-text>
          ReviewTrix is set up to collect and display reviews. Let them work for
          you automatically.
        </s-text>
        <s-stack direction="block" gap="small">
          {rows.map((row) => (
            <s-stack key={row.label} direction="inline" gap="small">
              <s-badge tone={row.ok ? "success" : "neutral"}>
                {row.ok ? "Done" : "Skipped"}
              </s-badge>
              <s-text>{row.label}</s-text>
            </s-stack>
          ))}
        </s-stack>

        {shopPlan === "FREE" ? (
          <s-stack direction="block" gap="small" alignItems="center">
            <s-text type="strong">
              Your Free plan includes widgets, moderation, CSV import, and review
              requests. Try Pro free for {proTrialDays} days:
            </s-text>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              <li>Higher published-review and email allowances</li>
              <li>Domestic &amp; international request delays</li>
              <li>Optional removal of app branding</li>
            </ul>
            <Form method="post" action="/app/billing">
              <input type="hidden" name="intent" value="upgrade" />
              <s-button type="submit" variant="primary" disabled={busy}>
                Try Pro plan for $0
              </s-button>
            </Form>
            <s-text tone="neutral">
              Free for {proTrialDays} days. Then ${proMonthlyPrice}/month. Cancel
              anytime.
            </s-text>
          </s-stack>
        ) : (
          <s-badge tone="success">You&apos;re on Pro</s-badge>
        )}

        <s-stack direction="inline" gap="base">
          <Form method="post">
            <input type="hidden" name="intent" value="complete" />
            <s-button type="submit" variant="primary" disabled={busy} {...(busy ? { loading: true } : {})}>
              {shopPlan === "FREE" ? "Continue with the Free plan" : "Go to Dashboard"}
            </s-button>
          </Form>
          <s-button href={storeUrl} target="_blank" variant="secondary">
            Visit Store
          </s-button>
          <Link to="/app">
            <s-button variant="tertiary">Dashboard</s-button>
          </Link>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
