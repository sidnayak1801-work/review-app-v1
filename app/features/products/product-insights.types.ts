export type ProductInsightKind = "theme" | "sentiment" | "shipping" | "other";

export type ProductInsight = {
  id: string;
  kind: ProductInsightKind;
  headline: string;
  detail?: string;
  source: "placeholder" | "ai";
};
