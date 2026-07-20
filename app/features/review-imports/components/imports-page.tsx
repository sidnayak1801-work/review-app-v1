import { Form } from "react-router";

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

      <s-section heading="Upload CSV">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Required columns: product_id, rating, body, author_name. Optional:
            title, author_email, status, verified_purchase.
          </s-paragraph>
          <s-paragraph>
            Maximum file size 1 MB and 500 rows. Imported reviews default to
            pending unless status is set in the CSV.
          </s-paragraph>
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
        </s-stack>
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
                    <a href={`?errorReport=${job.id}`}>Download error report</a>
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
