import { describe, expect, it, vi } from "vitest";

import { createBillingClient } from "./shopify-billing.server";

function createAdmin(payload: unknown) {
  return {
    graphql: vi.fn().mockResolvedValue({
      json: async () => payload,
    } as unknown as Response),
  };
}

function withSubscriptions(
  activeSubscriptions: Array<Record<string, unknown>>,
) {
  return { data: { currentAppInstallation: { activeSubscriptions } } };
}

describe("createBillingClient", () => {
  it("reports an active payment for a matching plan", async () => {
    const admin = createAdmin(
      withSubscriptions([
        {
          id: "gid://shopify/AppSubscription/1",
          name: "Pro",
          status: "ACTIVE",
          test: false,
          createdAt: "2026-07-20T10:00:00.000Z",
          currentPeriodEnd: "2026-08-19T10:00:00.000Z",
          trialDays: 14,
        },
      ]),
    );

    const result = await createBillingClient(admin).check({ plans: ["Pro"] });

    expect(result.hasActivePayment).toBe(true);
    expect(result.appSubscriptions).toEqual([
      {
        id: "gid://shopify/AppSubscription/1",
        name: "Pro",
        createdAt: "2026-07-20T10:00:00.000Z",
        currentPeriodEnd: "2026-08-19T10:00:00.000Z",
        trialDays: 14,
        test: false,
      },
    ]);
  });

  it("counts test subscriptions", async () => {
    // Development stores, including the ones Shopify reviewers use, can only
    // ever hold test subscriptions.
    const admin = createAdmin(
      withSubscriptions([
        {
          id: "gid://shopify/AppSubscription/2",
          name: "Pro",
          status: "ACTIVE",
          test: true,
        },
      ]),
    );

    const result = await createBillingClient(admin).check({ plans: ["Pro"] });

    expect(result.hasActivePayment).toBe(true);
    expect(result.appSubscriptions[0]?.test).toBe(true);
  });

  it("reports no active payment when there are no subscriptions", async () => {
    const admin = createAdmin(withSubscriptions([]));

    const result = await createBillingClient(admin).check({ plans: ["Pro"] });

    expect(result.hasActivePayment).toBe(false);
    expect(result.appSubscriptions).toEqual([]);
  });

  it("ignores subscriptions for other plans", async () => {
    const admin = createAdmin(
      withSubscriptions([
        {
          id: "gid://shopify/AppSubscription/3",
          name: "Legacy Enterprise",
          status: "ACTIVE",
          test: false,
        },
      ]),
    );

    const result = await createBillingClient(admin).check({ plans: ["Pro"] });

    expect(result.hasActivePayment).toBe(false);
    expect(result.appSubscriptions).toEqual([]);
  });

  it("treats a missing app installation as no active payment", async () => {
    const admin = createAdmin({ data: { currentAppInstallation: null } });

    const result = await createBillingClient(admin).check({ plans: ["Pro"] });

    expect(result.hasActivePayment).toBe(false);
  });

  it("throws on GraphQL errors so the caller can retry", async () => {
    // Writing an unverified plan is worse than failing: the webhook returns 500
    // and Shopify redelivers.
    const admin = createAdmin({ errors: [{ message: "Throttled" }] });

    await expect(
      createBillingClient(admin).check({ plans: ["Pro"] }),
    ).rejects.toThrow("Throttled");
  });
});
