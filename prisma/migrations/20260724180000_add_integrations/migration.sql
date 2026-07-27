-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('KLAVIYO', 'GORGIAS');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrationEntityType" AS ENUM ('REVIEW', 'REVIEW_REQUEST');

-- CreateEnum
CREATE TYPE "IntegrationExternalType" AS ENUM ('TICKET', 'EVENT');

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "credentialsEncrypted" TEXT,
    "credentialsKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "lastError" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationExternalRef" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "entityType" "IntegrationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalType" "IntegrationExternalType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationExternalRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_shopId_provider_key" ON "IntegrationConnection"("shopId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationConnection_shopId_status_idx" ON "IntegrationConnection"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationExternalRef_shopId_provider_entityType_entityId_externalType_key" ON "IntegrationExternalRef"("shopId", "provider", "entityType", "entityId", "externalType");

-- CreateIndex
CREATE INDEX "IntegrationExternalRef_shopId_provider_entityType_entityId_idx" ON "IntegrationExternalRef"("shopId", "provider", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationExternalRef" ADD CONSTRAINT "IntegrationExternalRef_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
