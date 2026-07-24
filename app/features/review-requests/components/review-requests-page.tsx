import { Form, Link, useNavigation } from "react-router";

import { formatRelativeTime, statusBadgeTone } from "../../../lib/ui-format";

type ReviewRequestStatus =
  | "SCHEDULED"
  | "SENT"
  | "FAILED"
  | "CANCELLED"
  | "COMPLETED";

interface ReviewRequestListItem {
  id: string;
  shopifyOrderId: string;
  shopifyProductId: string;
  customerEmail: string;
  status: ReviewRequestStatus;
  scheduledAt: string;
  sentAt: string | null;
  reminderSentAt: string | null;
  attemptCount: number;
  lastErrorCode: string | null;
  createdAt: string;
}

interface ReviewRequestSettingsView {
  requestDelayDays: number;
  domesticDelayDays: number;
  internationalDelayDays: number;
  homeCountryCode: string;
  emailSubject: string;
  emailBodyHtml: string;
  reminderEnabled: boolean;
  reminderDelayDays: number;
  reminderSubject: string;
  reminderBodyHtml: string;
}

interface ReviewRequestsPageProps {
  requests: ReviewRequestListItem[];
  reviewRequestUsage: {
    used: number;
    limit: number;
    monthLabel: string;
  };
  shopPlan: "FREE" | "PRO";
  settings: ReviewRequestSettingsView;
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
  };
}

function statusLabel(status: ReviewRequestStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "Scheduled";
    case "SENT":
      return "Sent";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
  }
}

function groupRequests(requests: ReviewRequestListItem[]) {
  const map = new Map<string, ReviewRequestListItem[]>();
  for (const request of requests) {
    const list = map.get(request.shopifyOrderId) ?? [];
    list.push(request);
    map.set(request.shopifyOrderId, list);
  }
  return [...map.entries()];
}

export function ReviewRequestsPage({
  requests,
  reviewRequestUsage,
  shopPlan,
  settings,
  actionData,
}: ReviewRequestsPageProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const atLimit = reviewRequestUsage.used >= reviewRequestUsage.limit;
  const orderGroups = groupRequests(requests);

  return (
    <s-page heading="Review requests">
      <s-stack direction="block" gap="large">
        <s-text color="subdued">
          Schedule post-fulfillment emails and track monthly usage.
        </s-text>

      <s-box padding="base" border="base" borderRadius="large" background="subdued">
        <s-stack direction="block" gap="small">
          <s-text type="strong">
            {reviewRequestUsage.used} / {reviewRequestUsage.limit} emails ·{" "}
            {reviewRequestUsage.monthLabel}
          </s-text>
          {atLimit ? (
            <s-banner tone="warning" heading="Monthly limit reached">
              {shopPlan === "FREE" ? (
                <>
                  New review-request emails are paused until next month or you{" "}
                  <Link to="/app/billing">upgrade to Pro</Link>.
                </>
              ) : (
                <>
                  New review-request emails are paused until next month.{" "}
                  <Link to="/app/billing">View billing</Link>.
                </>
              )}
            </s-banner>
          ) : (
            <s-text color="subdued">
              One email per order (Free ≤5 products listed; Pro all). Each email
              uses one credit.
            </s-text>
          )}
        </s-stack>
      </s-box>

      <s-section heading="Request settings">
        {actionData ? (
          <s-banner
            tone={actionData.ok ? "success" : "critical"}
            heading={actionData.ok ? "Saved" : "Could not save"}
          >
            {actionData.message}
            {actionData.issues?.length ? (
              <s-unordered-list>
                {actionData.issues.map((issue) => (
                  <s-list-item key={issue}>{issue}</s-list-item>
                ))}
              </s-unordered-list>
            ) : null}
          </s-banner>
        ) : null}

        <Form method="post">
          <input type="hidden" name="intent" value="save-settings" />
          <s-stack direction="block" gap="base">
            {shopPlan === "FREE" ? (
              <s-text-field
                label="Delay after fulfillment (days)"
                name="requestDelayDays"
                value={String(settings.requestDelayDays)}
                details="Free plan: 1–14 days. Default 3."
              />
            ) : (
              <>
                <s-text-field
                  label="Domestic delay (days)"
                  name="domesticDelayDays"
                  value={String(settings.domesticDelayDays)}
                  details="1–30 days for orders shipping to your home country."
                />
                <s-text-field
                  label="International delay (days)"
                  name="internationalDelayDays"
                  value={String(settings.internationalDelayDays)}
                  details="1–30 days for other countries."
                />
                <s-text-field
                  label="Home country code"
                  name="homeCountryCode"
                  value={settings.homeCountryCode}
                  details="ISO 2-letter code (e.g. US, IN, GB)."
                />
                <input
                  type="hidden"
                  name="requestDelayDays"
                  value={String(settings.requestDelayDays)}
                />
              </>
            )}

            {shopPlan === "FREE" ? (
              <>
                <input
                  type="hidden"
                  name="domesticDelayDays"
                  value={String(settings.requestDelayDays)}
                />
                <input
                  type="hidden"
                  name="internationalDelayDays"
                  value={String(settings.requestDelayDays)}
                />
                <input
                  type="hidden"
                  name="homeCountryCode"
                  value={settings.homeCountryCode}
                />
              </>
            ) : null}

            <s-text-field
              label="Email subject"
              name="emailSubject"
              value={settings.emailSubject}
            />
            <s-text-area
              label="Email body"
              name="emailBodyHtml"
              value={settings.emailBodyHtml}
              details="Placeholders: {{shop_name}}, {{shop_name_suffix}}, {{product_list}}, {{review_links}}"
            />

            <s-checkbox
              name="reminderEnabled"
              label="Send one reminder if reviews are still incomplete"
              checked={settings.reminderEnabled}
            />
            <s-text-field
              label="Reminder delay after first email (days)"
              name="reminderDelayDays"
              value={String(settings.reminderDelayDays)}
              details="1–14 days. Reminder uses one monthly email credit."
            />
            <s-text-field
              label="Reminder subject"
              name="reminderSubject"
              value={settings.reminderSubject}
            />
            <s-text-area
              label="Reminder body"
              name="reminderBodyHtml"
              value={settings.reminderBodyHtml}
              details="Same placeholders as the first email."
            />

            <s-button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save settings"}
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Recent requests">
        {orderGroups.length === 0 ? (
          <s-box padding="base" border="base" borderRadius="large" background="subdued">
            <s-text color="subdued">
              No review requests yet. Fulfill an order to schedule the first request.
            </s-text>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {orderGroups.map(([orderId, items]) => (
              <s-box
                key={orderId}
                padding="base"
                border="base"
                borderRadius="large"
              >
                <s-stack direction="block" gap="small">
                  <s-stack
                    direction="inline"
                    gap="small"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <s-text type="strong">
                      Order {orderId} · {items.length} product
                      {items.length === 1 ? "" : "s"}
                    </s-text>
                    <s-text color="subdued">
                      {formatRelativeTime(items[0]?.createdAt ?? items[0]!.scheduledAt)}
                    </s-text>
                  </s-stack>
                  {items.map((request) => (
                    <s-box key={request.id} padding="small" background="subdued" borderRadius="base">
                      <s-stack direction="block" gap="small-200">
                        <s-stack direction="inline" gap="small" alignItems="center">
                          <s-badge tone={statusBadgeTone(request.status)}>
                            {statusLabel(request.status)}
                          </s-badge>
                          <s-text>{request.customerEmail}</s-text>
                        </s-stack>
                        <s-text color="subdued">
                          Product: {request.shopifyProductId}
                          {request.sentAt
                            ? ` · Sent ${formatRelativeTime(request.sentAt)}`
                            : ` · Scheduled ${formatRelativeTime(request.scheduledAt)}`}
                          {request.reminderSentAt
                            ? ` · Reminder ${formatRelativeTime(request.reminderSentAt)}`
                            : ""}
                        </s-text>
                        {request.lastErrorCode ? (
                          <s-text color="subdued">
                            Last error: {request.lastErrorCode}
                          </s-text>
                        ) : null}
                      </s-stack>
                    </s-box>
                  ))}
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
      </s-stack>
    </s-page>
  );
}
