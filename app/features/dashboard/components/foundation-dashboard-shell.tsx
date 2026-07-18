interface FoundationDashboardShellProps {
  shopDomain: string;
}

export function FoundationDashboardShell({
  shopDomain,
}: FoundationDashboardShellProps) {
  return (
    <s-page heading="Review App">
      <s-banner heading="Foundation ready" tone="success">
        The embedded application, shared infrastructure, and database
        connection are configured.
      </s-banner>

      <s-section heading="Connected store">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-text type="strong">Authentication</s-text>
            <s-badge tone="success">Connected</s-badge>
          </s-stack>
          <s-paragraph>
            <s-text type="strong">Shop domain: </s-text>
            {shopDomain}
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Foundation status">
        <s-unordered-list>
          <s-list-item>Neon PostgreSQL and Prisma configured</s-list-item>
          <s-list-item>Environment variables validated with Zod</s-list-item>
          <s-list-item>Structured logging and domain errors ready</s-list-item>
          <s-list-item>Shop domain core isolated behind services</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Next phase">
        <s-paragraph>
          Shop installation, updates, uninstall state, and merchant settings
          are intentionally deferred to Phase 1.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
