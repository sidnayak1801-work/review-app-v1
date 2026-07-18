import {
  sessionRepository,
  type SessionRepository,
} from "../repositories/session.repository.server";
import { logger } from "./logger.server";

export class SessionService {
  constructor(private readonly sessions: SessionRepository) {}

  async removeShopSessions(shopDomain: string): Promise<void> {
    const deletedCount = await this.sessions.deleteByShop(shopDomain);

    logger.info("Shop sessions removed", {
      shopDomain,
      deletedCount,
    });
  }

  async updateSessionScopes(
    sessionId: string,
    scopes: string[],
  ): Promise<void> {
    await this.sessions.updateScopes(sessionId, scopes);

    logger.info("Session scopes updated", {
      sessionId,
      scopeCount: scopes.length,
    });
  }
}

export const sessionService = new SessionService(sessionRepository);
