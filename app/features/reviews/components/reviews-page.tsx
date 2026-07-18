import { Form, Link } from "react-router";

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
    status: string;
    productId: string;
  };
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
  };
  isSubmitting: boolean;
  nextHref: string | null;
}

export function ReviewsPage({
  reviews,
  filters,
  actionData,
  isSubmitting,
  nextHref,
}: ReviewsPageProps) {
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

      <s-section heading="Filters">
        <Form method="get">
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Product ID"
              name="productId"
              value={filters.productId}
              details="Shopify product GID or numeric ID"
            />
            <s-select label="Status" name="status" value={filters.status}>
              <s-option value="">All</s-option>
              <s-option value="PENDING">Pending</s-option>
              <s-option value="APPROVED">Approved</s-option>
              <s-option value="REJECTED">Rejected</s-option>
            </s-select>
            <s-button type="submit" variant="secondary">
              Apply filters
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Add review">
        <Form method="post">
          <input type="hidden" name="intent" value="create" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Product ID"
              name="shopifyProductId"
              required
              details="gid://shopify/Product/123 or 123"
            />
            <s-text-field
              label="Rating"
              name="rating"
              required
              details="Enter a number from 1 to 5"
            />
            <s-text-field label="Title" name="title" />
            <s-text-area label="Review" name="body" required />
            <s-text-field label="Author name" name="authorName" required />
            <s-text-field label="Author email" name="authorEmail" />
            <s-select label="Status" name="status" value="APPROVED">
              <s-option value="APPROVED">Approved</s-option>
              <s-option value="PENDING">Pending</s-option>
              <s-option value="REJECTED">Rejected</s-option>
            </s-select>
            <s-checkbox name="verifiedPurchase" label="Verified purchase" />
            <s-button type="submit" variant="primary" disabled={isSubmitting}>
              Create review
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Review list">
        {reviews.length === 0 ? (
          <s-paragraph>
            No reviews yet. Create one above or wait for storefront submissions.
          </s-paragraph>
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
                    <s-text type="strong">
                      {review.rating}/5 · {review.authorName}
                    </s-text>
                    <s-badge>{review.status}</s-badge>
                  </s-stack>
                  {review.title ? (
                    <s-text type="strong">{review.title}</s-text>
                  ) : null}
                  <s-paragraph>{review.body}</s-paragraph>
                  <s-paragraph>
                    Product: {review.shopifyProductId}
                  </s-paragraph>
                  <s-stack direction="inline" gap="small">
                    <Form method="post">
                      <input type="hidden" name="intent" value="update-status" />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <s-button type="submit" variant="secondary">
                        Approve
                      </s-button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="intent" value="update-status" />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <s-button type="submit" variant="secondary">
                        Reject
                      </s-button>
                    </Form>
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
