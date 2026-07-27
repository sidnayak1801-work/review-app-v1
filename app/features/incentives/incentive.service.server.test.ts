import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  IncentiveCampaignRecord,
  IncentiveCampaignRepository,
} from "../../repositories/incentive-campaign.repository.server";
import { ValidationError } from "../../lib/domain-error";
import { IncentiveService } from "./incentive.service.server";

afterEach(() => {
  vi.restoreAllMocks();
});

const baseCampaign: IncentiveCampaignRecord = {
  id: "camp-1",
  shopId: "shop-1",
  name: "Post-review offer",
  type: "POST_REVIEW",
  status: "ACTIVE",
  couponEnabled: true,
  couponCode: "THANKS10",
  couponHeadline: "10% off",
  couponDescription: "Use on your next order",
  referralEnabled: true,
  referralMessage: "Share with a friend",
  referralCtaLabel: "Share",
  referralCtaUrl: "https://example.com/share",
  thankYouTitle: "Thanks!",
  thankYouBody: "We appreciate you.",
  weight: 100,
  experimentKey: null,
  startsAt: null,
  endsAt: null,
  createdAt: new Date("2026-07-24T00:00:00.000Z"),
  updatedAt: new Date("2026-07-24T00:00:00.000Z"),
};

function createRepository(
  overrides: Partial<IncentiveCampaignRepository> = {},
): IncentiveCampaignRepository {
  return {
    findPostReviewForShop: vi.fn().mockResolvedValue(baseCampaign),
    findActivePostReviewForShop: vi.fn().mockResolvedValue(baseCampaign),
    upsertPostReview: vi.fn().mockResolvedValue(baseCampaign),
    ...overrides,
  };
}

describe("IncentiveService", () => {
  it("rejects coupon enable without a code", async () => {
    const repository = createRepository();
    const service = new IncentiveService(repository);

    await expect(
      service.upsertPostReviewCampaign("shop-1", {
        enabled: true,
        couponEnabled: true,
        couponCode: "",
        thankYouTitle: "Thanks!",
        thankYouBody: "Body",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.upsertPostReview).not.toHaveBeenCalled();
  });

  it("upserts an ACTIVE campaign when enabled", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const service = new IncentiveService(repository);

    await service.upsertPostReviewCampaign("shop-1", {
      enabled: true,
      couponEnabled: true,
      couponCode: "THANKS10",
      couponHeadline: "10% off",
      couponDescription: "Next order",
      referralEnabled: false,
      thankYouTitle: "Thanks!",
      thankYouBody: "Body",
    });

    expect(repository.upsertPostReview).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        status: "ACTIVE",
        couponEnabled: true,
        couponCode: "THANKS10",
        referralEnabled: false,
      }),
    );
  });

  it("returns public offer with coupon and referral for active campaigns", async () => {
    const service = new IncentiveService(createRepository());
    const offer = await service.getPublicOfferForShop("shop-1");

    expect(offer).toEqual({
      thankYouTitle: "Thanks!",
      thankYouBody: "We appreciate you.",
      coupon: {
        code: "THANKS10",
        headline: "10% off",
        description: "Use on your next order",
      },
      referral: {
        message: "Share with a friend",
        ctaLabel: "Share",
        ctaUrl: "https://example.com/share",
      },
    });
  });

  it("omits coupon from public offer when coupon is disabled", async () => {
    const repository = createRepository({
      findActivePostReviewForShop: vi.fn().mockResolvedValue({
        ...baseCampaign,
        couponEnabled: false,
        couponCode: "SECRET",
      }),
    });
    const service = new IncentiveService(repository);
    const offer = await service.getPublicOfferForShop("shop-1");

    expect(offer?.coupon).toBeNull();
    expect(JSON.stringify(offer)).not.toContain("SECRET");
  });

  it("returns null when no active campaign exists", async () => {
    const repository = createRepository({
      findActivePostReviewForShop: vi.fn().mockResolvedValue(null),
    });
    const service = new IncentiveService(repository);

    await expect(service.getPublicOfferForShop("shop-1")).resolves.toBeNull();
  });
});
