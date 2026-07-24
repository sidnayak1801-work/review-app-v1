import { formatRelativeTime } from "../../../lib/ui-format";
import type { ActivityFeedItem } from "../dashboard.activity";

interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <s-section heading="Recent activity">
      {items.length === 0 ? (
        <s-text color="subdued">No recent activity.</s-text>
      ) : (
        <s-stack direction="block" gap="small">
          {items.map((item) => (
            <s-box
              key={item.id}
              padding="small"
              border="base"
              borderRadius="base"
              background="base"
            >
              <s-stack direction="block" gap="small-200">
                <s-text>{item.message}</s-text>
                <s-text color="subdued">
                  {formatRelativeTime(item.createdAt)}
                </s-text>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      )}
    </s-section>
  );
}
