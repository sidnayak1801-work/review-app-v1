import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db.server", () => ({
  default: {},
}));

vi.mock("../../lib/email-env.server", () => ({
  getEmailProvider: vi.fn(),
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

import type {
  LifecycleEmailRecord,
  LifecycleEmailRepository,
  LifecycleEmailType,
} from "../../repositories/lifecycle-email.repository.server";
import type { OnboardingStatusRecord } from "../../repositories/onboarding-status.repository.server";
import type { ShopRecord } from "../../repositories/shop.repository.server";
import type { EmailProvider } from "../../services/email-provider.server";
import { EmailProviderError } from "../../services/email-provider.server";
import { LifecycleEmailService } from "./lifecycle-email.service.server";

beforeEach(() => {
  vi.clearAllMocks();
});

const installedAt = new Date("2026-08-11T10:00:00.000Z");

const shop: ShopRecord = {
  id: "shop-1",
  shopDomain: "example.myshopify.com",
  shopifyShopId: "gid://shopify/Shop/1",
  plan: "FREE",
  status: "INSTALLED",
  contactEmail: "owner@example.com",
  firstInstalledAt: installedAt,
  latestInstalledAt: installedAt,
  installedAt,
  uninstalledAt: null,
  billingStatus: null,
  billingSyncedAt: null,
};

const incompleteOnboarding: OnboardingStatusRecord = {
  id: "ob-1",
  shopId: "shop-1",
  themeEnabled: false,
  reviewsImported: false,
  automationConfigured: false,
  brandingConfigured: false,
  completed: false,
  skipped: false,
  startedAt: null,
  completedAt: null,
  createdAt: installedAt,
  updatedAt: installedAt,
};

function job(
  overrides: Partial<LifecycleEmailRecord> & {
    type: LifecycleEmailType;
  },
): LifecycleEmailRecord {
  return {
    id: overrides.id ?? `job-${overrides.type}`,
    shopId: "shop-1",
    type: overrides.type,
    status: overrides.status ?? "SCHEDULED",
    scheduledFor: overrides.scheduledFor ?? installedAt,
    sentAt: overrides.sentAt ?? null,
    failedAt: overrides.failedAt ?? null,
    lastErrorCode: overrides.lastErrorCode ?? null,
    providerMessageId: overrides.providerMessageId ?? null,
    attemptCount: overrides.attemptCount ?? 0,
    createdAt: installedAt,
    updatedAt: installedAt,
  };
}

function createEmailsRepo(
  overrides: Partial<LifecycleEmailRepository> = {},
): LifecycleEmailRepository {
  return {
    findByShopAndType: vi.fn().mockResolvedValue(null),
    findDueScheduled: vi.fn().mockResolvedValue([]),
    recoverStaleProcessing: vi.fn().mockResolvedValue(0),
    upsertScheduled: vi.fn().mockImplementation(async (input) =>
      job({
        type: input.type,
        scheduledFor: input.scheduledFor,
        status: input.status ?? "SCHEDULED",
      }),
    ),
    claimForProcessing: vi.fn().mockResolvedValue(null),
    markSent: vi.fn().mockImplementation(async (id) =>
      job({ id, type: "WELCOME", status: "SENT", sentAt: new Date() }),
    ),
    markRetry: vi.fn().mockImplementation(async (id, input) =>
      job({
        id,
        type: "WELCOME",
        status: "SCHEDULED",
        scheduledFor: input.scheduledFor,
        attemptCount: input.attemptCount,
        lastErrorCode: input.lastErrorCode,
      }),
    ),
    markFailed: vi.fn().mockImplementation(async (id, input) =>
      job({
        id,
        type: "WELCOME",
        status: "FAILED",
        failedAt: input.failedAt,
        attemptCount: input.attemptCount,
        lastErrorCode: input.lastErrorCode,
      }),
    ),
    markCancelled: vi.fn().mockImplementation(async (id) =>
      job({ id, type: "WELCOME", status: "CANCELLED" }),
    ),
    cancelPendingForShop: vi.fn().mockResolvedValue(2),
    ...overrides,
  };
}

describe("LifecycleEmailService", () => {
  it("schedules welcome and reminder jobs for incomplete onboarding", async () => {
    const emails = createEmailsRepo();
    const service = new LifecycleEmailService(
      emails,
      { findById: vi.fn(), findByDomain: vi.fn(), create: vi.fn(), install: vi.fn(), markUninstalled: vi.fn(), deleteByDomain: vi.fn(), updateBillingState: vi.fn() },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn().mockResolvedValue(incompleteOnboarding),
        update: vi.fn(),
      },
      { sendEmail: vi.fn() },
    );

    await service.scheduleForInstall(shop);

    expect(emails.upsertScheduled).toHaveBeenCalledTimes(3);
    expect(emails.upsertScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WELCOME", shopId: "shop-1" }),
    );
    expect(emails.upsertScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ONBOARDING_REMINDER_24H",
        scheduledFor: new Date(installedAt.getTime() + 24 * 60 * 60 * 1000),
      }),
    );
    expect(emails.upsertScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ONBOARDING_REMINDER_3D",
        scheduledFor: new Date(installedAt.getTime() + 72 * 60 * 60 * 1000),
      }),
    );
  });

  it("does not schedule install sequence when onboarding is completed", async () => {
    const emails = createEmailsRepo();
    const service = new LifecycleEmailService(
      emails,
      { findById: vi.fn(), findByDomain: vi.fn(), create: vi.fn(), install: vi.fn(), markUninstalled: vi.fn(), deleteByDomain: vi.fn(), updateBillingState: vi.fn() },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn().mockResolvedValue({
          ...incompleteOnboarding,
          completed: true,
          completedAt: installedAt,
        }),
        update: vi.fn(),
      },
      { sendEmail: vi.fn() },
    );

    await service.scheduleForInstall(shop);

    expect(emails.upsertScheduled).not.toHaveBeenCalled();
  });

  it("skips recreating SENT jobs on reinstall", async () => {
    const emails = createEmailsRepo({
      findByShopAndType: vi.fn().mockImplementation(async (_shopId, type) => {
        if (type === "WELCOME") {
          return job({ type: "WELCOME", status: "SENT", sentAt: installedAt });
        }
        return null;
      }),
    });
    const service = new LifecycleEmailService(
      emails,
      { findById: vi.fn(), findByDomain: vi.fn(), create: vi.fn(), install: vi.fn(), markUninstalled: vi.fn(), deleteByDomain: vi.fn(), updateBillingState: vi.fn() },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn().mockResolvedValue(incompleteOnboarding),
        update: vi.fn(),
      },
      { sendEmail: vi.fn() },
    );

    await service.scheduleForInstall(shop);

    expect(emails.upsertScheduled).toHaveBeenCalledTimes(2);
    expect(emails.upsertScheduled).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "WELCOME" }),
    );
  });

  it("schedules completion email and cancels reminders", async () => {
    const emails = createEmailsRepo();
    const service = new LifecycleEmailService(
      emails,
      { findById: vi.fn(), findByDomain: vi.fn(), create: vi.fn(), install: vi.fn(), markUninstalled: vi.fn(), deleteByDomain: vi.fn(), updateBillingState: vi.fn() },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn(),
        update: vi.fn(),
      },
      { sendEmail: vi.fn() },
    );

    await service.scheduleCompletionEmail("shop-1");

    expect(emails.cancelPendingForShop).toHaveBeenCalledWith("shop-1", [
      "ONBOARDING_REMINDER_24H",
      "ONBOARDING_REMINDER_3D",
    ]);
    expect(emails.upsertScheduled).toHaveBeenCalledWith({
      shopId: "shop-1",
      type: "ONBOARDING_COMPLETED",
      scheduledFor: expect.any(Date),
      status: "SCHEDULED",
    });
  });

  it("sends a due welcome email when eligible", async () => {
    const welcome = job({ type: "WELCOME", status: "SCHEDULED" });
    const sendEmail = vi.fn().mockResolvedValue({ providerMessageId: "msg-1" });
    const emails = createEmailsRepo({
      findDueScheduled: vi.fn().mockResolvedValue([welcome]),
      claimForProcessing: vi.fn().mockResolvedValue({
        ...welcome,
        status: "PROCESSING",
      }),
    });
    const service = new LifecycleEmailService(
      emails,
      {
        findById: vi.fn().mockResolvedValue(shop),
        findByDomain: vi.fn(),
        create: vi.fn(),
        install: vi.fn(),
        markUninstalled: vi.fn(),
        deleteByDomain: vi.fn(),
        updateBillingState: vi.fn(),
      },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn().mockResolvedValue(incompleteOnboarding),
        update: vi.fn(),
      },
      { sendEmail } satisfies EmailProvider,
    );

    const result = await service.processDueJobs();

    expect(result.sentCount).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        subject: "Welcome to ReviewTrix 🎉",
        idempotencyKey: "welcome:shop-1",
      }),
    );
    expect(emails.markSent).toHaveBeenCalled();
  });

  it("cancels reminder when onboarding is already complete", async () => {
    const reminder = job({
      type: "ONBOARDING_REMINDER_24H",
      status: "SCHEDULED",
    });
    const emails = createEmailsRepo({
      findDueScheduled: vi.fn().mockResolvedValue([reminder]),
      claimForProcessing: vi.fn().mockResolvedValue({
        ...reminder,
        status: "PROCESSING",
      }),
    });
    const service = new LifecycleEmailService(
      emails,
      {
        findById: vi.fn().mockResolvedValue(shop),
        findByDomain: vi.fn(),
        create: vi.fn(),
        install: vi.fn(),
        markUninstalled: vi.fn(),
        deleteByDomain: vi.fn(),
        updateBillingState: vi.fn(),
      },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn().mockResolvedValue({
          ...incompleteOnboarding,
          completed: true,
          completedAt: installedAt,
        }),
        update: vi.fn(),
      },
      { sendEmail: vi.fn() },
    );

    const result = await service.processDueJobs();

    expect(result.cancelledCount).toBe(1);
    expect(emails.markCancelled).toHaveBeenCalledWith(reminder.id);
  });

  it("cancels jobs for uninstalled shops", async () => {
    const welcome = job({ type: "WELCOME", status: "SCHEDULED" });
    const emails = createEmailsRepo({
      findDueScheduled: vi.fn().mockResolvedValue([welcome]),
      claimForProcessing: vi.fn().mockResolvedValue({
        ...welcome,
        status: "PROCESSING",
      }),
    });
    const service = new LifecycleEmailService(
      emails,
      {
        findById: vi.fn().mockResolvedValue({
          ...shop,
          status: "UNINSTALLED",
          uninstalledAt: new Date(),
        }),
        findByDomain: vi.fn(),
        create: vi.fn(),
        install: vi.fn(),
        markUninstalled: vi.fn(),
        deleteByDomain: vi.fn(),
        updateBillingState: vi.fn(),
      },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn(),
        update: vi.fn(),
      },
      { sendEmail: vi.fn() },
    );

    const result = await service.processDueJobs();

    expect(result.cancelledCount).toBe(1);
    expect(emails.markCancelled).toHaveBeenCalled();
  });

  it("retries then permanently fails after max attempts", async () => {
    const welcome = job({
      type: "WELCOME",
      status: "SCHEDULED",
      attemptCount: 3,
    });
    const emails = createEmailsRepo({
      findDueScheduled: vi.fn().mockResolvedValue([welcome]),
      claimForProcessing: vi.fn().mockResolvedValue({
        ...welcome,
        status: "PROCESSING",
      }),
    });
    const service = new LifecycleEmailService(
      emails,
      {
        findById: vi.fn().mockResolvedValue(shop),
        findByDomain: vi.fn(),
        create: vi.fn(),
        install: vi.fn(),
        markUninstalled: vi.fn(),
        deleteByDomain: vi.fn(),
        updateBillingState: vi.fn(),
      },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn(),
        update: vi.fn(),
      },
      {
        sendEmail: vi
          .fn()
          .mockRejectedValue(new EmailProviderError("boom", "RESEND_500")),
      },
    );

    const result = await service.processDueJobs();

    expect(result.failedCount).toBe(1);
    expect(emails.markFailed).toHaveBeenCalledWith(
      welcome.id,
      expect.objectContaining({
        attemptCount: 4,
        lastErrorCode: "RESEND_500",
      }),
    );
  });

  it("skips claim races without sending", async () => {
    const welcome = job({ type: "WELCOME", status: "SCHEDULED" });
    const sendEmail = vi.fn();
    const emails = createEmailsRepo({
      findDueScheduled: vi.fn().mockResolvedValue([welcome]),
      claimForProcessing: vi.fn().mockResolvedValue(null),
    });
    const service = new LifecycleEmailService(
      emails,
      {
        findById: vi.fn(),
        findByDomain: vi.fn(),
        create: vi.fn(),
        install: vi.fn(),
        markUninstalled: vi.fn(),
        deleteByDomain: vi.fn(),
        updateBillingState: vi.fn(),
      },
      {
        findByShopId: vi.fn(),
        ensureForShop: vi.fn(),
        update: vi.fn(),
      },
      { sendEmail },
    );

    const result = await service.processDueJobs();

    expect(result.skippedCount).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
