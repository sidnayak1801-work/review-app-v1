-- CreateEnum
CREATE TYPE "IncentiveCampaignType" AS ENUM ('POST_REVIEW');

-- CreateEnum
CREATE TYPE "IncentiveCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "IncentiveCampaign" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Post-review offer',
    "type" "IncentiveCampaignType" NOT NULL DEFAULT 'POST_REVIEW',
    "status" "IncentiveCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "couponEnabled" BOOLEAN NOT NULL DEFAULT false,
    "couponCode" TEXT,
    "couponHeadline" TEXT,
    "couponDescription" TEXT,
    "referralEnabled" BOOLEAN NOT NULL DEFAULT false,
    "referralMessage" TEXT,
    "referralCtaLabel" TEXT,
    "referralCtaUrl" TEXT,
    "thankYouTitle" TEXT NOT NULL DEFAULT 'Thanks for your review!',
    "thankYouBody" TEXT NOT NULL DEFAULT ' Thank you for your review! We are processing it and it will appear on the store once approved.',
    "weight" INTEGER NOT NULL DEFAULT 100,
    "experimentKey" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncentiveCampaign_shopId_type_status_idx" ON "IncentiveCampaign"("shopId", "type", "status");

-- CreateIndex
CREATE INDEX "IncentiveCampaign_shopId_experimentKey_idx" ON "IncentiveCampaign"("shopId", "experimentKey");

-- AddForeignKey
ALTER TABLE "IncentiveCampaign" ADD CONSTRAINT "IncentiveCampaign_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
