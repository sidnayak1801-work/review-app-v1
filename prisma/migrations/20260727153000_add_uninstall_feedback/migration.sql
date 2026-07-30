-- CreateTable
CREATE TABLE "UninstallFeedback" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "reasons" TEXT[],
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UninstallFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UninstallFeedback_shopId_createdAt_idx" ON "UninstallFeedback"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "UninstallFeedback" ADD CONSTRAINT "UninstallFeedback_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
