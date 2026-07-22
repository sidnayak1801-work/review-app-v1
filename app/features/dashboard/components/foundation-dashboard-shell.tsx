interface FoundationDashboardShellProps {
  shop: {
    shopDomain: string;
    status: "INSTALLED" | "UNINSTALLED";
    installedAt: string;
    uninstalledAt: string | null;
    recentReviewCount: number;
    pendingReviewCount: number;
  };
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FoundationDashboardShell({
  shop,
}: FoundationDashboardShellProps) {
  const isInstalled = shop.status === "INSTALLED";
  const isNewMerchant =
    isInstalled &&
    shop.recentReviewCount === 0 &&
    shop.pendingReviewCount === 0;

  return (
    <s-page heading="Review App">
      {!isInstalled ? (
        <s-banner heading="App uninstalled for this store" tone="warning">
          This store previously used Review App and is marked uninstalled. Reinstall
          from the Shopify admin to restore access, then re-enable the Theme App
          Extension blocks if needed. Existing review data is retained until Shopify
          sends a shop redaction request.
        </s-banner>
      ) : isNewMerchant ? (
        <s-banner heading="Welcome — finish setup to collect reviews" tone="info">
          Complete the checklist below to show ratings on your product pages and
          start moderating customer feedback.
        </s-banner>
      ) : (
        <s-banner heading="Ready to collect reviews" tone="success">
          Manage reviews, configure the widget, and keep Theme App Extension blocks
          enabled on product pages.
        </s-banner>
      )}

      <s-section heading="Connected store">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-text type="strong">Shop status</s-text>
            <s-badge tone={isInstalled ? "success" : "warning"}>
              {shop.status}
            </s-badge>
          </s-stack>
          <s-paragraph>
            <s-text type="strong">Shop domain: </s-text>
            {shop.shopDomain}
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Installed at: </s-text>
            {formatTimestamp(shop.installedAt)}
          </s-paragraph>
          {shop.uninstalledAt ? (
            <s-paragraph>
              <s-text type="strong">Uninstalled at: </s-text>
              {formatTimestamp(shop.uninstalledAt)}
            </s-paragraph>
          ) : null}
          <s-paragraph>
            <s-text type="strong">Recent reviews loaded: </s-text>
            {shop.recentReviewCount}
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Pending moderation: </s-text>
            {shop.pendingReviewCount}
          </s-paragraph>
        </s-stack>
      </s-section>

      {isInstalled ? (
        <s-section heading={isNewMerchant ? "Setup checklist" : "Next steps"}>
          <s-unordered-list>
            <s-list-item>
              Open Widget settings to confirm accent color and the storefront
              submission form.
            </s-list-item>
            <s-list-item>
              In the theme editor, enable App embeds and add the review blocks to
              product pages (no theme-code edits required).
            </s-list-item>
            <s-list-item>
              Open Reviews to moderate pending submissions
              {shop.pendingReviewCount > 0
                ? ` (${shop.pendingReviewCount} waiting).`
                : "."}
            </s-list-item>
            <s-list-item>
              Optional: open Review requests after fulfillment emails start sending,
              and Imports if you are migrating existing reviews.
            </s-list-item>
            <s-list-item>
              Optional: open Billing to review Free allowances or upgrade to Pro.
            </s-list-item>
          </s-unordered-list>
        </s-section>
      ) : null}
    </s-page>
  );
}
