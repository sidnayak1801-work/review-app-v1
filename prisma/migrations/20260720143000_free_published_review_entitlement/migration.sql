-- Add PRO plan support and minimal billing entitlement cache fields

-- AlterEnum
ALTER TYPE "ShopPlan" ADD VALUE 'PRO';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "billingStatus" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "billingSyncedAt" TIMESTAMP(3);

