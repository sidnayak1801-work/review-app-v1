import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { QuestionsPage } from "../features/questions/components/questions-page";
import { questionStatusSchema } from "../features/questions/question.schema";
import { questionService } from "../features/questions/question.service.server";
import { MODERATION_INTENTS } from "../features/moderation/moderation-intents";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

type QuestionQueueFilter =
  | "ALL"
  | "PENDING"
  | "PUBLISHED"
  | "ANSWERED"
  | "HIDDEN";

function resolveQueueFilter(value: string | null): QuestionQueueFilter {
  if (!value || value === "ALL") {
    return "ALL";
  }
  const parsed = questionStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "ALL";
}

function actionErrorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return {
      ok: false as const,
      message: error.message,
      issues: error.issues,
    };
  }
  if (error instanceof DomainError) {
    return {
      ok: false as const,
      message: error.message,
    };
  }
  throw error;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const url = new URL(request.url);
  const queueFilter = resolveQueueFilter(url.searchParams.get("status"));
  const q = url.searchParams.get("q") ?? "";

  const [result, queueCounts] = await Promise.all([
    questionService.listForShop(shop.id, {
      status: queueFilter === "ALL" ? undefined : queueFilter,
      q: q || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
      limit: 20,
    }),
    questionService.getStatusCountsForShop(shop.id),
  ]);

  const params = new URLSearchParams();
  if (queueFilter !== "ALL") {
    params.set("status", queueFilter);
  }
  if (q) {
    params.set("q", q);
  }
  if (result.pageInfo.nextCursor) {
    params.set("cursor", result.pageInfo.nextCursor);
  }

  return {
    questions: result.items,
    pageInfo: result.pageInfo,
    queueCounts,
    filters: {
      status: queueFilter,
      q,
    },
    nextHref:
      result.pageInfo.hasNextPage && result.pageInfo.nextCursor
        ? `/app/questions?${params.toString()}`
        : null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  try {
    if (intent === MODERATION_INTENTS.UPDATE_STATUS) {
      const status = String(formData.get("status") ?? "");
      const updated = await questionService.updateStatus(shop.id, questionId, {
        status,
      });
      return {
        ok: true as const,
        message: `Question marked ${updated.status.toLowerCase()}.`,
        patch: {
          questionId,
          status: updated.status,
        },
      };
    }

    if (intent === MODERATION_INTENTS.SET_ANSWER) {
      const answer = String(formData.get("answer") ?? "");
      const updated = await questionService.setAnswer(shop.id, questionId, {
        answer,
      });
      return {
        ok: true as const,
        message: updated.answer ? "Answer saved." : "Answer cleared.",
        patch: {
          questionId,
          answer: updated.answer,
          status: updated.status,
        },
      };
    }

    if (intent === MODERATION_INTENTS.DELETE) {
      await questionService.delete(shop.id, questionId);
      return {
        ok: true as const,
        message: "Question deleted.",
        patch: { questionId, deleted: true },
      };
    }

    return {
      ok: false as const,
      message: "Unknown action.",
    };
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export default function QuestionsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <QuestionsPage
      questions={data.questions}
      pageInfo={data.pageInfo}
      filters={data.filters}
      queueCounts={data.queueCounts}
      actionData={actionData}
      nextHref={data.nextHref}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <s-page heading="Q&A">
        <s-banner tone="critical" heading="Something went wrong">
          {error.status} {error.statusText}
        </s-banner>
      </s-page>
    );
  }
  return boundary.error(error);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
