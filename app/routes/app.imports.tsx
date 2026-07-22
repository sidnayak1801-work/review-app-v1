import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { ImportsPage } from "../features/review-imports/components/imports-page";
import { reviewImportService } from "../features/review-imports/review-import.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { isBillingTestMode } from "../lib/billing-env.server";
import { requireShopWithBillingSync } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
  });

  const imports = await reviewImportService.listRecentForShop(shop.id);

  return {
    imports: imports.map((job) => ({
      id: job.id,
      status: job.status,
      totalRows: job.totalRows,
      importedRows: job.importedRows,
      failedRows: job.failedRows,
      errorFileKey: job.errorFileKey,
      createdAt: job.createdAt.toISOString(),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
    forceSync: true,
  });
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "upload") {
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return {
          ok: false as const,
          message: "Choose a CSV file to import.",
        };
      }

      const fileContent = Buffer.from(await file.arrayBuffer());
      const job = await reviewImportService.createAndProcessImport({
        shopId: shop.id,
        shopPlan: shop.plan,
        fileName: file.name,
        fileContent,
      });

      const message =
        job.failedRows > 0
          ? `Imported ${job.importedRows} of ${job.totalRows} rows. ${job.failedRows} row${job.failedRows === 1 ? "" : "s"} failed — download the error report for details.`
          : `Imported ${job.importedRows} review${job.importedRows === 1 ? "" : "s"}.`;

      return { ok: job.importedRows > 0, message };
    }

    return { ok: false as const, message: "Unknown action." };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false as const,
        message: error.message,
        issues: error.issues,
      };
    }

    if (error instanceof DomainError) {
      return { ok: false as const, message: error.message };
    }

    throw error;
  }
};

export default function ImportsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <ImportsPage
      imports={data.imports}
      actionData={actionData}
      isSubmitting={navigation.state !== "idle"}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "Imports could not be loaded.";

  return (
    <s-page heading="Import reviews">
      <s-banner heading="Unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
