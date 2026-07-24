import { Stars } from "../../../components/stars";

export interface DashboardStats {
  totalReviews: number;
  pendingReviews: number;
  averageRating: number | null;
  publishedPercent: number;
  widgetEnabled: boolean;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <s-section heading="Overview">
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size > 640px) repeat(4, minmax(0, 1fr)), @container (inline-size > 360px) repeat(2, minmax(0, 1fr)), 1fr"
          gap="base"
        >
          <s-grid-item>
            <s-box padding="base" border="base" borderRadius="large" background="base">
              <s-stack direction="block" gap="small-200">
                <s-text color="subdued">Total reviews</s-text>
                <s-heading>{stats.totalReviews}</s-heading>
                <s-text color="subdued">All-time submissions</s-text>
              </s-stack>
            </s-box>
          </s-grid-item>

          <s-grid-item>
            <s-box
              padding="base"
              border="base"
              borderRadius="large"
              background={stats.pendingReviews > 0 ? "subdued" : "base"}
            >
              <s-stack direction="block" gap="small-200">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-text color="subdued">Pending</s-text>
                  {stats.pendingReviews > 0 ? (
                    <s-badge tone="warning">Action needed</s-badge>
                  ) : (
                    <s-badge tone="success">Clear</s-badge>
                  )}
                </s-stack>
                <s-heading>{stats.pendingReviews}</s-heading>
                <s-text color="subdued">Waiting for moderation</s-text>
              </s-stack>
            </s-box>
          </s-grid-item>

          <s-grid-item>
            <s-box padding="base" border="base" borderRadius="large" background="base">
              <s-stack direction="block" gap="small-200">
                <s-text color="subdued">Average rating</s-text>
                {stats.averageRating == null ? (
                  <s-heading>—</s-heading>
                ) : (
                  <s-stack direction="inline" gap="small" alignItems="center">
                    <Stars rating={stats.averageRating} size="1.25rem" />
                    <s-heading>{stats.averageRating.toFixed(1)}</s-heading>
                  </s-stack>
                )}
                <s-text color="subdued">Published reviews only</s-text>
              </s-stack>
            </s-box>
          </s-grid-item>

          <s-grid-item>
            <s-box padding="base" border="base" borderRadius="large" background="base">
              <s-stack direction="block" gap="small-200">
                <s-text color="subdued">Widget</s-text>
                <s-badge tone={stats.widgetEnabled ? "success" : "critical"}>
                  {stats.widgetEnabled ? "Enabled" : "Disabled"}
                </s-badge>
                <s-text color="subdued">
                  {stats.publishedPercent}% of reviews published
                </s-text>
              </s-stack>
            </s-box>
          </s-grid-item>
        </s-grid>
      </s-query-container>
    </s-section>
  );
}
