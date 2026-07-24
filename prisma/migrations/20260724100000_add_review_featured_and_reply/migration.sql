-- AlterTable
ALTER TABLE "Review" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN "merchantReply" TEXT;
ALTER TABLE "Review" ADD COLUMN "merchantReplyAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Review_shopId_shopifyProductId_featured_idx" ON "Review"("shopId", "shopifyProductId", "featured");
