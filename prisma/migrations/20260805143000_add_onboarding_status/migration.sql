-- Additive onboarding progress per shop (1:1).
CREATE TABLE "OnboardingStatus" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "themeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "widgetAdded" BOOLEAN NOT NULL DEFAULT false,
    "reviewsImported" BOOLEAN NOT NULL DEFAULT false,
    "emailConfigured" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingStatus_shopId_key" ON "OnboardingStatus"("shopId");

ALTER TABLE "OnboardingStatus" ADD CONSTRAINT "OnboardingStatus_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
