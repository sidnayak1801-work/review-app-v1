-- AlterTable
ALTER TABLE "Review" ADD COLUMN "hasImage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN "hasVideo" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from existing media
UPDATE "Review" AS r
SET
  "hasImage" = EXISTS (
    SELECT 1 FROM "ReviewMedia" m
    WHERE m."reviewId" = r.id AND m.kind = 'IMAGE'
  ),
  "hasVideo" = EXISTS (
    SELECT 1 FROM "ReviewMedia" m
    WHERE m."reviewId" = r.id AND m.kind = 'VIDEO'
  );

-- CreateIndex
CREATE INDEX "Review_shopId_shopifyProductId_status_rating_createdAt_idx"
  ON "Review"("shopId", "shopifyProductId", "status", "rating", "createdAt");

CREATE INDEX "Review_shopId_shopifyProductId_status_hasImage_createdAt_idx"
  ON "Review"("shopId", "shopifyProductId", "status", "hasImage", "createdAt");

CREATE INDEX "Review_shopId_shopifyProductId_status_hasVideo_createdAt_idx"
  ON "Review"("shopId", "shopifyProductId", "status", "hasVideo", "createdAt");
