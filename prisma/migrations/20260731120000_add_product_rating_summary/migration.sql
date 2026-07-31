-- CreateTable
CREATE TABLE "ProductRatingSummary" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "averageRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "fiveStar" INTEGER NOT NULL DEFAULT 0,
    "fourStar" INTEGER NOT NULL DEFAULT 0,
    "threeStar" INTEGER NOT NULL DEFAULT 0,
    "twoStar" INTEGER NOT NULL DEFAULT 0,
    "oneStar" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRatingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductRatingSummary_shopId_shopifyProductId_idx" ON "ProductRatingSummary"("shopId", "shopifyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRatingSummary_shopId_shopifyProductId_key" ON "ProductRatingSummary"("shopId", "shopifyProductId");

-- AddForeignKey
ALTER TABLE "ProductRatingSummary" ADD CONSTRAINT "ProductRatingSummary_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
