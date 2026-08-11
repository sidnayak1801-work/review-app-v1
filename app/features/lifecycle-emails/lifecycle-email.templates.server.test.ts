import { describe, expect, it, vi } from "vitest";

vi.mock("../../db.server", () => ({
  default: {},
}));

vi.mock("../../lib/email-env.server", () => ({
  getAppBaseUrl: () => "https://reviewtrix.algorithmtrix.com",
}));

vi.mock("../../lib/env.server", () => ({
  getShopifyEnv: () => ({
    SHOPIFY_API_KEY: "test-api-key",
    SHOPIFY_API_SECRET: "secret",
    SHOPIFY_APP_URL: "https://reviewtrix.algorithmtrix.com",
    SCOPES: "read_orders",
  }),
  getDatabaseEnv: () => ({
    DATABASE_URL: "postgresql://test",
  }),
}));

import {
  lifecycleIdempotencyKey,
  renderLifecycleEmail,
} from "./lifecycle-email.templates.server";

describe("lifecycle email templates", () => {
  const input = {
    shopDomain: "example.myshopify.com",
    shopName: "Example Store",
  };

  it("renders welcome with onboarding deep link and brand color", () => {
    const rendered = renderLifecycleEmail("WELCOME", input);

    expect(rendered.subject).toBe("Welcome to ReviewTrix 🎉");
    expect(rendered.html).toContain("Complete setup");
    expect(rendered.html).toContain(
      "https://admin.shopify.com/store/example/apps/test-api-key/app/onboarding",
    );
    expect(rendered.html).toContain("#008060");
    expect(rendered.html).toContain("/reviewtrix-logo.png");
    expect(rendered.html).toContain("Example Store");
  });

  it("renders 24h reminder without claiming the merchant has not logged in", () => {
    const rendered = renderLifecycleEmail("ONBOARDING_REMINDER_24H", input);

    expect(rendered.subject).toBe("Your ReviewTrix setup is waiting");
    expect(rendered.html).toContain("Continue setup");
    expect(rendered.html.toLowerCase()).not.toContain("logged in");
  });

  it("renders 3-day reminder with support mailto", () => {
    const rendered = renderLifecycleEmail("ONBOARDING_REMINDER_3D", input);

    expect(rendered.subject).toBe("Need help getting ReviewTrix live?");
    expect(rendered.html).toContain("mailto:support@reviewtrix.algorithmtrix.com");
    expect(rendered.html).toContain("Contact support");
  });

  it("renders completion email linking to app home", () => {
    const rendered = renderLifecycleEmail("ONBOARDING_COMPLETED", input);

    expect(rendered.subject).toBe("You're all set with ReviewTrix 🎉");
    expect(rendered.html).toContain("Open ReviewTrix");
    expect(rendered.html).toContain(
      "https://admin.shopify.com/store/example/apps/test-api-key/app",
    );
  });

  it("builds deterministic idempotency keys", () => {
    expect(lifecycleIdempotencyKey("WELCOME", "shop-1")).toBe("welcome:shop-1");
    expect(lifecycleIdempotencyKey("ONBOARDING_REMINDER_24H", "shop-1")).toBe(
      "reminder24:shop-1",
    );
    expect(lifecycleIdempotencyKey("ONBOARDING_REMINDER_3D", "shop-1")).toBe(
      "reminder3d:shop-1",
    );
    expect(lifecycleIdempotencyKey("ONBOARDING_COMPLETED", "shop-1")).toBe(
      "completed:shop-1",
    );
  });
});
