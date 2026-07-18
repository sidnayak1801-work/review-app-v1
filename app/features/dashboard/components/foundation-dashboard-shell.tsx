interface FoundationDashboardShellProps {
  shop: {
    shopDomain: string;
    status: "INSTALLED" | "UNINSTALLED";
    installedAt: string;
    uninstalledAt: string | null;
    recentReviewCount: number;
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

  return (
    <s-page heading="Review App">
      <s-banner
        heading={isInstalled ? "Ready to collect reviews" : "Shop uninstalled"}
        tone={isInstalled ? "success" : "warning"}
      >
        {isInstalled
          ? "Manage reviews, configure the widget, and enable Theme App Extension blocks."
          : "Reinstall the app to restore the INSTALLED shop state."}
      </s-banner>

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
          <s-paragraph>
            <s-text type="strong">Recent reviews loaded: </s-text>
            {shop.recentReviewCount}
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Next steps">
        <s-unordered-list>
          <s-list-item>
            Open Reviews to create or moderate product reviews.
          </s-list-item>
          <s-list-item>
            Open Widget settings to configure accent color and the submission
            form.
          </s-list-item>
          <s-list-item>
            In the theme editor, enable App embeds and add the review blocks to
            product pages.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
