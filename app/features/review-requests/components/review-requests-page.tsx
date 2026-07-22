import { Form, Link, useNavigation } from "react-router";

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

function statusTone(
  status: ReviewRequestStatus,
): "success" | "warning" | "critical" | "info" {
  switch (status) {
    case "SENT":
    case "COMPLETED":
      return "success";
    case "SCHEDULED":
      return "info";
    case "FAILED":
      return "warning";
    case "CANCELLED":
      return "critical";
  }
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
  const isSubmitting = navigation.state !== "idle";
  const atLimit = reviewRequestUsage.used >= reviewRequestUsage.limit;
  const orderGroups = groupRequests(requests);

  return (
    <s-page heading="Review requests">
      <s-section heading="Monthly usage">
        <s-stack direction="block" gap="small">
          <s-paragraph>
            Review-request emails sent in {reviewRequestUsage.monthLabel}:{" "}
            {reviewRequestUsage.used} / {reviewRequestUsage.limit}
          </s-paragraph>
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
          ) : null}
          <s-paragraph>
            One email is sent per order (Free lists up to 5 products; Pro lists
            all). Each email uses one monthly credit.
          </s-paragraph>
        </s-stack>
      </s-section>

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
          <s-paragraph>
            No review requests yet. Fulfill an order to schedule the first
            request.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {orderGroups.map(([orderId, items]) => (
              <s-box
                key={orderId}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-paragraph>
                    <s-text type="strong">Order:</s-text> {orderId} ·{" "}
                    {items.length} product{items.length === 1 ? "" : "s"}
                  </s-paragraph>
                  {items.map((request) => (
                    <s-box key={request.id} padding="small">
                      <s-stack direction="block" gap="small">
                        <s-stack direction="inline" gap="small">
                          <s-badge tone={statusTone(request.status)}>
                            {statusLabel(request.status)}
                          </s-badge>
                          <s-text>{request.customerEmail}</s-text>
                        </s-stack>
                        <s-paragraph>
                          Product: {request.shopifyProductId}
                        </s-paragraph>
                        <s-paragraph>
                          Scheduled:{" "}
                          {new Date(request.scheduledAt).toLocaleString()}
                          {request.sentAt
                            ? ` · Sent: ${new Date(request.sentAt).toLocaleString()}`
                            : ""}
                          {request.reminderSentAt
                            ? ` · Reminder: ${new Date(request.reminderSentAt).toLocaleString()}`
                            : ""}
                        </s-paragraph>
                        {request.lastErrorCode ? (
                          <s-paragraph>
                            Last error: {request.lastErrorCode}
                          </s-paragraph>
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
    </s-page>
  );
}
