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
import { formatRelativeTime, statusBadgeTone } from "../../../lib/ui-format";

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
      <s-stack direction="block" gap="large">
        <s-text color="subdued">
          Upload a CSV to bring existing reviews into your moderation queue.
        </s-text>

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

      <s-section heading="Upload CSV">
        <s-box padding="base" border="base" borderRadius="large" background="subdued">
          <Form method="post" encType="multipart/form-data">
            <input type="hidden" name="intent" value="upload" />
            <s-stack direction="block" gap="base">
              <s-text color="subdued">
                Limits: 1 MB · 500 rows · defaults to pending moderation
              </s-text>
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
              />
              <s-stack direction="inline" gap="small">
                <s-button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Importing…" : "Upload and import"}
                </s-button>
                <s-button variant="secondary" onClick={handleSampleDownload}>
                  Download sample CSV
                </s-button>
              </s-stack>
            </s-stack>
          </Form>
        </s-box>
      </s-section>

      <s-section heading="CSV format">
        <s-stack direction="block" gap="base">
          <s-box padding="base" border="base" borderRadius="large">
            <s-stack direction="block" gap="small">
              <s-text type="strong">Required</s-text>
              <s-unordered-list>
                <s-list-item>
                  <s-text type="strong">product_id</s-text> — Shopify product ID
                  or GID
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">rating</s-text> — 1 to 5
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">body</s-text> — review text
                </s-list-item>
                <s-list-item>
                  <s-text type="strong">author_name</s-text> — display name
                </s-list-item>
              </s-unordered-list>
              <s-text type="strong">Optional</s-text>
              <s-unordered-list>
                <s-list-item>title, author_email, status, verified_purchase</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Recent imports">
        {imports.length === 0 ? (
          <s-box padding="base" border="base" borderRadius="large" background="subdued">
            <s-text color="subdued">No imports yet. Upload a CSV to get started.</s-text>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {imports.map((job) => (
              <s-box
                key={job.id}
                padding="base"
                border="base"
                borderRadius="large"
              >
                <s-stack direction="block" gap="small">
                  <s-stack
                    direction="inline"
                    gap="small"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-badge tone={statusBadgeTone(job.status)}>
                        {statusLabel(job.status)}
                      </s-badge>
                      <s-text type="strong">
                        {job.importedRows} imported · {job.failedRows} failed
                      </s-text>
                    </s-stack>
                    <s-text color="subdued">
                      {formatRelativeTime(job.createdAt)}
                    </s-text>
                  </s-stack>
                  <s-text color="subdued">{job.totalRows} rows total</s-text>
                  {job.errorFileKey ? (
                    <s-button
                      variant="secondary"
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
      </s-stack>
    </s-page>
  );
}
