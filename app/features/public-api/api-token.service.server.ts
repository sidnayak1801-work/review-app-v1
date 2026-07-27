import { DomainError, NotFoundError, ValidationError } from "../../lib/domain-error";
import { parseWithSchema } from "../../lib/validation";
import {
  apiTokenRepository,
  type ApiTokenRecord,
  type ApiTokenRepository,
} from "../../repositories/api-token.repository.server";
import {
  shopRepository,
  type ShopRecord,
  type ShopRepository,
} from "../../repositories/shop.repository.server";
import { logger } from "../../services/logger.server";
import {
  createApiTokenSchema,
  createApiTokenSecret,
  hashApiToken,
  MAX_ACTIVE_API_TOKENS_PER_SHOP,
  revokeApiTokenSchema,
  rotateApiTokenSchema,
} from "./api-token.schema";

export interface ApiTokenPublicView {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  active: boolean;
}

export interface CreatedApiTokenResult {
  token: ApiTokenPublicView;
  /** Plaintext secret — shown once to the merchant. */
  secret: string;
}

function toPublicView(record: ApiTokenRecord): ApiTokenPublicView {
  return {
    id: record.id,
    name: record.name,
    tokenPrefix: record.tokenPrefix,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    active: record.revokedAt === null,
  };
}

export class ApiTokenService {
  constructor(
    private readonly tokens: ApiTokenRepository = apiTokenRepository,
    private readonly shops: ShopRepository = shopRepository,
  ) {}

  async listForShop(shopId: string): Promise<ApiTokenPublicView[]> {
    const records = await this.tokens.listForShop(shopId);
    return records.map(toPublicView);
  }

  async create(
    shopId: string,
    input: unknown,
  ): Promise<CreatedApiTokenResult> {
    const data = parseWithSchema(createApiTokenSchema, input, "Invalid token");
    const activeCount = await this.tokens.countActiveForShop(shopId);
    if (activeCount >= MAX_ACTIVE_API_TOKENS_PER_SHOP) {
      throw new DomainError(
        `You can have at most ${MAX_ACTIVE_API_TOKENS_PER_SHOP} active API tokens. Revoke one before creating another.`,
        "API_TOKEN_LIMIT",
      );
    }

    const generated = createApiTokenSecret();
    const record = await this.tokens.create({
      shopId,
      name: data.name,
      tokenPrefix: generated.tokenPrefix,
      tokenHash: generated.tokenHash,
    });

    logger.info("API token created", {
      shopId,
      tokenId: record.id,
      tokenPrefix: record.tokenPrefix,
    });

    return {
      token: toPublicView(record),
      secret: generated.token,
    };
  }

  async revoke(shopId: string, input: unknown): Promise<ApiTokenPublicView> {
    const data = parseWithSchema(revokeApiTokenSchema, input, "Invalid revoke");
    const existing = await this.tokens.findByIdForShop(shopId, data.tokenId);
    if (!existing) {
      throw new NotFoundError("API token not found");
    }

    const revoked = await this.tokens.revokeForShop(shopId, data.tokenId);
    if (!revoked) {
      throw new NotFoundError("API token not found");
    }

    logger.info("API token revoked", {
      shopId,
      tokenId: revoked.id,
    });

    return toPublicView(revoked);
  }

  /**
   * Creates a new token and revokes the old one (zero-downtime cutover).
   * Allowed at the active-token cap because net active count does not increase.
   */
  async rotate(
    shopId: string,
    input: unknown,
  ): Promise<CreatedApiTokenResult> {
    const data = parseWithSchema(rotateApiTokenSchema, input, "Invalid rotate");
    const existing = await this.tokens.findByIdForShop(shopId, data.tokenId);
    if (!existing) {
      throw new NotFoundError("API token not found");
    }
    if (existing.revokedAt) {
      throw new ValidationError("Cannot rotate a revoked token", [
        "tokenId: token is already revoked",
      ]);
    }

    const name = data.name ?? existing.name;
    const generated = createApiTokenSecret();
    const created = await this.tokens.create({
      shopId,
      name,
      tokenPrefix: generated.tokenPrefix,
      tokenHash: generated.tokenHash,
    });
    await this.tokens.revokeForShop(shopId, data.tokenId);

    logger.info("API token rotated", {
      shopId,
      oldTokenId: data.tokenId,
      newTokenId: created.id,
    });

    return {
      token: toPublicView(created),
      secret: generated.token,
    };
  }

  async authenticateBearer(
    authorizationHeader: string | null,
  ): Promise<{ shop: ShopRecord; token: ApiTokenRecord }> {
    if (!authorizationHeader) {
      throw new DomainError("Missing Authorization header.", "UNAUTHORIZED");
    }

    const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
    if (!match?.[1]) {
      throw new DomainError("Invalid Authorization header.", "UNAUTHORIZED");
    }

    const rawToken = match[1].trim();
    if (!rawToken) {
      throw new DomainError("Invalid Authorization header.", "UNAUTHORIZED");
    }

    const tokenHash = hashApiToken(rawToken);
    const token = await this.tokens.findActiveByHash(tokenHash);
    if (!token) {
      throw new DomainError("Invalid or revoked API token.", "UNAUTHORIZED");
    }

    const shop = await this.shops.findById(token.shopId);
    if (!shop || shop.status !== "INSTALLED") {
      throw new DomainError("Invalid or revoked API token.", "UNAUTHORIZED");
    }

    void this.tokens.touchLastUsed(token.id).catch(() => {
      // Best-effort last-used stamp; do not fail the request.
    });

    return { shop, token };
  }
}

export const apiTokenService = new ApiTokenService();
