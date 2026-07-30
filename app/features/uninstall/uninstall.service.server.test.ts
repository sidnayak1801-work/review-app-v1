import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../lib/domain-error";
import type { UninstallFeedbackRepository } from "../../repositories/uninstall-feedback.repository.server";
import {
  reasonsFromFormData,
  submitUninstallFeedbackSchema,
  UNINSTALL_DETAILS_MAX,
} from "./uninstall.schema";
import { UninstallFeedbackService } from "./uninstall.service.server";

function createRepo(
  overrides: Partial<UninstallFeedbackRepository> = {},
): UninstallFeedbackRepository {
  return {
    create: vi.fn().mockImplementation(async (input) => ({
      id: "uf-1",
      shopId: input.shopId,
      reasons: input.reasons,
      details: input.details,
      createdAt: new Date("2026-07-27T00:00:00.000Z"),
    })),
    ...overrides,
  };
}

describe("submitUninstallFeedbackSchema", () => {
  it("requires at least one reason", () => {
    const result = submitUninstallFeedbackSchema.safeParse({
      reasons: [],
      details: null,
    });
    expect(result.success).toBe(false);
  });

  it("requires details when other is selected", () => {
    const result = submitUninstallFeedbackSchema.safeParse({
      reasons: ["other"],
      details: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple reasons with optional details", () => {
    const result = submitUninstallFeedbackSchema.safeParse({
      reasons: ["not_using_app_now", "too_expensive"],
      details: "  Switching later  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toBe("Switching later");
      expect(result.data.reasons).toEqual([
        "not_using_app_now",
        "too_expensive",
      ]);
    }
  });

  it("rejects details longer than the max", () => {
    const result = submitUninstallFeedbackSchema.safeParse({
      reasons: ["testing_multiple_apps"],
      details: "x".repeat(UNINSTALL_DETAILS_MAX + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("reasonsFromFormData", () => {
  it("reads repeated reasons fields", () => {
    const formData = new FormData();
    formData.append("reasons", "not_using_app_now");
    formData.append("reasons", "other");
    expect(reasonsFromFormData(formData)).toEqual([
      "not_using_app_now",
      "other",
    ]);
  });
});

describe("UninstallFeedbackService", () => {
  it("persists validated feedback for the shop", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const feedbacks = createRepo();
    const service = new UninstallFeedbackService(feedbacks);

    const record = await service.submit("shop-1", {
      reasons: ["other"],
      details: "Need a break",
    });

    expect(record.shopId).toBe("shop-1");
    expect(feedbacks.create).toHaveBeenCalledWith({
      shopId: "shop-1",
      reasons: ["other"],
      details: "Need a break",
    });
  });

  it("rejects invalid input", async () => {
    const service = new UninstallFeedbackService(createRepo());
    await expect(
      service.submit("shop-1", { reasons: [], details: null }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
