import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "./logger.server";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("protects reserved fields and serializes complex context", () => {
    const consoleSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    logger.info("Foundation ready", {
      level: "forged",
      message: "forged",
      timestamp: "forged",
      count: 10n,
      circular,
    });

    const payload = JSON.parse(String(consoleSpy.mock.calls[0]?.[0]));

    expect(payload).toMatchObject({
      level: "info",
      message: "Foundation ready",
      count: "10",
      circular: { self: "[Circular]" },
    });
    expect(payload.timestamp).not.toBe("forged");
  });

  it("normalizes Error objects", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logger.error("Request failed", {}, new Error("Connection lost"));

    const payload = JSON.parse(String(consoleSpy.mock.calls[0]?.[0]));

    expect(payload.error).toMatchObject({
      name: "Error",
      message: "Connection lost",
    });
  });
});
