import {
  DEFAULT_THANK_YOU_BODY,
  DEFAULT_THANK_YOU_TITLE,
  defaultPostReviewCampaign,
  incentiveCampaignRepository,
  type IncentiveCampaignRecord,
  type IncentiveCampaignRepository,
} from "../../repositories/incentive-campaign.repository.server";
import { ValidationError } from "../../lib/domain-error";
import { logger } from "../../services/logger.server";
import {
  upsertPostReviewIncentiveSchema,
  type UpsertPostReviewIncentiveInput,
} from "./incentive.schema";

export type PublicIncentiveOffer = {
  thankYouTitle: string;
  thankYouBody: string;
  coupon: {
    code: string;
    headline: string | null;
    description: string | null;
  } | null;
  referral: {
    message: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
  } | null;
};

export type AdminIncentiveCampaign = {
  id: string | null;
  enabled: boolean;
  thankYouTitle: string;
  thankYouBody: string;
  couponEnabled: boolean;
  couponCode: string;
  couponHeadline: string;
  couponDescription: string;
  referralEnabled: boolean;
  referralMessage: string;
  referralCtaLabel: string;
  referralCtaUrl: string;
};

function toAdminCampaign(
  campaign: IncentiveCampaignRecord | null,
): AdminIncentiveCampaign {
  if (!campaign) {
    const defaults = defaultPostReviewCampaign("unused");
    return {
      id: null,
      enabled: false,
      thankYouTitle: defaults.thankYouTitle,
      thankYouBody: defaults.thankYouBody,
      couponEnabled: false,
      couponCode: "",
      couponHeadline: "",
      couponDescription: "",
      referralEnabled: false,
      referralMessage: "",
      referralCtaLabel: "",
      referralCtaUrl: "",
    };
  }

  return {
    id: campaign.id,
    enabled: campaign.status === "ACTIVE",
    thankYouTitle: campaign.thankYouTitle,
    thankYouBody: campaign.thankYouBody,
    couponEnabled: campaign.couponEnabled,
    couponCode: campaign.couponCode ?? "",
    couponHeadline: campaign.couponHeadline ?? "",
    couponDescription: campaign.couponDescription ?? "",
    referralEnabled: campaign.referralEnabled,
    referralMessage: campaign.referralMessage ?? "",
    referralCtaLabel: campaign.referralCtaLabel ?? "",
    referralCtaUrl: campaign.referralCtaUrl ?? "",
  };
}

function parseOrThrow(raw: unknown): UpsertPostReviewIncentiveInput {
  const parsed = upsertPostReviewIncentiveSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid incentive settings",
      parsed.error.issues.map((issue) => issue.message),
    );
  }
  return parsed.data;
}

export class IncentiveService {
  constructor(
    private readonly campaigns: IncentiveCampaignRepository = incentiveCampaignRepository,
  ) {}

  async getAdminCampaignForShop(shopId: string): Promise<AdminIncentiveCampaign> {
    const campaign = await this.campaigns.findPostReviewForShop(shopId);
    return toAdminCampaign(campaign);
  }

  async upsertPostReviewCampaign(
    shopId: string,
    rawInput: unknown,
  ): Promise<AdminIncentiveCampaign> {
    const data = parseOrThrow(rawInput);

    const updated = await this.campaigns.upsertPostReview({
      shopId,
      name: "Post-review offer",
      status: data.enabled ? "ACTIVE" : "PAUSED",
      couponEnabled: data.couponEnabled,
      couponCode: data.couponCode,
      couponHeadline: data.couponHeadline,
      couponDescription: data.couponDescription,
      referralEnabled: data.referralEnabled,
      referralMessage: data.referralMessage,
      referralCtaLabel: data.referralCtaLabel,
      referralCtaUrl: data.referralCtaUrl,
      thankYouTitle: data.thankYouTitle || DEFAULT_THANK_YOU_TITLE,
      thankYouBody: data.thankYouBody || DEFAULT_THANK_YOU_BODY,
    });

    logger.info("Post-review incentive campaign saved", {
      shopId,
      campaignId: updated.id,
      status: updated.status,
      couponEnabled: updated.couponEnabled,
      referralEnabled: updated.referralEnabled,
    });

    return toAdminCampaign(updated);
  }

  /**
   * Public offer after a successful review submit only.
   * Returns null when the campaign is inactive or has no enabled offers.
   */
  async getPublicOfferForShop(
    shopId: string,
  ): Promise<PublicIncentiveOffer | null> {
    const campaign = await this.campaigns.findActivePostReviewForShop(shopId);
    if (!campaign) {
      return null;
    }

    const coupon =
      campaign.couponEnabled && campaign.couponCode
        ? {
            code: campaign.couponCode,
            headline: campaign.couponHeadline,
            description: campaign.couponDescription,
          }
        : null;

    const referral =
      campaign.referralEnabled && campaign.referralMessage
        ? {
            message: campaign.referralMessage,
            ctaLabel: campaign.referralCtaLabel,
            ctaUrl: campaign.referralCtaUrl,
          }
        : null;

    if (!coupon && !referral) {
      // Still return thank-you copy customization when campaign is active
      // with only custom thank-you text (no offers).
      return {
        thankYouTitle: campaign.thankYouTitle,
        thankYouBody: campaign.thankYouBody,
        coupon: null,
        referral: null,
      };
    }

    return {
      thankYouTitle: campaign.thankYouTitle,
      thankYouBody: campaign.thankYouBody,
      coupon,
      referral,
    };
  }
}

export const incentiveService = new IncentiveService();
