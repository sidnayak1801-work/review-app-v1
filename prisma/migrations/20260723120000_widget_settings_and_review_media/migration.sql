-- CreateEnum
CREATE TYPE "WidgetLayout" AS ENUM ('STACKED', 'COMPACT', 'GRID');

-- CreateEnum
CREATE TYPE "ReviewMediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "WidgetSettings" ADD COLUMN "widgetEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WidgetSettings" ADD COLUMN "primaryButtonColor" TEXT NOT NULL DEFAULT '#111111';
ALTER TABLE "WidgetSettings" ADD COLUMN "starColor" TEXT NOT NULL DEFAULT '#22c55e';
ALTER TABLE "WidgetSettings" ADD COLUMN "borderRadius" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "WidgetSettings" ADD COLUMN "cardShadow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WidgetSettings" ADD COLUMN "layout" "WidgetLayout" NOT NULL DEFAULT 'STACKED';
ALTER TABLE "WidgetSettings" ADD COLUMN "showCustomerName" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WidgetSettings" ADD COLUMN "showReviewDate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WidgetSettings" ADD COLUMN "showProductImages" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WidgetSettings" ADD COLUMN "showCustomerPhotos" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WidgetSettings" ADD COLUMN "autoPublishReviews" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WidgetSettings" ADD COLUMN "darkMode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReviewMedia" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "reviewId" TEXT,
    "kind" "ReviewMediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewMedia_shopId_reviewId_idx" ON "ReviewMedia"("shopId", "reviewId");

-- CreateIndex
CREATE INDEX "ReviewMedia_reviewId_position_idx" ON "ReviewMedia"("reviewId", "position");

-- CreateIndex
CREATE INDEX "ReviewMedia_shopId_createdAt_idx" ON "ReviewMedia"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReviewMedia" ADD CONSTRAINT "ReviewMedia_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMedia" ADD CONSTRAINT "ReviewMedia_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
