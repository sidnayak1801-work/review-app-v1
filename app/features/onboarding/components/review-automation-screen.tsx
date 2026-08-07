import { useState } from "react";
import { Form, Link } from "react-router";

import { OnboardingShell } from "./onboarding-shell";

type ReviewAutomationScreenProps = {
  search: string;
  settings: {
    requestDelayDays: number;
    reminderEnabled: boolean;
    reminderDelayDays: number;
    emailSubject: string;
  };
  message?: string;
  ok?: boolean;
};

export function ReviewAutomationScreen({
  search,
  settings,
  message,
  ok,
}: ReviewAutomationScreenProps) {
  const [delay, setDelay] = useState(String(settings.requestDelayDays || 5));
  const [reminder, setReminder] = useState(settings.reminderEnabled);
  const [reminderDelay, setReminderDelay] = useState(
    String(settings.reminderDelayDays || 3),
  );
  const [subject, setSubject] = useState(
    settings.emailSubject || "How was your order?",
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <OnboardingShell
      title="Collect reviews automatically"
      subtitle="We’ll email customers after fulfillment. Defaults work for most stores — customize only if you need to."
    >
      <s-box
        padding="base"
        border="base"
        borderRadius="large"
        background="subdued"
      >
        <s-stack direction="block" gap="small">
          <s-text type="strong">Recommended defaults</s-text>
          <s-text color="subdued">
            Delay: 5 days · Reminder on · Media encouraged
          </s-text>
        </s-stack>
      </s-box>

      <Form method="post">
        <s-stack direction="block" gap="base">
          <input type="hidden" name="intent" value="save-automation" />
          <input
            type="hidden"
            name="reminderEnabled"
            value={reminder ? "true" : "false"}
          />
          <s-text-field
            label="Days after fulfillment"
            name="requestDelayDays"
            value={delay}
            autocomplete="off"
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              setDelay(target.value);
            }}
          />
          <s-checkbox
            label="Send a reminder if they don’t respond"
            checked={reminder}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              setReminder(target.checked);
            }}
          />

          <s-button
            type="button"
            variant="tertiary"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
          >
            {advancedOpen ? "Hide advanced settings" : "Advanced settings"}
          </s-button>

          {advancedOpen ? (
            <s-stack direction="block" gap="base">
              <s-text-field
                label="Reminder delay (days)"
                name="reminderDelayDays"
                value={reminderDelay}
                autocomplete="off"
                onChange={(event: Event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  setReminderDelay(target.value);
                }}
              />
              <s-text-field
                label="Email subject"
                name="emailSubject"
                value={subject}
                autocomplete="off"
                onChange={(event: Event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  setSubject(target.value);
                }}
              />
            </s-stack>
          ) : (
            <>
              <input
                type="hidden"
                name="reminderDelayDays"
                value={reminderDelay}
              />
              <input type="hidden" name="emailSubject" value={subject} />
            </>
          )}

          <s-box
            padding="base"
            border="base"
            borderRadius="large"
            background="base"
          >
            <s-stack direction="block" gap="small-200">
              <s-text color="subdued">Email preview</s-text>
              <s-text type="strong">{subject}</s-text>
              <s-text color="subdued">
                Hi there — we’d love your feedback on your recent order. It only
                takes a minute.
              </s-text>
            </s-stack>
          </s-box>

          <s-button type="submit" variant="primary">
            Save automation
          </s-button>
        </s-stack>
      </Form>

      <Form method="post">
        <input type="hidden" name="intent" value="skip-optional" />
        <input type="hidden" name="task" value="automation" />
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
