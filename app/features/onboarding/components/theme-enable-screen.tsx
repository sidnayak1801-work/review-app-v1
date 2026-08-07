import { useEffect, useRef, useState } from "react";
import { Form, Link, useFetcher } from "react-router";

import type { OnboardingPublicStatus } from "../onboarding.types";
import { OnboardingShell } from "./onboarding-shell";

type ThemeEnableScreenProps = {
  themeEditorUrl: string;
  status: OnboardingPublicStatus;
  search: string;
  message?: string;
};

type PollResult = {
  ok: boolean;
  status?: OnboardingPublicStatus;
  message?: string;
};

export function ThemeEnableScreen({
  themeEditorUrl,
  status,
  search,
  message,
}: ThemeEnableScreenProps) {
  const fetcher = useFetcher<PollResult>();
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const attempts = useRef(0);
  const liveStatus = fetcher.data?.status ?? status;
  const detected = liveStatus.themeEnabled;

  useEffect(() => {
    if (!polling || detected) {
      return;
    }

    const id = window.setInterval(() => {
      attempts.current += 1;
      if (attempts.current > 15) {
        setPolling(false);
        setTimedOut(true);
        return;
      }
      fetcher.submit({ intent: "poll-theme" }, { method: "post" });
    }, 2000);

    fetcher.submit({ intent: "poll-theme" }, { method: "post" });
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll loop intentionally keyed on polling/detected
  }, [polling, detected]);

  return (
    <OnboardingShell
      title="Show reviews on your storefront"
      subtitle="Open the Theme Editor, enable the ReviewTrix app embed, then save. We’ll detect it automatically."
    >
      <s-box
        padding="base"
        border="base"
        borderRadius="large"
        background="base"
      >
        <s-stack direction="block" gap="small">
          <s-text type="strong">What to do</s-text>
          <s-text color="subdued">
            1. Click Open Theme Editor
            <br />
            2. Enable the ReviewTrix app embed (and optional product blocks)
            <br />
            3. Click Save — stay on this page while we check
          </s-text>
        </s-stack>
      </s-box>

      {detected ? (
        <s-banner tone="success" heading="Theme extension detected">
          You’re ready.
        </s-banner>
      ) : null}
      {timedOut && !detected ? (
        <s-banner tone="warning" heading="Not detected yet">
          Confirm the embed was saved, then refresh status.
        </s-banner>
      ) : null}
      {message && !detected ? (
        <s-banner tone="info" heading="Status">
          {message}
        </s-banner>
      ) : null}

      <s-stack direction="inline" gap="base">
        <s-button
          href={themeEditorUrl}
          target="_blank"
          variant="primary"
          onClick={() => {
            setTimedOut(false);
            attempts.current = 0;
            setPolling(true);
          }}
        >
          Open Theme Editor
        </s-button>
        {polling && !detected ? (
          <s-text color="subdued">Checking theme…</s-text>
        ) : null}
        <Form method="post">
          <input type="hidden" name="intent" value="poll-theme" />
          <s-button
            type="submit"
            {...(polling && !timedOut ? { disabled: true } : {})}
          >
            Refresh status
          </s-button>
        </Form>
      </s-stack>

      <Link to={`/app/onboarding?screen=checklist${search}`}>
        <s-button>
          {detected ? "Continue to checklist" : "Back to checklist"}
        </s-button>
      </Link>
    </OnboardingShell>
  );
}
