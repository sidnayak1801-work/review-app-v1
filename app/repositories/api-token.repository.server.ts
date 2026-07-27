import type { Prisma, PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export interface ApiTokenRecord {
  id: string;
  shopId: string;
  name: string;
  tokenPrefix: string;
  tokenHash: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const apiTokenSelect = {
  id: true,
  shopId: true,
  name: true,
  tokenPrefix: true,
  tokenHash: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ApiTokenSelect;

export interface ApiTokenRepository {
  create(input: {
    shopId: string;
    name: string;
    tokenPrefix: string;
    tokenHash: string;
  }): Promise<ApiTokenRecord>;
  listForShop(shopId: string): Promise<ApiTokenRecord[]>;
  countActiveForShop(shopId: string): Promise<number>;
  findActiveByHash(tokenHash: string): Promise<ApiTokenRecord | null>;
  findByIdForShop(
    shopId: string,
    tokenId: string,
  ): Promise<ApiTokenRecord | null>;
  revokeForShop(shopId: string, tokenId: string): Promise<ApiTokenRecord | null>;
  touchLastUsed(tokenId: string, at?: Date): Promise<void>;
  deleteAllForShop(shopId: string): Promise<number>;
}

export class PrismaApiTokenRepository implements ApiTokenRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async create(input: {
    shopId: string;
    name: string;
    tokenPrefix: string;
    tokenHash: string;
  }): Promise<ApiTokenRecord> {
    return this.database.apiToken.create({
      data: input,
      select: apiTokenSelect,
    });
  }

  async listForShop(shopId: string): Promise<ApiTokenRecord[]> {
    return this.database.apiToken.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      select: apiTokenSelect,
    });
  }

  async countActiveForShop(shopId: string): Promise<number> {
    return this.database.apiToken.count({
      where: { shopId, revokedAt: null },
    });
  }

  async findActiveByHash(tokenHash: string): Promise<ApiTokenRecord | null> {
    return this.database.apiToken.findFirst({
      where: { tokenHash, revokedAt: null },
      select: apiTokenSelect,
    });
  }

  async findByIdForShop(
    shopId: string,
    tokenId: string,
  ): Promise<ApiTokenRecord | null> {
    return this.database.apiToken.findFirst({
      where: { id: tokenId, shopId },
      select: apiTokenSelect,
    });
  }

  async revokeForShop(
    shopId: string,
    tokenId: string,
  ): Promise<ApiTokenRecord | null> {
    const existing = await this.findByIdForShop(shopId, tokenId);
    if (!existing || existing.revokedAt) {
      return existing;
    }

    return this.database.apiToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
      select: apiTokenSelect,
    });
  }

  async touchLastUsed(tokenId: string, at: Date = new Date()): Promise<void> {
    await this.database.apiToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { lastUsedAt: at },
    });
  }

  async deleteAllForShop(shopId: string): Promise<number> {
    const result = await this.database.apiToken.deleteMany({
      where: { shopId },
    });
    return result.count;
  }
}

export const apiTokenRepository = new PrismaApiTokenRepository();
