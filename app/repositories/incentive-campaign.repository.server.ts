import type { Prisma, PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export type IncentiveCampaignType = "POST_REVIEW";
export type IncentiveCampaignStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED";

export interface IncentiveCampaignRecord {
  id: string;
  shopId: string;
  name: string;
  type: IncentiveCampaignType;
  status: IncentiveCampaignStatus;
  couponEnabled: boolean;
  couponCode: string | null;
  couponHeadline: string | null;
  couponDescription: string | null;
  referralEnabled: boolean;
  referralMessage: string | null;
  referralCtaLabel: string | null;
  referralCtaUrl: string | null;
  thankYouTitle: string;
  thankYouBody: string;
  weight: number;
  experimentKey: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UpsertPostReviewCampaignInput = {
  shopId: string;
  name?: string;
  status: IncentiveCampaignStatus;
  couponEnabled: boolean;
  couponCode: string | null;
  couponHeadline: string | null;
  couponDescription: string | null;
  referralEnabled: boolean;
  referralMessage: string | null;
  referralCtaLabel: string | null;
  referralCtaUrl: string | null;
  thankYouTitle: string;
  thankYouBody: string;
};

const CAMPAIGN_SELECT = {
  id: true,
  shopId: true,
  name: true,
  type: true,
  status: true,
  couponEnabled: true,
  couponCode: true,
  couponHeadline: true,
  couponDescription: true,
  referralEnabled: true,
  referralMessage: true,
  referralCtaLabel: true,
  referralCtaUrl: true,
  thankYouTitle: true,
  thankYouBody: true,
  weight: true,
  experimentKey: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  updatedAt: true,
  //@ts-ignore
} satisfies Prisma.IncentiveCampaignSelect;

function campaignModel(database: PrismaClient) {
  //@ts-ignore
  return database.incentiveCampaign;
}

export const DEFAULT_THANK_YOU_TITLE = "Thanks for your review!";
export const DEFAULT_THANK_YOU_BODY =
  "Thanks for your review! We are processing it and it will appear on the store once approved.";

export function defaultPostReviewCampaign(
  shopId: string,
): UpsertPostReviewCampaignInput {
  return {
    shopId,
    name: "Post-review offer",
    status: "PAUSED",
    couponEnabled: false,
    couponCode: null,
    couponHeadline: null,
    couponDescription: null,
    referralEnabled: false,
    referralMessage: null,
    referralCtaLabel: null,
    referralCtaUrl: null,
    thankYouTitle: DEFAULT_THANK_YOU_TITLE,
    thankYouBody: DEFAULT_THANK_YOU_BODY,
  };
}

export interface IncentiveCampaignRepository {
  findPostReviewForShop(
    shopId: string,
  ): Promise<IncentiveCampaignRecord | null>;
  findActivePostReviewForShop(
    shopId: string,
  ): Promise<IncentiveCampaignRecord | null>;
  upsertPostReview(
    input: UpsertPostReviewCampaignInput,
  ): Promise<IncentiveCampaignRecord>;
}

export class PrismaIncentiveCampaignRepository
  implements IncentiveCampaignRepository
{
  constructor(private readonly database: PrismaClient = prisma) {}

  async findPostReviewForShop(
    shopId: string,
  ): Promise<IncentiveCampaignRecord | null> {
    return campaignModel(this.database).findFirst({
      where: { shopId, type: "POST_REVIEW" },
      orderBy: { createdAt: "asc" },
      select: CAMPAIGN_SELECT,
    });
  }

  async findActivePostReviewForShop(
    shopId: string,
  ): Promise<IncentiveCampaignRecord | null> {
    return campaignModel(this.database).findFirst({
      where: { shopId, type: "POST_REVIEW", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: CAMPAIGN_SELECT,
    });
  }

  async upsertPostReview(
    input: UpsertPostReviewCampaignInput,
  ): Promise<IncentiveCampaignRecord> {
    const existing = await this.findPostReviewForShop(input.shopId);
    const data = {
      name: input.name ?? "Post-review offer",
      status: input.status,
      couponEnabled: input.couponEnabled,
      couponCode: input.couponCode,
      couponHeadline: input.couponHeadline,
      couponDescription: input.couponDescription,
      referralEnabled: input.referralEnabled,
      referralMessage: input.referralMessage,
      referralCtaLabel: input.referralCtaLabel,
      referralCtaUrl: input.referralCtaUrl,
      thankYouTitle: input.thankYouTitle,
      thankYouBody: input.thankYouBody,
      type: "POST_REVIEW" as const,
    };

    if (existing) {
      return campaignModel(this.database).update({
        where: { id: existing.id },
        data,
        select: CAMPAIGN_SELECT,
      });
    }

    return campaignModel(this.database).create({
      data: {
        shopId: input.shopId,
        ...data,
      },
      select: CAMPAIGN_SELECT,
    });
  }
}

export const incentiveCampaignRepository =
  new PrismaIncentiveCampaignRepository();
