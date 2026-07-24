const ACTIONS = [
  {
    href: "/app/reviews",
    title: "Moderate reviews",
    description: "Approve, hide, or delete customer feedback.",
  },
  {
    href: "/app/settings",
    title: "Customize widget",
    description: "Colors, layout, and storefront display options.",
  },
  {
    href: "/app/review-requests",
    title: "Review requests",
    description: "Post-fulfillment emails and monthly usage.",
  },
  {
    href: "/app/imports",
    title: "Import reviews",
    description: "Bring existing reviews in with a CSV upload.",
  },
  {
    href: "/app/billing",
    title: "Billing",
    description: "Compare Free vs Pro limits and upgrade.",
  },
] as const;

export function QuickActions() {
  return (
    <s-section heading="Quick actions">
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size > 720px) repeat(3, minmax(0, 1fr)), @container (inline-size > 420px) repeat(2, minmax(0, 1fr)), 1fr"
          gap="base"
        >
          {ACTIONS.map((action) => (
            <s-grid-item key={action.href}>
              <s-box
                padding="base"
                border="base"
                borderRadius="large"
                background="base"
              >
                <s-stack direction="block" gap="small">
                  <s-text type="strong">{action.title}</s-text>
                  <s-text color="subdued">{action.description}</s-text>
                  <s-button href={action.href} variant="secondary">
                    Open
                  </s-button>
                </s-stack>
              </s-box>
            </s-grid-item>
          ))}
        </s-grid>
      </s-query-container>
    </s-section>
  );
}
