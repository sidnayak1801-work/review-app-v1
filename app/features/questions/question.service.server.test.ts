import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  QuestionRecord,
  QuestionRepository,
} from "../../repositories/question.repository.server";
import { ValidationError } from "../../lib/domain-error";
import { QuestionService } from "./question.service.server";

vi.mock("./question-notify.server", () => ({
  notifyMerchantOfNewQuestion: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const question: QuestionRecord = {
  id: "q-1",
  shopId: "shop-1",
  shopifyProductId: "gid://shopify/Product/1",
  productTitle: "Test Product",
  customerName: "Alex",
  email: "alex@example.com",
  question: "Does this shrink?",
  answer: null,
  status: "PENDING",
  answeredAt: null,
  publishedAt: null,
  createdAt: new Date("2026-07-18T00:00:00.000Z"),
  updatedAt: new Date("2026-07-18T00:00:00.000Z"),
};

function createRepository(
  overrides: Partial<QuestionRepository> = {},
): QuestionRepository {
  return {
    create: vi.fn().mockResolvedValue(question),
    findByIdForShop: vi.fn().mockResolvedValue(question),
    list: vi.fn().mockResolvedValue({
      items: [question],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    countByStatusForShop: vi.fn().mockResolvedValue({
      PENDING: 1,
      PUBLISHED: 0,
      HIDDEN: 0,
      ANSWERED: 0,
    }),
    updateForShop: vi.fn().mockResolvedValue(question),
    deleteForShop: vi.fn().mockResolvedValue(true),
    findForCustomerPrivacy: vi.fn().mockResolvedValue([]),
    redactCustomerPii: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("QuestionService", () => {
  it("rejects honeypot storefront submissions", async () => {
    const repository = createRepository();
    const service = new QuestionService(repository);

    await expect(
      service.createStorefrontQuestion("shop-1", "example.myshopify.com", {
        shopifyProductId: "1",
        customerName: "Bot",
        email: "bot@example.com",
        question: "Spam?",
        website: "https://spam.example",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates pending storefront questions without exposing email publicly", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const service = new QuestionService(repository);

    const created = await service.createStorefrontQuestion(
      "shop-1",
      "example.myshopify.com",
      {
        shopifyProductId: "1",
        customerName: "Alex",
        email: "alex@example.com",
        question: "Does this shrink?",
        productTitle: "Test Product",
      },
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        shopifyProductId: "gid://shopify/Product/1",
        status: "PENDING",
        email: "alex@example.com",
      }),
    );
    expect(created).not.toHaveProperty("email");
    expect(created.status).toBe("PENDING");
  });

  it("lists only published and answered questions for storefront", async () => {
    const repository = createRepository();
    const service = new QuestionService(repository);

    await service.listPublicForStorefront("shop-1", {
      shopifyProductId: "1",
      limit: 3,
    });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        shopifyProductId: "gid://shopify/Product/1",
        statuses: ["PUBLISHED", "ANSWERED"],
        limit: 3,
      }),
    );
  });

  it("publishes a pending question", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const published: QuestionRecord = {
      ...question,
      status: "PUBLISHED",
      publishedAt: new Date(),
    };
    const repository = createRepository({
      updateForShop: vi.fn().mockResolvedValue(published),
    });
    const service = new QuestionService(repository);

    const updated = await service.updateStatus("shop-1", "q-1", {
      status: "PUBLISHED",
    });

    expect(repository.updateForShop).toHaveBeenCalledWith(
      "shop-1",
      "q-1",
      expect.objectContaining({
        status: "PUBLISHED",
        publishedAt: expect.any(Date),
      }),
    );
    expect(updated.status).toBe("PUBLISHED");
  });

  it("sets answer and moves to ANSWERED unless hidden", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const answered: QuestionRecord = {
      ...question,
      answer: "Yes, slightly.",
      status: "ANSWERED",
      answeredAt: new Date(),
      publishedAt: new Date(),
    };
    const repository = createRepository({
      updateForShop: vi.fn().mockResolvedValue(answered),
    });
    const service = new QuestionService(repository);

    const updated = await service.setAnswer("shop-1", "q-1", {
      answer: "Yes, slightly.",
    });

    expect(repository.updateForShop).toHaveBeenCalledWith(
      "shop-1",
      "q-1",
      expect.objectContaining({
        answer: "Yes, slightly.",
        status: "ANSWERED",
      }),
    );
    expect(updated.status).toBe("ANSWERED");
  });

  it("keeps HIDDEN when answering a hidden question", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const hidden: QuestionRecord = { ...question, status: "HIDDEN" };
    const repository = createRepository({
      findByIdForShop: vi.fn().mockResolvedValue(hidden),
      updateForShop: vi.fn().mockResolvedValue({
        ...hidden,
        answer: "Private note",
        answeredAt: new Date(),
      }),
    });
    const service = new QuestionService(repository);

    await service.setAnswer("shop-1", "q-1", { answer: "Private note" });

    expect(repository.updateForShop).toHaveBeenCalledWith(
      "shop-1",
      "q-1",
      expect.objectContaining({
        answer: "Private note",
        status: "HIDDEN",
      }),
    );
  });

  it("omits email from public list payloads", async () => {
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        items: [
          {
            ...question,
            status: "ANSWERED",
            answer: "Yes",
          },
        ],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }),
    });
    const service = new QuestionService(repository);

    const result = await service.listPublicForStorefront("shop-1", {
      shopifyProductId: "1",
    });

    expect(result.items[0]).not.toHaveProperty("email");
    expect(result.items[0]).toMatchObject({
      customerName: "Alex",
      question: "Does this shrink?",
      answer: "Yes",
    });
  });
});
