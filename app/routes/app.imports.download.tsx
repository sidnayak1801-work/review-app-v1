import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  SAMPLE_IMPORT_CSV,
  SAMPLE_IMPORT_FILENAME,
} from "../features/review-imports/review-import.sample";
import { reviewImportService } from "../features/review-imports/review-import.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { readStoredImportFile } from "../services/import-storage.server";
import { authenticate } from "../shopify.server";

/**
 * Authenticated file downloads for imports.
 * Fetched via session-token Authorization header (no SPA navigation).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (type === "sample") {
    return new Response(SAMPLE_IMPORT_CSV, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${SAMPLE_IMPORT_FILENAME}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (type === "error-report") {
    const importId = url.searchParams.get("importId");

    if (!importId) {
      throw new Response("Missing importId", { status: 400 });
    }

    const job = await reviewImportService.getForShop(shop.id, importId);

    if (!job.errorFileKey) {
      throw new Response("Error report not found", { status: 404 });
    }

    const content = await readStoredImportFile(job.errorFileKey);

    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="import-${job.id}-errors.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  throw new Response("Unknown download type", { status: 400 });
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
