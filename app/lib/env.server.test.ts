import { describe, expect, it } from "vitest";

import { getDatabaseEnv, getShopifyEnv } from "./env.server";

describe("environment validation", () => {
  it("accepts valid database configuration", () => {
    const environment = {
      DATABASE_URL: "postgresql://user:password@example.com/database",
      DIRECT_URL: "postgresql://user:password@example.com/database",
    };

    expect(getDatabaseEnv(environment)).toMatchObject(environment);
  });

  it("rejects non-PostgreSQL database URLs", () => {
    expect(() =>
      getDatabaseEnv({
        DATABASE_URL: "https://example.com/database",
        DIRECT_URL: "postgresql://user:password@example.com/database",
      }),
    ).toThrow("Invalid database environment");
  });

  it("treats an empty test database URL as unset", () => {
    const environment = getDatabaseEnv({
      DATABASE_URL: "postgresql://user:password@example.com/database",
      DIRECT_URL: "postgresql://user:password@example.com/database",
      TEST_DATABASE_URL: "",
    });

    expect(environment.TEST_DATABASE_URL).toBeUndefined();
  });

  it("rejects missing Shopify credentials", () => {
    expect(() => getShopifyEnv({})).toThrow();
  });
});
