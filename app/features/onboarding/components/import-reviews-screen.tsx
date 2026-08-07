import { Form, Link } from "react-router";

import { OnboardingShell } from "./onboarding-shell";

const PLATFORMS = [
  { id: "judgeme", name: "Judge.me" },
  { id: "loox", name: "Loox" },
  { id: "stamped", name: "Stamped" },
  { id: "ali", name: "Ali Reviews" },
  { id: "csv", name: "CSV file" },
] as const;

type ImportReviewsScreenProps = {
  search: string;
  message?: string;
  ok?: boolean;
};

export function ImportReviewsScreen({
  search,
  message,
  ok,
}: ImportReviewsScreenProps) {
  return (
    <OnboardingShell
      title="Bring your existing reviews"
      subtitle="Export a CSV from your current review app, then upload it here. Competitor cards use the same CSV path today."
    >
      <s-stack direction="inline" gap="base">
        {PLATFORMS.map((item) => (
          <s-box
            key={item.id}
            padding="base"
            border="base"
            borderRadius="large"
            background="base"
          >
            <s-stack direction="block" gap="small-200">
              <s-text type="strong">{item.name}</s-text>
              <s-text color="subdued">~2 min via CSV</s-text>
            </s-stack>
          </s-box>
        ))}
      </s-stack>

      <s-box
        padding="base"
        border="base"
        borderRadius="large"
        background="base"
      >
        <s-stack direction="block" gap="small">
          <s-text type="strong">Upload CSV</s-text>
          <s-text color="subdued">
            Download our sample CSV, map your export columns, then upload.
            Duplicates and bad rows are skipped.
          </s-text>
          <s-button href="/app/imports/download?type=sample" target="_blank">
            Download sample CSV
          </s-button>
        </s-stack>
      </s-box>

      <Form method="post" encType="multipart/form-data">
        <s-stack direction="block" gap="base">
          <input type="hidden" name="intent" value="upload-import" />
          <input type="file" name="file" accept=".csv,text/csv" required />
          <s-button type="submit" variant="primary">
            Start import
          </s-button>
        </s-stack>
      </Form>

      <Form method="post">
        <input type="hidden" name="intent" value="skip-optional" />
        <input type="hidden" name="task" value="import" />
        <s-button type="submit">Skip for now</s-button>
      </Form>

      {message ? (
        <s-banner
          tone={ok ? "success" : "warning"}
          heading={ok ? "Import finished" : "Import note"}
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
