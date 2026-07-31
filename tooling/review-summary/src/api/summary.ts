export type RatingDistribution = Record<"1" | "2" | "3" | "4" | "5", number>;

export type ProductSummaryResponse = {
  productId: string;
  averageRating: number | null;
  totalReviews: number;
  distribution: RatingDistribution;
};

const SUMMARY_FETCH_TIMEOUT_MS = 8_000;

export async function fetchProductSummary(
  url: string,
): Promise<ProductSummaryResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SUMMARY_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Summary request failed (${response.status})`);
    }

    const data = (await response.json()) as ProductSummaryResponse;
    return {
      productId: String(data.productId ?? ""),
      averageRating:
        data.averageRating == null ? null : Number(data.averageRating),
      totalReviews: Number(data.totalReviews ?? 0),
      distribution: {
        "5": Number(data.distribution?.["5"] ?? 0),
        "4": Number(data.distribution?.["4"] ?? 0),
        "3": Number(data.distribution?.["3"] ?? 0),
        "2": Number(data.distribution?.["2"] ?? 0),
        "1": Number(data.distribution?.["1"] ?? 0),
      },
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
