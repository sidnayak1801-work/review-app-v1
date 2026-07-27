import { DomainError, ValidationError } from "../../lib/domain-error";
import { parseCsv, rowToRecord, serializeCsv } from "../../lib/csv";
import type { ReviewRepository } from "../../repositories/review.repository.server";
import { reviewRepository } from "../../repositories/review.repository.server";
import type {
  ReviewImportRecord,
  ReviewImportRepository,
} from "../../repositories/review-import.repository.server";
import { reviewImportRepository } from "../../repositories/review-import.repository.server";
import type { ShopPlan } from "../../repositories/shop.repository.server";
import {
  hashImportContent,
  saveImportErrorReport,
  saveImportFile,
} from "../../services/import-storage.server";
import { logger } from "../../services/logger.server";
import type { BillingService } from "../billing/billing.service.server";
import { billingEntitlementsService } from "../billing/billing.service.server";
import {
  IMPORT_BATCH_SIZE,
  importRowSchema,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  validateImportHeaders,
} from "./review-import.schema";

export class ReviewImportService {
  constructor(
    private readonly imports: ReviewImportRepository,
    private readonly reviews: ReviewRepository,
    private readonly billing: BillingService,
  ) {}

  async listRecentForShop(
    shopId: string,
    limit = 20,
  ): Promise<ReviewImportRecord[]> {
    return this.imports.listRecentForShop(shopId, limit);
  }

  async getForShop(
    shopId: string,
    importId: string,
  ): Promise<ReviewImportRecord> {
    const job = await this.imports.findByIdForShop(shopId, importId);

    if (!job) {
      throw new DomainError("Import not found", "NOT_FOUND");
    }

    return job;
  }

  async createAndProcessImport(input: {
    shopId: string;
    shopPlan: ShopPlan;
    fileName: string;
    fileContent: Buffer;
  }): Promise<ReviewImportRecord> {
    if (input.fileContent.byteLength > MAX_IMPORT_FILE_BYTES) {
      throw new ValidationError("Invalid import file", [
        `CSV must be ${MAX_IMPORT_FILE_BYTES} bytes or smaller.`,
      ]);
    }

    const content = input.fileContent.toString("utf8");
    const parsed = parseCsv(content);
    const missingHeaders = validateImportHeaders(parsed.headers);

    if (missingHeaders.length > 0) {
      throw new ValidationError("Invalid import file", [
        `Missing required headers: ${missingHeaders.join(", ")}`,
      ]);
    }

    if (parsed.rows.length === 0) {
      throw new ValidationError("Invalid import file", [
        "CSV must include at least one data row.",
      ]);
    }

    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      throw new ValidationError("Invalid import file", [
        `CSV must include ${MAX_IMPORT_ROWS} rows or fewer.`,
      ]);
    }

    const contentHash = hashImportContent(content);
    const existing = await this.imports.findByContentHashForShop(
      input.shopId,
      contentHash,
    );

    if (existing) {
      throw new DomainError(
        "This CSV was already imported. Upload a different file or change the rows before importing again.",
        "DUPLICATE_IMPORT",
      );
    }

    const job = await this.imports.create({
      shopId: input.shopId,
      fileKey: `${input.shopId}/pending.csv`,
      contentHash,
      totalRows: parsed.rows.length,
    });

    const fileKey = await saveImportFile({
      shopId: input.shopId,
      importId: job.id,
      content: input.fileContent,
    });

    await this.imports.updateForShop(input.shopId, job.id, {
      fileKey,
      status: "PROCESSING",
    });

    return this.processImportRows({
      shopId: input.shopId,
      shopPlan: input.shopPlan,
      importId: job.id,
      headers: parsed.headers,
      rows: parsed.rows,
    });
  }

  private async processImportRows(input: {
    shopId: string;
    shopPlan: ShopPlan;
    importId: string;
    headers: string[];
    rows: string[][];
  }): Promise<ReviewImportRecord> {
    let importedRows = 0;
    let failedRows = 0;
    const errorRows: string[][] = [];
    let stopApproving = false;

    for (let index = 0; index < input.rows.length; index += IMPORT_BATCH_SIZE) {
      const batch = input.rows.slice(index, index + IMPORT_BATCH_SIZE);

      for (const [batchIndex, row] of batch.entries()) {
        const rowNumber = index + batchIndex + 2;
        const record = rowToRecord(input.headers, row);
        const parsedRow = importRowSchema.safeParse(record);

        if (!parsedRow.success) {
          failedRows += 1;
          errorRows.push([
            String(rowNumber),
            parsedRow.error.issues.map((issue) => issue.message).join("; "),
            ...row,
          ]);
          continue;
        }

        const data = parsedRow.data;

        if (data.status === "APPROVED") {
          if (stopApproving) {
            failedRows += 1;
            errorRows.push([
              String(rowNumber),
              "Published review allowance reached during import.",
              ...row,
            ]);
            continue;
          }

          try {
            await this.billing.assertCanApprovePublishedReview({
              shopId: input.shopId,
              shopPlan: input.shopPlan,
            });
          } catch (error) {
            stopApproving = true;
            failedRows += 1;
            errorRows.push([
              String(rowNumber),
              error instanceof DomainError
                ? error.message
                : "Could not approve imported review.",
              ...row,
            ]);
            continue;
          }
        }

        await this.reviews.create({
          shopId: input.shopId,
          shopifyProductId: data.product_id,
          rating: data.rating,
          title: data.title,
          body: data.body,
          authorName: data.author_name,
          authorEmail: data.author_email,
          status: data.status,
          source: "IMPORT",
          verifiedPurchase: data.verified_purchase,
          publishedAt: data.status === "APPROVED" ? new Date() : null,
        });

        importedRows += 1;
      }
    }

    let errorFileKey: string | null = null;

    if (errorRows.length > 0) {
      const errorCsv = serializeCsv(
        ["row", "error", ...input.headers],
        errorRows,
      );
      errorFileKey = await saveImportErrorReport({
        shopId: input.shopId,
        importId: input.importId,
        content: errorCsv,
      });
    }

    const finalStatus =
      importedRows > 0 && failedRows === 0
        ? "COMPLETED"
        : importedRows > 0
          ? "COMPLETED"
          : "FAILED";

    const updated = await this.imports.updateForShop(
      input.shopId,
      input.importId,
      {
        status: finalStatus,
        importedRows,
        failedRows,
        errorFileKey,
      },
    );

    if (!updated) {
      throw new DomainError("Import not found", "NOT_FOUND");
    }

    logger.info("Review import completed", {
      shopId: input.shopId,
      importId: input.importId,
      importedRows,
      failedRows,
      status: updated.status,
    });

    return updated;
  }
}

export const reviewImportService = new ReviewImportService(
  reviewImportRepository,
  reviewRepository,
  billingEntitlementsService,
);
