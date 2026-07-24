-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN', 'ANSWERED');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "productTitle" TEXT,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "answeredAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_shopId_status_createdAt_idx" ON "Question"("shopId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Question_shopId_shopifyProductId_status_createdAt_idx" ON "Question"("shopId", "shopifyProductId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Question_shopId_email_idx" ON "Question"("shopId", "email");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
