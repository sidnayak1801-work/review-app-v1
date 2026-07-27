import { beforeEach, describe, expect, it, vi } from "vitest";

import { encryptIntegrationCredentials } from "../../lib/integrations-crypto.server";
import type { IntegrationRepository } from "../../repositories/integration.repository.server";
import { IntegrationEventDispatcher } from "./integration-dispatcher.server";
import * as registry from "./integration-registry.server";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function createRepo(
  overrides: Partial<IntegrationRepository> = {},
): IntegrationRepository {
  return {
    listConnectionsForShop: vi.fn().mockResolvedValue([]),
    findConnection: vi.fn().mockResolvedValue(null),
    listConnectedForShop: vi.fn().mockResolvedValue([]),
    upsertConnection: vi.fn(),
    markConnectionResult: vi.fn().mockResolvedValue(null),
    disconnect: vi.fn(),
    upsertExternalRef: vi.fn(),
    findExternalRef: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("IntegrationEventDispatcher", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.INTEGRATIONS_ENCRYPTION_KEY = TEST_KEY;
  });

  it("fans out only to connected providers", async () => {
    const handleEvent = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(registry, "getIntegrationProvider").mockReturnValue({
      id: "klaviyo",
      displayName: "Klaviyo",
      testConnection: vi.fn(),
      handleEvent,
    });

    const markConnectionResult = vi.fn().mockResolvedValue(null);
    const repo = createRepo({
      listConnectedForShop: vi.fn().mockResolvedValue([
        {
          id: "c1",
          shopId: "shop_1",
          provider: "KLAVIYO",
          status: "CONNECTED",
          credentialsEncrypted: encryptIntegrationCredentials(
            JSON.stringify({ apiKey: "pk_test" }),
          ),
          credentialsKeyVersion: 1,
          metadata: null,
          lastError: null,
          lastSuccessAt: null,
          connectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      markConnectionResult,
    });

    const dispatcher = new IntegrationEventDispatcher(repo);
    await dispatcher.emit({
      shopId: "shop_1",
      event: {
        type: "review_request.sent",
        data: {
          reviewRequestId: "rr1",
          shopifyOrderId: "o1",
          shopifyProductId: "p1",
          customerEmail: "a@example.com",
        },
      },
    });

    expect(handleEvent).toHaveBeenCalledOnce();
    expect(markConnectionResult).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop_1",
        provider: "KLAVIYO",
        status: "CONNECTED",
      }),
    );
  });

  it("marks ERROR when provider throws", async () => {
    vi.spyOn(registry, "getIntegrationProvider").mockReturnValue({
      id: "gorgias",
      displayName: "Gorgias",
      testConnection: vi.fn(),
      handleEvent: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const markConnectionResult = vi.fn().mockResolvedValue(null);
    const repo = createRepo({
      listConnectedForShop: vi.fn().mockResolvedValue([
        {
          id: "c2",
          shopId: "shop_1",
          provider: "GORGIAS",
          status: "CONNECTED",
          credentialsEncrypted: encryptIntegrationCredentials(
            JSON.stringify({
              email: "a@b.com",
              apiToken: "tok",
              subdomain: "demo",
            }),
          ),
          credentialsKeyVersion: 1,
          metadata: null,
          lastError: null,
          lastSuccessAt: null,
          connectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      markConnectionResult,
    });

    const dispatcher = new IntegrationEventDispatcher(repo);
    await dispatcher.emit({
      shopId: "shop_1",
      event: {
        type: "review.published",
        data: {
          reviewId: "r1",
          shopifyProductId: "p1",
          rating: 2,
          body: "bad",
          authorName: "Pat",
          verifiedBuyer: false,
        },
      },
    });

    expect(markConnectionResult).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "GORGIAS",
        status: "ERROR",
        lastError: "boom",
      }),
    );
  });
});
