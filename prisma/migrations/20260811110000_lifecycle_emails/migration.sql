-- CreateEnum
CREATE TYPE "LifecycleEmailType" AS ENUM (
  'WELCOME',
  'ONBOARDING_REMINDER_24H',
  'ONBOARDING_REMINDER_3D',
  'ONBOARDING_COMPLETED'
);

-- CreateEnum
CREATE TYPE "LifecycleEmailStatus" AS ENUM (
  'SCHEDULED',
  'PROCESSING',
  'SENT',
  'FAILED',
  'CANCELLED'
);

-- AlterTable Shop: additive lifecycle fields
ALTER TABLE "Shop" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Shop" ADD COLUMN "firstInstalledAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN "latestInstalledAt" TIMESTAMP(3);

-- Backfill install history from existing installedAt
UPDATE "Shop"
SET
  "firstInstalledAt" = "installedAt",
  "latestInstalledAt" = "installedAt"
WHERE "firstInstalledAt" IS NULL OR "latestInstalledAt" IS NULL;

ALTER TABLE "Shop" ALTER COLUMN "firstInstalledAt" SET NOT NULL;
ALTER TABLE "Shop" ALTER COLUMN "firstInstalledAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Shop" ALTER COLUMN "latestInstalledAt" SET NOT NULL;
ALTER TABLE "Shop" ALTER COLUMN "latestInstalledAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable OnboardingStatus
ALTER TABLE "OnboardingStatus" ADD COLUMN "startedAt" TIMESTAMP(3);

-- CreateTable LifecycleEmail
CREATE TABLE "LifecycleEmail" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "type" "LifecycleEmailType" NOT NULL,
  "status" "LifecycleEmailStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "providerMessageId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LifecycleEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifecycleEmail_shopId_type_key" ON "LifecycleEmail"("shopId", "type");
CREATE INDEX "LifecycleEmail_status_scheduledFor_idx" ON "LifecycleEmail"("status", "scheduledFor");
CREATE INDEX "LifecycleEmail_shopId_status_idx" ON "LifecycleEmail"("shopId", "status");

ALTER TABLE "LifecycleEmail"
  ADD CONSTRAINT "LifecycleEmail_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
