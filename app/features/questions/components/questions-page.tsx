import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  avatarInitial,
  formatRelativeTime,
} from "../../../lib/ui-format";
import {
  toAppProductHref,
  toShopifyProductNumericId,
} from "../../../lib/shopify-ids";
import { ModerationQueueToolbar } from "../../moderation/moderation-queue-toolbar";
import { ModerationStatusBadge } from "../../moderation/moderation-status-badge";
import {
  QuestionModerationActions,
  type QuestionModerationPatch,
} from "./question-moderation-actions";

type QuestionQueueFilter =
  | "ALL"
  | "PENDING"
  | "PUBLISHED"
  | "ANSWERED"
  | "HIDDEN";

interface QuestionListItem {
  id: string;
  shopifyProductId: string;
  productTitle?: string | null;
  customerName: string;
  email: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
}

interface QuestionsPageProps {
  questions: QuestionListItem[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  filters: {
    status: QuestionQueueFilter;
    q: string;
  };
  queueCounts: {
    PENDING: number;
    PUBLISHED: number;
    ANSWERED: number;
    HIDDEN: number;
  };
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
  };
  nextHref: string | null;
}

function buildQueueHref(status: QuestionQueueFilter, q: string): string {
  const params = new URLSearchParams();
  if (status !== "ALL") {
    params.set("status", status);
  }
  if (q) {
    params.set("q", q);
  }
  const query = params.toString();
  return query ? `?${query}` : "?";
}

function productLabel(item: {
  shopifyProductId: string;
  productTitle?: string | null;
}): string {
  if (item.productTitle?.trim()) {
    return item.productTitle.trim();
  }
  try {
    return `Product #${toShopifyProductNumericId(item.shopifyProductId)}`;
  } catch {
    return "Unknown product";
  }
}

function emptyQueueMessage(status: QuestionQueueFilter): string {
  switch (status) {
    case "ALL":
      return "No questions yet. Customers can ask from your storefront Q&A block.";
    case "PENDING":
      return "No pending questions. New storefront questions will appear here.";
    case "PUBLISHED":
      return "No published questions yet.";
    case "ANSWERED":
      return "No answered questions yet.";
    case "HIDDEN":
      return "No hidden questions.";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PUBLISHED":
      return "Published";
    case "ANSWERED":
      return "Answered";
    case "HIDDEN":
      return "Hidden";
    default:
      return status;
  }
}

export function QuestionsPage({
  questions: initialQuestions,
  filters,
  queueCounts,
  actionData,
  nextHref,
}: QuestionsPageProps) {
  const [questions, setQuestions] = useState(initialQuestions);

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  const totalCount =
    queueCounts.PENDING +
    queueCounts.PUBLISHED +
    queueCounts.ANSWERED +
    queueCounts.HIDDEN;

  const tabs = [
    { status: "ALL", label: "All", count: totalCount },
    { status: "PENDING", label: "Pending", count: queueCounts.PENDING },
    { status: "PUBLISHED", label: "Published", count: queueCounts.PUBLISHED },
    { status: "ANSWERED", label: "Answered", count: queueCounts.ANSWERED },
    { status: "HIDDEN", label: "Hidden", count: queueCounts.HIDDEN },
  ];

  function applyPatch(patch: QuestionModerationPatch) {
    setQuestions((current) => {
      if (patch.deleted) {
        return current.filter((item) => item.id !== patch.questionId);
      }
      return current.map((item) => {
        if (item.id !== patch.questionId) {
          return item;
        }
        return {
          ...item,
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.answer !== undefined ? { answer: patch.answer } : {}),
        };
      });
    });
  }

  return (
    <s-page heading="Q&A">
      <s-stack direction="block" gap="large">
        <s-stack
          direction="inline"
          gap="small"
          alignItems="center"
          justifyContent="space-between"
        >
          <s-text color="subdued">
            Answer customer product questions · Newest first
          </s-text>
        </s-stack>

        {queueCounts.PENDING > 0 ? (
          <s-banner heading="Questions waiting" tone="warning">
            {queueCounts.PENDING} pending question
            {queueCounts.PENDING === 1 ? "" : "s"} need a response or approval.
          </s-banner>
        ) : null}

        {actionData ? (
          <s-banner
            heading={actionData.ok ? "Saved" : "Could not save"}
            tone={actionData.ok ? "success" : "critical"}
          >
            {actionData.message}
            {actionData.issues?.length ? (
              <s-unordered-list>
                {actionData.issues.map((issue) => (
                  <s-list-item key={issue}>{issue}</s-list-item>
                ))}
              </s-unordered-list>
            ) : null}
          </s-banner>
        ) : null}

        <ModerationQueueToolbar
          tabs={tabs}
          activeStatus={filters.status}
          buildHref={(status) =>
            buildQueueHref(status as QuestionQueueFilter, filters.q)
          }
          search={{
            name: "q",
            label: "Search questions, names, emails, products",
            value: filters.q,
            statusValue: filters.status,
            allStatusValue: "ALL",
          }}
        />

        {questions.length === 0 ? (
          <s-box
            padding="large"
            border="base"
            borderRadius="large"
            background="subdued"
          >
            <s-stack direction="block" gap="base">
              <s-heading>Start collecting questions</s-heading>
              <s-text>{emptyQueueMessage(filters.status)}</s-text>
              <s-text color="subdued">
                Add the Q&A block to a product template in the theme editor.
              </s-text>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {questions.map((item) => (
              <s-box
                key={item.id}
                padding="base"
                border="base"
                borderRadius="large"
                background="base"
              >
                <s-stack direction="block" gap="base">
                  <s-stack
                    direction="inline"
                    gap="base"
                    alignItems="start"
                    justifyContent="space-between"
                  >
                    <s-stack direction="inline" gap="base" alignItems="center">
                      <s-box
                        padding="small"
                        borderRadius="base"
                        background="subdued"
                      >
                        <s-text type="strong">
                          {avatarInitial(item.customerName)}
                        </s-text>
                      </s-box>
                      <s-stack direction="block" gap="small-200">
                        <s-text type="strong">{item.customerName}</s-text>
                        <s-text color="subdued">{item.email}</s-text>
                        <s-text color="subdued">
                          {formatRelativeTime(item.createdAt)}
                        </s-text>
                      </s-stack>
                    </s-stack>
                    <ModerationStatusBadge
                      status={item.status}
                      label={statusLabel(item.status)}
                    />
                  </s-stack>

                  <s-text type="strong">{item.question}</s-text>

                  {(() => {
                    const href = toAppProductHref(item.shopifyProductId);
                    const label = productLabel(item);
                    return href ? (
                      <s-text color="subdued">
                        Product: <s-link href={href}>{label}</s-link>
                      </s-text>
                    ) : (
                      <s-text color="subdued">Product: {label}</s-text>
                    );
                  })()}

                  <QuestionModerationActions
                    question={{
                      id: item.id,
                      status: item.status,
                      answer: item.answer,
                    }}
                    onOptimistic={applyPatch}
                    onResult={(result) => {
                      if (result.ok && result.patch) {
                        applyPatch(result.patch);
                      }
                    }}
                  />
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}

        {nextHref ? (
          <s-stack direction="inline" gap="small">
            <s-button href={nextHref} variant="secondary">
              Load more
            </s-button>
          </s-stack>
        ) : null}

        <s-text color="subdued">
          Tip: Approve publishes a question; Answer publishes with your reply.{" "}
          <Link to="/app/settings">Widget settings</Link>
        </s-text>
      </s-stack>
    </s-page>
  );
}
