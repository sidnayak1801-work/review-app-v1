import { reviewRepository } from "../../repositories/review.repository.server";
import { fetchProductTitlesByIds } from "../../services/shopify-products.server";

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

type ReviewWithProduct = {
  id: string;
  shopifyProductId: string;
  productTitle?: string | null;
};

/**
 * Fill missing productTitle values from Shopify Admin GraphQL and persist them.
 */
export async function enrichReviewsWithProductTitles<T extends ReviewWithProduct>(
  shopId: string,
  admin: AdminGraphqlClient,
  reviews: T[],
): Promise<T[]> {
  const missingProductIds = [
    ...new Set(
      reviews
        .filter((review) => !review.productTitle?.trim())
        .map((review) => review.shopifyProductId),
    ),
  ];

  if (missingProductIds.length === 0) {
    return reviews;
  }

  const titles = await fetchProductTitlesByIds(admin, missingProductIds);
  if (titles.size === 0) {
    return reviews;
  }

  void reviewRepository
    .setProductTitlesForShop(shopId, titles)
    .catch(() => undefined);

  return reviews.map((review) => {
    if (review.productTitle?.trim()) {
      return review;
    }
    const title = titles.get(review.shopifyProductId);
    return title ? { ...review, productTitle: title } : review;
  });
}
