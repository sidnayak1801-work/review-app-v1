import { afterEach, describe, expect, it, vi } from "vitest";

import { DomainError } from "../../lib/domain-error";
import type {
  ReviewImportRecord,
  ReviewImportRepository,
} from "../../repositories/review-import.repository.server";
import type {
  ReviewRecord,
  ReviewRepository,
} from "../../repositories/review.repository.server";
import type { BillingService } from "../billing/billing.service.server";
import { ReviewImportService } from "./review-import.service.server";

vi.mock("../../services/import-storage.server", () => ({
  hashImportContent: vi.fn().mockReturnValue("hash-1"),
  saveImportFile: vi.fn().mockResolvedValue("shop-1/import-1.csv"),
  saveImportErrorReport: vi
    .fn()
    .mockResolvedValue("shop-1/import-1-errors.csv"),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const importJob: ReviewImportRecord = {
  id: "import-1",
  shopId: "shop-1",
  status: "PENDING",
  fileKey: "shop-1/pending.csv",
  contentHash: "hash-1",
  totalRows: 1,
  importedRows: 0,
  failedRows: 0,
  errorFileKey: null,
  createdAt: new Date("2026-07-20T00:00:00.000Z"),
  updatedAt: new Date("2026-07-20T00:00:00.000Z"),
};

const review: ReviewRecord = {
  id: "review-1",
  shopId: "shop-1",
  shopifyProductId: "gid://shopify/Product/1",
  shopifyCustomerId: null,
  rating: 5,
  title: null,
  body: "Great product",
  authorName: "Alex",
  authorEmail: null,
  status: "PENDING",
  source: "IMPORT",
  verifiedPurchase: false,
  publishedAt: null,
  createdAt: new Date("2026-07-20T00:00:00.000Z"),
  updatedAt: new Date("2026-07-20T00:00:00.000Z"),
};

function createImportRepository(
  overrides: Partial<ReviewImportRepository> = {},
): ReviewImportRepository {
  return {
    create: vi.fn().mockResolvedValue(importJob),
    findByIdForShop: vi.fn().mockResolvedValue(importJob),
    findByContentHashForShop: vi.fn().mockResolvedValue(null),
    listRecentForShop: vi.fn().mockResolvedValue([]),
    updateForShop: vi
      .fn()
      .mockImplementation(async (_shopId, _importId, input) => ({
        ...importJob,
        ...input,
      })),
    ...overrides,
  };
}

function createReviewRepository(
  overrides: Partial<ReviewRepository> = {},
): ReviewRepository {
  return {
    create: vi.fn().mockResolvedValue(review),
    findByIdForShop: vi.fn(),
    findByIdsForShop: vi.fn(),
    list: vi.fn(),
    countApprovedForShop: vi.fn(),
    countByStatusForShop: vi.fn(),
    updateForShop: vi.fn(),
    deleteForShop: vi.fn(),
    ...overrides,
  };
}

function createBilling(
  overrides: Partial<BillingService> = {},
): BillingService {
  return {
    assertCanApprovePublishedReview: vi.fn().mockResolvedValue(undefined),
    getPublishedReviewUsage: vi.fn(),
    ...overrides,
  };
}

function validCsv(rows: string[], extraHeader = ""): string {
  const header = `product_id,rating,body,author_name${extraHeader ? `,${extraHeader}` : ""}`;
  return `${header}\n${rows.join("\n")}\n`;
}

describe("ReviewImportService", () => {
  it("imports valid rows as pending reviews", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const imports = createImportRepository();
    const reviews = createReviewRepository();
    const billing = createBilling();
    const service = new ReviewImportService(imports, reviews, billing);

    const result = await service.createAndProcessImport({
      shopId: "shop-1",
      shopPlan: "FREE",
      fileName: "reviews.csv",
      fileContent: Buffer.from(
        validCsv(["1,5,Great product,Alex"]),
        "utf8",
      ),
    });

    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        shopifyProductId: "gid://shopify/Product/1",
        status: "PENDING",
        source: "IMPORT",
      }),
    );
    expect(result.importedRows).toBe(1);
    expect(result.failedRows).toBe(0);
    expect(result.status).toBe("COMPLETED");
  });

  it("records row validation failures and writes an error report", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const imports = createImportRepository();
    const reviews = createReviewRepository();
    const billing = createBilling();
    const service = new ReviewImportService(imports, reviews, billing);

    const result = await service.createAndProcessImport({
      shopId: "shop-1",
      shopPlan: "FREE",
      fileName: "reviews.csv",
      fileContent: Buffer.from(
        validCsv(["1,6,Great product,Alex", "1,5,Good product,Jamie"]),
        "utf8",
      ),
    });

    expect(reviews.create).toHaveBeenCalledTimes(1);
    expect(result.importedRows).toBe(1);
    expect(result.failedRows).toBe(1);
    expect(result.errorFileKey).toBe("shop-1/import-1-errors.csv");
  });

  it("rejects duplicate uploads for the same CSV content", async () => {
    const imports = createImportRepository({
      findByContentHashForShop: vi.fn().mockResolvedValue(importJob),
    });
    const service = new ReviewImportService(
      imports,
      createReviewRepository(),
      createBilling(),
    );

    await expect(
      service.createAndProcessImport({
        shopId: "shop-1",
        shopPlan: "FREE",
        fileName: "reviews.csv",
        fileContent: Buffer.from(
          validCsv(["1,5,Great product,Alex"]),
          "utf8",
        ),
      }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "DUPLICATE_IMPORT",
    });
  });

  it("respects billing limits for approved import rows", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const billing = createBilling({
      assertCanApprovePublishedReview: vi
        .fn()
        .mockRejectedValue(
          new DomainError("Free plan limit reached", "PLAN_LIMIT_REACHED"),
        ),
    });
    const imports = createImportRepository();
    const reviews = createReviewRepository();
    const service = new ReviewImportService(imports, reviews, billing);

    const result = await service.createAndProcessImport({
      shopId: "shop-1",
      shopPlan: "FREE",
      fileName: "reviews.csv",
      fileContent: Buffer.from(
        validCsv(["1,5,Great product,Alex,APPROVED"], "status"),
        "utf8",
      ),
    });

    expect(reviews.create).not.toHaveBeenCalled();
    expect(result.importedRows).toBe(0);
    expect(result.failedRows).toBe(1);
    expect(result.status).toBe("FAILED");
  });
});
