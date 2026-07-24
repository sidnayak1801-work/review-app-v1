import { Stars } from "../../../components/stars";
import {
  avatarInitial,
  formatRelativeTime,
  statusBadgeTone,
} from "../../../lib/ui-format";
import {
  toAppProductHref,
  toShopifyProductNumericId,
} from "../../../lib/shopify-ids";

interface RecentReviewRow {
  id: string;
  authorName: string;
  rating: number;
  shopifyProductId: string;
  productTitle?: string | null;
  status: string;
  createdAt: string;
}

interface RecentReviewsProps {
  reviews: RecentReviewRow[];
}

function productLabel(review: RecentReviewRow): string {
  if (review.productTitle?.trim()) {
    return review.productTitle.trim();
  }
  try {
    return `Product #${toShopifyProductNumericId(review.shopifyProductId)}`;
  } catch {
    return "Unknown product";
  }
}

export function RecentReviews({ reviews }: RecentReviewsProps) {
  return (
    <s-section heading="Recent reviews">
      <s-stack direction="block" gap="base">
        {reviews.length === 0 ? (
          <s-box padding="base" border="base" borderRadius="large" background="subdued">
            <s-stack direction="block" gap="small">
              <s-text type="strong">No reviews yet</s-text>
              <s-text color="subdued">
                New submissions will show up here for quick triage.
              </s-text>
              <s-button href="/app/imports" variant="secondary">
                Import reviews
              </s-button>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="small">
            {reviews.map((review) => {
              const href = toAppProductHref(review.shopifyProductId);
              const label = productLabel(review);
              return (
                <s-box
                  key={review.id}
                  padding="base"
                  border="base"
                  borderRadius="large"
                  background="base"
                >
                  <s-stack direction="block" gap="small">
                    <s-stack
                      direction="inline"
                      gap="base"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <s-box
                          padding="small-200"
                          background="subdued"
                          borderRadius="base"
                        >
                          <s-text type="strong">
                            {avatarInitial(review.authorName)}
                          </s-text>
                        </s-box>
                        <s-stack direction="block" gap="none">
                          <s-text type="strong">{review.authorName}</s-text>
                          <s-text color="subdued">
                            {formatRelativeTime(review.createdAt)}
                          </s-text>
                        </s-stack>
                      </s-stack>
                      <s-badge tone={statusBadgeTone(review.status)}>
                        {review.status}
                      </s-badge>
                    </s-stack>
                    <Stars rating={review.rating} />
                    <div style={{ overflowWrap: "anywhere" }}>
                      {href ? (
                        <s-text color="subdued">
                          Product: <s-link href={href}>{label}</s-link>
                          {" · "}insights
                        </s-text>
                      ) : (
                        <s-text color="subdued">Product: {label}</s-text>
                      )}
                    </div>
                  </s-stack>
                </s-box>
              );
            })}
          </s-stack>
        )}
        <s-button href="/app/reviews" variant="primary">
          View all reviews
        </s-button>
      </s-stack>
    </s-section>
  );
}
