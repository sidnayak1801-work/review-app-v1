import {
  normalizeShopifyProductId,
  toShopifyProductNumericId,
} from "../../lib/shopify-ids";
import { ValidationError } from "../../lib/domain-error";
import {
  reviewRepository,
  type ProductRatingTrendPoint,
  type ProductReviewStats,
  type ProductReviewTrendPoint,
  type ReviewRepository,
} from "../../repositories/review.repository.server";
import {
  fetchProductDetailsById,
  type ShopifyProductDetails,
} from "../../services/shopify-products.server";
import {
  productDetailQuerySchema,
  productIdParamSchema,
} from "./product-insights.schema";
import type { ProductInsight } from "./product-insights.types";

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export interface ProductDetailResult {
  shopifyProductId: string;
  numericId: string;
  title: string;
  shopify: ShopifyProductDetails | null;
  shopifyAdminHref: string;
  stats: ProductReviewStats;
  volumeTrend: ProductReviewTrendPoint[];
  ratingTrend: ProductRatingTrendPoint[];
  insights: ProductInsight[];
  hasAnyReviews: boolean;
}

function parseProductGid(raw: string): string {
  const parsed = productIdParamSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid product id",
      parsed.error.issues.map((issue) => issue.message),
    );
  }
  return normalizeShopifyProductId(parsed.data);
}

function fallbackTitle(
  shopifyProductId: string,
  productTitle: string | null | undefined,
  shopifyTitle?: string | null,
): string {
  if (shopifyTitle?.trim()) {
    return shopifyTitle.trim();
  }
  if (productTitle?.trim()) {
    return productTitle.trim();
  }
  try {
    return `Product #${toShopifyProductNumericId(shopifyProductId)}`;
  } catch {
    return "Unknown product";
  }
}

export class ProductInsightsService {
  constructor(private readonly reviews: ReviewRepository = reviewRepository) {}

  async getDetailForShop(
    shopId: string,
    admin: AdminGraphqlClient,
    productIdParam: string,
  ): Promise<ProductDetailResult> {
    const shopifyProductId = parseProductGid(productIdParam);
    const numericId = toShopifyProductNumericId(shopifyProductId);

    const [stats, volumeTrend, ratingTrend, shopify, sample] = await Promise.all([
      this.reviews.getProductStatsForShop(shopId, shopifyProductId),
      this.reviews.getProductReviewTrendForShop(shopId, shopifyProductId, 12),
      this.reviews.getProductRatingTrendForShop(shopId, shopifyProductId, 12),
      fetchProductDetailsById(admin, shopifyProductId),
      this.reviews.list({
        shopId,
        shopifyProductId,
        limit: 1,
      }),
    ]);

    const cachedTitle = sample.items[0]?.productTitle ?? null;

    return {
      shopifyProductId,
      numericId,
      title: fallbackTitle(shopifyProductId, cachedTitle, shopify?.title),
      shopify,
      shopifyAdminHref: `shopify://admin/products/${numericId}`,
      stats,
      volumeTrend,
      ratingTrend,
      insights: [],
      hasAnyReviews: stats.totalReviews > 0 || sample.items.length > 0,
    };
  }

  async parseDetailQuery(rawQuery: unknown) {
    const parsed = productDetailQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid product detail query",
        parsed.error.issues.map((issue) => issue.message),
      );
    }
    return parsed.data;
  }
}

export const productInsightsService = new ProductInsightsService();
