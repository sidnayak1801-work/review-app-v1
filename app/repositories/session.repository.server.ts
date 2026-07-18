import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export interface SessionRepository {
  deleteByShop(shopDomain: string): Promise<number>;
  updateScopes(sessionId: string, scopes: string[]): Promise<void>;
}

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async deleteByShop(shopDomain: string): Promise<number> {
    const result = await this.database.session.deleteMany({
      where: { shop: shopDomain },
    });

    return result.count;
  }

  async updateScopes(sessionId: string, scopes: string[]): Promise<void> {
    await this.database.session.updateMany({
      where: { id: sessionId },
      data: { scope: scopes.join(",") },
    });
  }
}

export const sessionRepository = new PrismaSessionRepository();
