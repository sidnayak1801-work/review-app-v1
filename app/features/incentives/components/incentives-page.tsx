import { Form } from "react-router";

import type { AdminIncentiveCampaign } from "../incentive.service.server";

interface IncentivesPageProps {
  campaign: AdminIncentiveCampaign;
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
  };
  isSubmitting: boolean;
}

export function IncentivesPage({
  campaign,
  actionData,
  isSubmitting,
}: IncentivesPageProps) {
  return (
    <s-page heading="Incentives">
      <s-stack direction="block" gap="large">
        <s-stack direction="block" gap="small">
          <s-text color="subdued">
            Reward customers after they leave a review with a Shopify discount
            code and an optional referral prompt. No coupon engine — paste a
            code you already created in Shopify Admin.
          </s-text>
        </s-stack>

        {actionData ? (
          <s-banner
            heading={actionData.ok ? "Saved" : "Could not save"}
            tone={actionData.ok ? "success" : "critical"}
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
          <s-stack direction="block" gap="large">
            <s-box
              padding="base"
              border="base"
              borderRadius="large"
              background="base"
            >
              <s-stack direction="block" gap="base">
                <s-heading>Post-review offer</s-heading>
                <s-checkbox
                  name="enabled"
                  label="Enable post-review incentives"
                  checked={campaign.enabled}
                  details="When enabled, the thank-you step can show your coupon and referral message after a successful review."
                />
              </s-stack>
            </s-box>

            <s-box
              padding="base"
              border="base"
              borderRadius="large"
              background="base"
            >
              <s-stack direction="block" gap="base">
                <s-heading>Thank-you message</s-heading>
                <s-text-field
                  name="thankYouTitle"
                  label="Headline"
                  value={campaign.thankYouTitle}
                  maxLength={120}
                  autocomplete="off"
                />
                <s-text-area
                  name="thankYouBody"
                  label="Description"
                  value={campaign.thankYouBody}
                  rows={3}
                />
              </s-stack>
            </s-box>

            <s-box
              padding="base"
              border="base"
              borderRadius="large"
              background="base"
            >
              <s-stack direction="block" gap="base">
                <s-heading>Coupon reward</s-heading>
                <s-text color="subdued">
                  Create the discount in Shopify Admin → Discounts, then paste
                  the code here.
                </s-text>
                <s-checkbox
                  name="couponEnabled"
                  label="Show coupon after review"
                  checked={campaign.couponEnabled}
                />
                <s-text-field
                  name="couponCode"
                  label="Discount code"
                  value={campaign.couponCode}
                  placeholder="THANKS10"
                  autocomplete="off"
                />
                <s-text-field
                  name="couponHeadline"
                  label="Coupon headline"
                  value={campaign.couponHeadline}
                  placeholder="10% off your next order"
                  autocomplete="off"
                />
                <s-text-area
                  name="couponDescription"
                  label="Coupon description"
                  value={campaign.couponDescription}
                  rows={2}
                />
              </s-stack>
            </s-box>

            <s-box
              padding="base"
              border="base"
              borderRadius="large"
              background="base"
            >
              <s-stack direction="block" gap="base">
                <s-heading>Referral prompt</s-heading>
                <s-text color="subdued">
                  A simple message after review. Future referral tracking will
                  plug in here without changing this settings shape.
                </s-text>
                <s-checkbox
                  name="referralEnabled"
                  label="Show referral prompt after review"
                  checked={campaign.referralEnabled}
                />
                <s-text-area
                  name="referralMessage"
                  label="Referral message"
                  value={campaign.referralMessage}
                  rows={3}
                  placeholder="Know someone who would love this? Share the store."
                />
                <s-text-field
                  name="referralCtaLabel"
                  label="Button label"
                  value={campaign.referralCtaLabel}
                  placeholder="Share with a friend"
                  autocomplete="off"
                />
                <s-text-field
                  name="referralCtaUrl"
                  label="Button URL (optional)"
                  value={campaign.referralCtaUrl}
                  placeholder="https://"
                  autocomplete="off"
                  details="Must be http:// or https:// when set."
                />
              </s-stack>
            </s-box>

            <s-stack direction="inline" gap="small">
              <s-button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save incentives"}
              </s-button>
            </s-stack>
          </s-stack>
        </Form>
      </s-stack>
    </s-page>
  );
}
