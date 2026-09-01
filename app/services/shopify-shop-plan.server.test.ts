import { describe, expect, it, vi } from "vitest";

import { isDevelopmentStore } from "./shopify-shop-plan.server";

function createAdmin(respond: () => Promise<unknown>) {
  return {
    graphql: vi.fn().mockImplementation(async () => ({
      json: respond,
    })) as unknown as (query: string) => Promise<Response>,
  };
}

function withPlan(partnerDevelopment: unknown) {
  return { data: { shop: { plan: { partnerDevelopment } } } };
}

describe("isDevelopmentStore", () => {
  it("reports a development store", async () => {
    const admin = createAdmin(async () => withPlan(true));

    await expect(isDevelopmentStore(admin)).resolves.toBe(true);
  });

  it("reports a live store", async () => {
    const admin = createAdmin(async () => withPlan(false));

    await expect(isDevelopmentStore(admin)).resolves.toBe(false);
  });

  it("returns null when the store type cannot be read", async () => {
    const admin = createAdmin(async () => ({
      errors: [{ message: "Access denied" }],
    }));

    await expect(isDevelopmentStore(admin)).resolves.toBeNull();
  });

  it("returns null on an ordinary transport failure", async () => {
    const admin = createAdmin(() => Promise.reject(new Error("Network down")));

    await expect(isDevelopmentStore(admin)).resolves.toBeNull();
  });

  it("rethrows a thrown Response", async () => {
    // Absorbing App Bridge reauth here would fall through to the NODE_ENV
    // fallback, and in production that creates a live charge on a development
    // store, which can never activate.
    const reauth = new Response(undefined, { status: 401 });
    const admin = createAdmin(() => Promise.reject(reauth));

    await expect(isDevelopmentStore(admin)).rejects.toBe(reauth);
  });
});
