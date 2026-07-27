import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import prisma from "../db.server";

export type IntegrationProviderDb = "KLAVIYO" | "GORGIAS";
export type IntegrationConnectionStatusDb =
  | "DISCONNECTED"
  | "CONNECTED"
  | "ERROR";
export type IntegrationEntityTypeDb = "REVIEW" | "REVIEW_REQUEST";
export type IntegrationExternalTypeDb = "TICKET" | "EVENT";

export interface IntegrationConnectionRecord {
  id: string;
  shopId: string;
  provider: IntegrationProviderDb;
  status: IntegrationConnectionStatusDb;
  credentialsEncrypted: string | null;
  credentialsKeyVersion: number;
  metadata: Prisma.JsonValue | null;
  lastError: string | null;
  lastSuccessAt: Date | null;
  connectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationExternalRefRecord {
  id: string;
  shopId: string;
  provider: IntegrationProviderDb;
  entityType: IntegrationEntityTypeDb;
  entityId: string;
  externalId: string;
  externalType: IntegrationExternalTypeDb;
  createdAt: Date;
  updatedAt: Date;
}

const connectionSelect = {
  id: true,
  shopId: true,
  provider: true,
  status: true,
  credentialsEncrypted: true,
  credentialsKeyVersion: true,
  metadata: true,
  lastError: true,
  lastSuccessAt: true,
  connectedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IntegrationConnectionSelect;

const externalRefSelect = {
  id: true,
  shopId: true,
  provider: true,
  entityType: true,
  entityId: true,
  externalId: true,
  externalType: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IntegrationExternalRefSelect;

export interface IntegrationRepository {
  listConnectionsForShop(shopId: string): Promise<IntegrationConnectionRecord[]>;
  findConnection(
    shopId: string,
    provider: IntegrationProviderDb,
  ): Promise<IntegrationConnectionRecord | null>;
  listConnectedForShop(shopId: string): Promise<IntegrationConnectionRecord[]>;
  upsertConnection(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    status: IntegrationConnectionStatusDb;
    credentialsEncrypted: string | null;
    credentialsKeyVersion: number;
    metadata?: Prisma.InputJsonValue | null;
    lastError?: string | null;
    lastSuccessAt?: Date | null;
    connectedAt?: Date | null;
  }): Promise<IntegrationConnectionRecord>;
  markConnectionResult(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    status: IntegrationConnectionStatusDb;
    lastError?: string | null;
    lastSuccessAt?: Date | null;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<IntegrationConnectionRecord | null>;
  disconnect(input: {
    shopId: string;
    provider: IntegrationProviderDb;
  }): Promise<IntegrationConnectionRecord | null>;
  upsertExternalRef(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    entityType: IntegrationEntityTypeDb;
    entityId: string;
    externalId: string;
    externalType: IntegrationExternalTypeDb;
  }): Promise<IntegrationExternalRefRecord>;
  findExternalRef(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    entityType: IntegrationEntityTypeDb;
    entityId: string;
    externalType: IntegrationExternalTypeDb;
  }): Promise<IntegrationExternalRefRecord | null>;
}

export class PrismaIntegrationRepository implements IntegrationRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listConnectionsForShop(
    shopId: string,
  ): Promise<IntegrationConnectionRecord[]> {
    return this.db.integrationConnection.findMany({
      where: { shopId },
      select: connectionSelect,
      orderBy: { provider: "asc" },
    });
  }

  async findConnection(
    shopId: string,
    provider: IntegrationProviderDb,
  ): Promise<IntegrationConnectionRecord | null> {
    return this.db.integrationConnection.findUnique({
      where: { shopId_provider: { shopId, provider } },
      select: connectionSelect,
    });
  }

  async listConnectedForShop(
    shopId: string,
  ): Promise<IntegrationConnectionRecord[]> {
    return this.db.integrationConnection.findMany({
      where: {
        shopId,
        status: { in: ["CONNECTED", "ERROR"] },
        credentialsEncrypted: { not: null },
      },
      select: connectionSelect,
    });
  }

  async upsertConnection(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    status: IntegrationConnectionStatusDb;
    credentialsEncrypted: string | null;
    credentialsKeyVersion: number;
    metadata?: Prisma.InputJsonValue | null;
    lastError?: string | null;
    lastSuccessAt?: Date | null;
    connectedAt?: Date | null;
  }): Promise<IntegrationConnectionRecord> {
    return this.db.integrationConnection.upsert({
      where: {
        shopId_provider: { shopId: input.shopId, provider: input.provider },
      },
      create: {
        shopId: input.shopId,
        provider: input.provider,
        status: input.status,
        credentialsEncrypted: input.credentialsEncrypted,
        credentialsKeyVersion: input.credentialsKeyVersion,
        metadata: input.metadata ?? undefined,
        lastError: input.lastError ?? null,
        lastSuccessAt: input.lastSuccessAt ?? null,
        connectedAt: input.connectedAt ?? null,
      },
      update: {
        status: input.status,
        credentialsEncrypted: input.credentialsEncrypted,
        credentialsKeyVersion: input.credentialsKeyVersion,
        metadata: input.metadata ?? undefined,
        lastError: input.lastError ?? null,
        lastSuccessAt: input.lastSuccessAt ?? null,
        connectedAt: input.connectedAt ?? null,
      },
      select: connectionSelect,
    });
  }

  async markConnectionResult(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    status: IntegrationConnectionStatusDb;
    lastError?: string | null;
    lastSuccessAt?: Date | null;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<IntegrationConnectionRecord | null> {
    try {
      return await this.db.integrationConnection.update({
        where: {
          shopId_provider: { shopId: input.shopId, provider: input.provider },
        },
        data: {
          status: input.status,
          lastError: input.lastError ?? null,
          ...(input.lastSuccessAt !== undefined
            ? { lastSuccessAt: input.lastSuccessAt }
            : {}),
          ...(input.metadata !== undefined
            ? { metadata: input.metadata ?? undefined }
            : {}),
        },
        select: connectionSelect,
      });
    } catch {
      return null;
    }
  }

  async disconnect(input: {
    shopId: string;
    provider: IntegrationProviderDb;
  }): Promise<IntegrationConnectionRecord | null> {
    try {
      return await this.db.integrationConnection.update({
        where: {
          shopId_provider: {
            shopId: input.shopId,
            provider: input.provider,
          },
        },
        data: {
          status: "DISCONNECTED",
          credentialsEncrypted: null,
          lastError: null,
          connectedAt: null,
          metadata: PrismaNamespace.DbNull,
        },
        select: connectionSelect,
      });
    } catch {
      return null;
    }
  }

  async upsertExternalRef(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    entityType: IntegrationEntityTypeDb;
    entityId: string;
    externalId: string;
    externalType: IntegrationExternalTypeDb;
  }): Promise<IntegrationExternalRefRecord> {
    return this.db.integrationExternalRef.upsert({
      where: {
        shopId_provider_entityType_entityId_externalType: {
          shopId: input.shopId,
          provider: input.provider,
          entityType: input.entityType,
          entityId: input.entityId,
          externalType: input.externalType,
        },
      },
      create: input,
      update: { externalId: input.externalId },
      select: externalRefSelect,
    });
  }

  async findExternalRef(input: {
    shopId: string;
    provider: IntegrationProviderDb;
    entityType: IntegrationEntityTypeDb;
    entityId: string;
    externalType: IntegrationExternalTypeDb;
  }): Promise<IntegrationExternalRefRecord | null> {
    return this.db.integrationExternalRef.findUnique({
      where: {
        shopId_provider_entityType_entityId_externalType: {
          shopId: input.shopId,
          provider: input.provider,
          entityType: input.entityType,
          entityId: input.entityId,
          externalType: input.externalType,
        },
      },
      select: externalRefSelect,
    });
  }
}

export const integrationRepository = new PrismaIntegrationRepository();
