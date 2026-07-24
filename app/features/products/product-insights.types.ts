export type ProductInsightKind = "theme" | "sentiment" | "shipping" | "other";

export type ProductInsight = {
  id: string;
  kind: ProductInsightKind;
  headline: string;
  detail?: string;
  source: "placeholder" | "ai";
};

/** Static placeholders until an AI provider is wired. */
export const PRODUCT_INSIGHT_PLACEHOLDERS: ProductInsight[] = [
  {
    id: "placeholder-theme",
    kind: "theme",
    headline: "Customers frequently mention battery.",
    detail: "AI themes will highlight repeated phrases across reviews.",
    source: "placeholder",
  },
  {
    id: "placeholder-shipping",
    kind: "shipping",
    headline: "Most negative reviews mention shipping.",
    detail: "Sentiment insights will surface common pain points.",
    source: "placeholder",
  },
];
