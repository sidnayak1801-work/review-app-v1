import { useState } from "react";
import { Form } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
  SAMPLE_IMPORT_CSV,
  SAMPLE_IMPORT_FILENAME,
} from "../review-import.sample";
import {
  downloadAuthenticatedFile,
  downloadTextFile,
} from "../../../lib/download-file";

type ReviewImportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface ImportJobListItem {
  id: string;
  status: ReviewImportStatus;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errorFileKey: string | null;
  createdAt: string;
}

interface ImportsPageProps {
  imports: ImportJobListItem[];
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
  };
  isSubmitting: boolean;
}

function statusTone(
  status: ReviewImportStatus,
): "success" | "warning" | "critical" | "info" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PROCESSING":
    case "PENDING":
      return "info";
    case "FAILED":
      return "critical";
  }
}

function statusLabel(status: ReviewImportStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
  }
}

export function ImportsPage({
  imports,
  actionData,
  isSubmitting,
}: ImportsPageProps) {
  const shopify = useAppBridge();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  function handleSampleDownload() {
    setDownloadError(null);
    downloadTextFile({
      filename: SAMPLE_IMPORT_FILENAME,
      content: SAMPLE_IMPORT_CSV,
    });
  }

  async function handleErrorReportDownload(importId: string) {
    setDownloadError(null);
    setDownloadingId(importId);

    try {
      await downloadAuthenticatedFile({
        url: `/app/imports/download?type=error-report&importId=${encodeURIComponent(importId)}`,
        filename: `import-${importId}-errors.csv`,
        getSessionToken: () => shopify.idToken(),
      });
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Could not download the error report.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <s-page heading="Import reviews">
      {actionData ? (
        <s-banner
          heading={actionData.ok ? "Import finished" : "Import failed"}
          tone={actionData.ok ? "success" : "critical"}
        >
          {actionData.message}
          {actionData.issues?.length ? (
            <s-unordered-list>
              {actionData.issues.map((issue) => (
                <s-list-item key={issue}>{issue}</s-list-item>
              ))}
            </s-unordered-list>
          ) : null}
        </s-banner>
      ) : null}

      {downloadError ? (
        <s-banner heading="Download failed" tone="critical">
          {downloadError}
        </s-banner>
      ) : null}

      <s-section heading="CSV format guide">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Create a CSV file with a header row, then one review per row. You can
            build the file in Excel or Google Sheets and export as CSV.
          </s-paragraph>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">Required columns</s-text>
              <s-unordered-list>
                <s-list-item>
                  <s-text type="strong">product_id</s-text> — Shopify product ID
                  (numeric) or GID
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">rating</s-text> — integer from 1 to 5
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">body</s-text> — review text (max 5,000
                  characters)
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">author_name</s-text> — reviewer display
                  name (max 100 characters)
                </s-list-item>
              </s-unordered-list>
              <s-text type="strong">Optional columns</s-text>
              <s-unordered-list>
                <s-list-item>
                  <s-text type="strong">title</s-text> — review title (max 200
                  characters)
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">author_email</s-text> — valid email
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">status</s-text> — PENDING, APPROVED, or
                  REJECTED (default PENDING)
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">verified_purchase</s-text> — true or
                  false (default false)
                </s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>
          <s-paragraph>
            Imported reviews default to pending and appear in the Reviews
            moderation queue. Only rows with status APPROVED publish immediately
            and count toward your plan allowance.
          </s-paragraph>
          <s-paragraph>
            Limits: 1 MB file size, 500 rows maximum.
          </s-paragraph>
          <s-button variant="secondary" onClick={handleSampleDownload}>
            Download sample CSV
          </s-button>
        </s-stack>
      </s-section>

      <s-section heading="Upload CSV">
        <Form method="post" encType="multipart/form-data">
          <input type="hidden" name="intent" value="upload" />
          <s-stack direction="block" gap="small">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
            />
            <s-button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Importing…" : "Upload and import"}
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Recent imports">
        {imports.length === 0 ? (
          <s-paragraph>No imports yet. Upload a CSV to get started.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {imports.map((job) => (
              <s-box
                key={job.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="small">
                    <s-text type="strong">
                      {new Date(job.createdAt).toLocaleString()}
                    </s-text>
                    <s-badge tone={statusTone(job.status)}>
                      {statusLabel(job.status)}
                    </s-badge>
                  </s-stack>
                  <s-paragraph>
                    {job.importedRows} imported, {job.failedRows} failed of{" "}
                    {job.totalRows} rows
                  </s-paragraph>
                  {job.errorFileKey ? (
                    <s-button
                      variant="tertiary"
                      disabled={downloadingId === job.id}
                      onClick={() => {
                        void handleErrorReportDownload(job.id);
                      }}
                    >
                      {downloadingId === job.id
                        ? "Downloading…"
                        : "Download error report"}
                    </s-button>
                  ) : null}
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
