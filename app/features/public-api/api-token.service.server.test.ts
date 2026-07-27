import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ApiTokenRecord,
  ApiTokenRepository,
} from "../../repositories/api-token.repository.server";
import type {
  ShopRecord,
  ShopRepository,
} from "../../repositories/shop.repository.server";
import { DomainError, NotFoundError } from "../../lib/domain-error";
import {
  createApiTokenSecret,
  hashApiToken,
  MAX_ACTIVE_API_TOKENS_PER_SHOP,
} from "./api-token.schema";
import { ApiTokenService } from "./api-token.service.server";

afterEach(() => {
  vi.restoreAllMocks();
});

const shop: ShopRecord = {
  id: "shop-1",
  shopDomain: "example.myshopify.com",
  shopifyShopId: "gid://shopify/Shop/1",
  plan: "FREE",
  status: "INSTALLED",
  installedAt: new Date("2026-07-17T00:00:00.000Z"),
  uninstalledAt: null,
  billingStatus: null,
  billingSyncedAt: null,
};

function tokenRecord(
  overrides: Partial<ApiTokenRecord> = {},
): ApiTokenRecord {
  return {
    id: "tok-1",
    shopId: shop.id,
    name: "Backend",
    tokenPrefix: "abcd1234",
    tokenHash: "hash-1",
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date("2026-07-24T00:00:00.000Z"),
    updatedAt: new Date("2026-07-24T00:00:00.000Z"),
    ...overrides,
  };
}

function createTokens(
  overrides: Partial<ApiTokenRepository> = {},
): ApiTokenRepository {
  return {
    create: vi.fn().mockImplementation(async (input) =>
      tokenRecord({
        id: "tok-new",
        name: input.name,
        tokenPrefix: input.tokenPrefix,
        tokenHash: input.tokenHash,
      }),
    ),
    listForShop: vi.fn().mockResolvedValue([tokenRecord()]),
    countActiveForShop: vi.fn().mockResolvedValue(0),
    findActiveByHash: vi.fn(),
    findByIdForShop: vi.fn().mockResolvedValue(tokenRecord()),
    revokeForShop: vi.fn().mockImplementation(async () =>
      tokenRecord({ revokedAt: new Date("2026-07-24T12:00:00.000Z") }),
    ),
    touchLastUsed: vi.fn().mockResolvedValue(undefined),
    deleteAllForShop: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function createShops(
  overrides: Partial<ShopRepository> = {},
): ShopRepository {
  return {
    findById: vi.fn().mockResolvedValue(shop),
    findByDomain: vi.fn(),
    create: vi.fn(),
    install: vi.fn(),
    markUninstalled: vi.fn(),
    deleteByDomain: vi.fn(),
    updateBillingState: vi.fn(),
    ...overrides,
  };
}

describe("api-token.schema", () => {
  it("hashes secrets consistently and prefixes rvw_", () => {
    const generated = createApiTokenSecret();
    expect(generated.token.startsWith("rvw_")).toBe(true);
    expect(generated.tokenPrefix).toHaveLength(8);
    expect(hashApiToken(generated.token)).toBe(generated.tokenHash);
  });
});

describe("ApiTokenService", () => {
  it("creates a token and returns the plaintext secret once", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const tokens = createTokens();
    const service = new ApiTokenService(tokens, createShops());

    const result = await service.create(shop.id, { name: "CI" });

    expect(result.secret.startsWith("rvw_")).toBe(true);
    expect(result.token.name).toBe("CI");
    expect(tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: shop.id,
        name: "CI",
        tokenHash: expect.any(String),
      }),
    );
  });

  it("rejects create when active token limit is reached", async () => {
    const tokens = createTokens({
      countActiveForShop: vi
        .fn()
        .mockResolvedValue(MAX_ACTIVE_API_TOKENS_PER_SHOP),
    });
    const service = new ApiTokenService(tokens, createShops());

    await expect(service.create(shop.id, { name: "Extra" })).rejects.toThrow(
      DomainError,
    );
  });

  it("revokes a token by id", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const tokens = createTokens();
    const service = new ApiTokenService(tokens, createShops());

    const revoked = await service.revoke(shop.id, { tokenId: "tok-1" });

    expect(revoked.active).toBe(false);
    expect(tokens.revokeForShop).toHaveBeenCalledWith(shop.id, "tok-1");
  });

  it("rotates by creating a new token and revoking the old one", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const tokens = createTokens();
    const service = new ApiTokenService(tokens, createShops());

    const result = await service.rotate(shop.id, { tokenId: "tok-1" });

    expect(result.secret.startsWith("rvw_")).toBe(true);
    expect(tokens.create).toHaveBeenCalled();
    expect(tokens.revokeForShop).toHaveBeenCalledWith(shop.id, "tok-1");
  });

  it("rejects rotate for missing tokens", async () => {
    const tokens = createTokens({
      findByIdForShop: vi.fn().mockResolvedValue(null),
    });
    const service = new ApiTokenService(tokens, createShops());

    await expect(
      service.rotate(shop.id, { tokenId: "missing" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("authenticates a valid bearer token", async () => {
    const generated = createApiTokenSecret();
    const record = tokenRecord({
      tokenHash: generated.tokenHash,
      tokenPrefix: generated.tokenPrefix,
    });
    const tokens = createTokens({
      findActiveByHash: vi.fn().mockResolvedValue(record),
    });
    const shops = createShops();
    const service = new ApiTokenService(tokens, shops);

    const ctx = await service.authenticateBearer(
      `Bearer ${generated.token}`,
    );

    expect(ctx.shop.id).toBe(shop.id);
    expect(ctx.token.id).toBe(record.id);
    expect(tokens.touchLastUsed).toHaveBeenCalledWith(record.id);
  });

  it("rejects revoked or unknown tokens without leaking details", async () => {
    const tokens = createTokens({
      findActiveByHash: vi.fn().mockResolvedValue(null),
    });
    const service = new ApiTokenService(tokens, createShops());

    await expect(
      service.authenticateBearer("Bearer rvw_invalid"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects uninstalled shops", async () => {
    const generated = createApiTokenSecret();
    const tokens = createTokens({
      findActiveByHash: vi.fn().mockResolvedValue(
        tokenRecord({ tokenHash: generated.tokenHash }),
      ),
    });
    const shops = createShops({
      findById: vi.fn().mockResolvedValue({
        ...shop,
        status: "UNINSTALLED",
      }),
    });
    const service = new ApiTokenService(tokens, shops);

    await expect(
      service.authenticateBearer(`Bearer ${generated.token}`),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
