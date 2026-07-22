-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "submissionTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewRequest_status_scheduledAt_idx" ON "ReviewRequest"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "ReviewRequest_shopId_createdAt_idx" ON "ReviewRequest"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_shopId_shopifyOrderId_shopifyProductId_key" ON "ReviewRequest"("shopId", "shopifyOrderId", "shopifyProductId");

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
