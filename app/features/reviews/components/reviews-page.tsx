import { useMemo, useState } from "react";
import { Form, Link } from "react-router";

type ReviewQueueStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ReviewListItem {
  id: string;
  shopifyProductId: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  status: string;
  createdAt: string;
}

interface ReviewsPageProps {
  reviews: ReviewListItem[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  filters: {
    status: ReviewQueueStatus;
    productId: string;
  };
  queueCounts: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
  };
  publishedReviewUsage: {
    used: number;
    limit: number | null;
  };
  shopPlan: "FREE" | "PRO";
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
  };
  isSubmitting: boolean;
  nextHref: string | null;
}

const QUEUES: Array<{ status: ReviewQueueStatus; label: string }> = [
  { status: "PENDING", label: "Pending" },
  { status: "APPROVED", label: "Approved" },
  { status: "REJECTED", label: "Rejected" },
];

function buildQueueHref(
  status: ReviewQueueStatus,
  productId: string,
): string {
  const params = new URLSearchParams({ status });
  if (productId) {
    params.set("productId", productId);
  }
  return `?${params.toString()}`;
}

function emptyQueueMessage(status: ReviewQueueStatus): string {
  switch (status) {
    case "PENDING":
      return "No pending reviews. New storefront submissions will appear here.";
    case "APPROVED":
      return "No approved reviews yet. Approve pending reviews to publish them on the storefront.";
    case "REJECTED":
      return "No rejected reviews.";
  }
}

export function ReviewsPage({
  reviews,
  filters,
  queueCounts,
  publishedReviewUsage,
  shopPlan,
  actionData,
  isSubmitting,
  nextHref,
}: ReviewsPageProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const canBulkApprove =
    filters.status === "PENDING" || filters.status === "REJECTED";
  const canBulkReject = filters.status === "PENDING";
  const atPublishedLimit =
    shopPlan === "FREE" &&
    publishedReviewUsage.limit !== null &&
    publishedReviewUsage.used >= publishedReviewUsage.limit;

  function toggleSelected(reviewId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(reviewId) ? current : [...current, reviewId];
      }
      return current.filter((id) => id !== reviewId);
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? reviews.map((review) => review.id) : []);
  }

  return (
    <s-page heading="Reviews">
      {actionData ? (
        <s-banner
          heading={actionData.ok ? "Saved" : "Could not save"}
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

      {publishedReviewUsage.limit !== null ? (
        <s-banner
          heading="Published review usage"
          tone={atPublishedLimit ? "warning" : "info"}
        >
          Published reviews: {publishedReviewUsage.used} /{" "}
          {publishedReviewUsage.limit}
          {atPublishedLimit && shopPlan === "FREE" ? (
            <>
              {" "}
              Upgrade to Pro on the <Link to="/app/billing">Billing</Link> page
              to approve more reviews.
            </>
          ) : atPublishedLimit ? (
            ". You have reached your published-review allowance."
          ) : publishedReviewUsage.used >= publishedReviewUsage.limit - 10 ? (
            shopPlan === "FREE" ? (
              <>
                {" "}
                You are nearing the Free plan limit.{" "}
                <Link to="/app/billing">View billing</Link>.
              </>
            ) : (
              ". You are nearing your published-review limit."
            )
          ) : (
            "."
          )}
        </s-banner>
      ) : null}

      <s-section heading="Moderation queues">
        <s-stack direction="inline" gap="small">
          {QUEUES.map((queue) => (
            <Link
              key={queue.status}
              to={buildQueueHref(queue.status, filters.productId)}
            >
              {queue.label} ({queueCounts[queue.status]})
            </Link>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="Product filter">
        <Form method="get">
          <input type="hidden" name="status" value={filters.status} />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Product ID"
              name="productId"
              value={filters.productId}
              details="Shopify product GID or numeric ID"
            />
            <s-button type="submit" variant="secondary">
              Apply filter
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading={`${filters.status.charAt(0)}${filters.status.slice(1).toLowerCase()} queue`}>
        {reviews.length > 0 && (canBulkApprove || canBulkReject) ? (
          <s-stack direction="block" gap="base">
            <label>
              <input
                type="checkbox"
                checked={
                  reviews.length > 0 &&
                  reviews.every((review) => selectedSet.has(review.id))
                }
                onChange={(event) => toggleSelectAll(event.currentTarget.checked)}
              />{" "}
              Select all on this page
            </label>
            {selectedIds.length > 0 ? (
              <s-stack direction="inline" gap="small">
                {canBulkApprove ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="bulk-update-status" />
                    <input type="hidden" name="status" value="APPROVED" />
                    {selectedIds.map((reviewId) => (
                      <input
                        key={reviewId}
                        type="hidden"
                        name="reviewIds"
                        value={reviewId}
                      />
                    ))}
                    <s-button type="submit" variant="primary" disabled={isSubmitting}>
                      Approve selected ({selectedIds.length})
                    </s-button>
                  </Form>
                ) : null}
                {canBulkReject ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="bulk-update-status" />
                    <input type="hidden" name="status" value="REJECTED" />
                    {selectedIds.map((reviewId) => (
                      <input
                        key={reviewId}
                        type="hidden"
                        name="reviewIds"
                        value={reviewId}
                      />
                    ))}
                    <s-button type="submit" variant="secondary" disabled={isSubmitting}>
                      Reject selected ({selectedIds.length})
                    </s-button>
                  </Form>
                ) : null}
              </s-stack>
            ) : null}
          </s-stack>
        ) : null}

        {reviews.length === 0 ? (
          <s-paragraph>{emptyQueueMessage(filters.status)}</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {reviews.map((review) => (
              <s-box
                key={review.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="small" alignItems="center">
                    {canBulkApprove || canBulkReject ? (
                      <label aria-label={`Select review by ${review.authorName}`}>
                        <input
                          type="checkbox"
                          checked={selectedSet.has(review.id)}
                          onChange={(event) =>
                            toggleSelected(review.id, event.currentTarget.checked)
                          }
                        />
                      </label>
                    ) : null}
                    <s-text type="strong">
                      {review.rating}/5 · {review.authorName}
                    </s-text>
                    <s-badge>{review.status}</s-badge>
                  </s-stack>
                  {review.title ? (
                    <s-text type="strong">{review.title}</s-text>
                  ) : null}
                  <s-paragraph>{review.body}</s-paragraph>
                  <s-paragraph>Product: {review.shopifyProductId}</s-paragraph>
                  <s-stack direction="inline" gap="small">
                    {filters.status !== "APPROVED" ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="update-status" />
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="status" value="APPROVED" />
                        <s-button type="submit" variant="secondary">
                          Approve
                        </s-button>
                      </Form>
                    ) : null}
                    {filters.status !== "REJECTED" ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="update-status" />
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="status" value="REJECTED" />
                        <s-button type="submit" variant="secondary">
                          Reject
                        </s-button>
                      </Form>
                    ) : null}
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <s-button type="submit" tone="critical" variant="secondary">
                        Delete
                      </s-button>
                    </Form>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}

        {nextHref ? (
          <s-stack direction="block" gap="base">
            <Link to={nextHref}>Load more</Link>
          </s-stack>
        ) : null}
      </s-section>
    </s-page>
  );
}
