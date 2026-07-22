-- AlterTable
ALTER TABLE "ReviewRequest" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ReviewRequest_shopId_shopifyOrderId_status_idx" ON "ReviewRequest"("shopId", "shopifyOrderId", "status");

-- CreateTable
CREATE TABLE "ReviewRequestSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "requestDelayDays" INTEGER NOT NULL DEFAULT 3,
    "domesticDelayDays" INTEGER NOT NULL DEFAULT 3,
    "internationalDelayDays" INTEGER NOT NULL DEFAULT 3,
    "homeCountryCode" TEXT NOT NULL DEFAULT 'US',
    "emailSubject" TEXT NOT NULL DEFAULT 'How was your purchase?',
    "emailBodyHtml" TEXT NOT NULL DEFAULT '',
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderDelayDays" INTEGER NOT NULL DEFAULT 7,
    "reminderSubject" TEXT NOT NULL DEFAULT 'Reminder: share your review',
    "reminderBodyHtml" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequestSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequestSettings_shopId_key" ON "ReviewRequestSettings"("shopId");

-- AddForeignKey
ALTER TABLE "ReviewRequestSettings" ADD CONSTRAINT "ReviewRequestSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
