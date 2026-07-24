import { normalizeShopifyProductId } from "../lib/shopify-ids";
import { logger } from "./logger.server";

const PRODUCT_TITLES_QUERY = `#graphql
  query ProductTitles($ids: [ID!]!) {
    nodes(ids: $ids) {
      id
      ... on Product {
        title
      }
    }
  }
`;

const PRODUCT_DETAILS_QUERY = `#graphql
  query ProductDetails($ids: [ID!]!) {
    nodes(ids: $ids) {
      id
      ... on Product {
        title
        handle
        status
        vendor
        productType
        tags
        featuredImage {
          url
          altText
        }
      }
    }
  }
`;

interface ProductTitlesResponse {
  data?: {
    nodes?: Array<{
      id?: string;
      title?: string | null;
    } | null>;
  };
  errors?: Array<{ message?: string }>;
}

interface ProductDetailsResponse {
  data?: {
    nodes?: Array<{
      id?: string;
      title?: string | null;
      handle?: string | null;
      status?: string | null;
      vendor?: string | null;
      productType?: string | null;
      tags?: string[] | null;
      featuredImage?: {
        url?: string | null;
        altText?: string | null;
      } | null;
    } | null>;
  };
  errors?: Array<{ message?: string }>;
}

export interface ShopifyProductDetails {
  id: string;
  title: string | null;
  handle: string | null;
  status: string | null;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  imageUrl: string | null;
  imageAlt: string | null;
}

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

function uniqueNormalizedProductIds(productIds: string[]): string[] {
  return [
    ...new Set(
      productIds
        .map((id) => {
          try {
            return normalizeShopifyProductId(id);
          } catch {
            return null;
          }
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

export async function fetchProductTitlesByIds(
  admin: AdminGraphqlClient,
  productIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = uniqueNormalizedProductIds(productIds);
  const titles = new Map<string, string>();
  if (uniqueIds.length === 0) {
    return titles;
  }

  try {
    const response = await admin.graphql(PRODUCT_TITLES_QUERY, {
      variables: { ids: uniqueIds },
    });
    const payload = (await response.json()) as ProductTitlesResponse;

    if (payload.errors?.length) {
      logger.warn("Product title GraphQL returned errors", {
        errorCount: payload.errors.length,
        message: payload.errors[0]?.message ?? "unknown",
      });
    }

    for (const node of payload.data?.nodes ?? []) {
      if (!node?.id || !node.title?.trim()) {
        continue;
      }
      titles.set(node.id, node.title.trim());
    }
  } catch (error) {
    logger.warn("Unable to fetch product titles from Shopify", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      productCount: uniqueIds.length,
    });
  }

  return titles;
}

export async function fetchProductDetailsByIds(
  admin: AdminGraphqlClient,
  productIds: string[],
): Promise<Map<string, ShopifyProductDetails>> {
  const uniqueIds = uniqueNormalizedProductIds(productIds);
  const details = new Map<string, ShopifyProductDetails>();
  if (uniqueIds.length === 0) {
    return details;
  }

  try {
    const response = await admin.graphql(PRODUCT_DETAILS_QUERY, {
      variables: { ids: uniqueIds },
    });
    const payload = (await response.json()) as ProductDetailsResponse;

    if (payload.errors?.length) {
      logger.warn("Product details GraphQL returned errors", {
        errorCount: payload.errors.length,
        message: payload.errors[0]?.message ?? "unknown",
      });
    }

    for (const node of payload.data?.nodes ?? []) {
      if (!node?.id) {
        continue;
      }
      details.set(node.id, {
        id: node.id,
        title: node.title?.trim() || null,
        handle: node.handle?.trim() || null,
        status: node.status?.trim() || null,
        vendor: node.vendor?.trim() || null,
        productType: node.productType?.trim() || null,
        tags: Array.isArray(node.tags)
          ? node.tags.map((tag) => tag.trim()).filter(Boolean)
          : [],
        imageUrl: node.featuredImage?.url?.trim() || null,
        imageAlt: node.featuredImage?.altText?.trim() || null,
      });
    }
  } catch (error) {
    logger.warn("Unable to fetch product details from Shopify", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      productCount: uniqueIds.length,
    });
  }

  return details;
}

export async function fetchProductDetailsById(
  admin: AdminGraphqlClient,
  productId: string,
): Promise<ShopifyProductDetails | null> {
  const map = await fetchProductDetailsByIds(admin, [productId]);
  try {
    return map.get(normalizeShopifyProductId(productId)) ?? null;
  } catch {
    return null;
  }
}
