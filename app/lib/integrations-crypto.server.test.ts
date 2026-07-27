import { describe, expect, it } from "vitest";

import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "./integrations-crypto.server";

describe("integrations crypto", () => {
  const env = {
    INTEGRATIONS_ENCRYPTION_KEY:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };

  it("round-trips credential JSON", () => {
    const plaintext = JSON.stringify({ apiKey: "pk_test_secret" });
    const encrypted = encryptIntegrationCredentials(plaintext, env);
    expect(encrypted).not.toContain("pk_test_secret");
    expect(decryptIntegrationCredentials(encrypted, env)).toBe(plaintext);
  });

  it("rejects missing key", () => {
    expect(() =>
      encryptIntegrationCredentials("{}", { INTEGRATIONS_ENCRYPTION_KEY: "" }),
    ).toThrow(/INTEGRATIONS_ENCRYPTION_KEY/);
  });
});
