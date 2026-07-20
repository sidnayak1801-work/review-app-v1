-- CreateEnum
CREATE TYPE "ReviewImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ReviewImport" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "ReviewImportStatus" NOT NULL DEFAULT 'PENDING',
    "fileKey" TEXT NOT NULL,
    "contentHash" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorFileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewImport_shopId_createdAt_idx" ON "ReviewImport"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewImport_shopId_contentHash_key" ON "ReviewImport"("shopId", "contentHash");

-- AddForeignKey
ALTER TABLE "ReviewImport" ADD CONSTRAINT "ReviewImport_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
