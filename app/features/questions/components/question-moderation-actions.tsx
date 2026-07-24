import { useEffect, useRef, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFetcher } from "react-router";

import { ActionConfirmationModal } from "../../moderation/action-confirmation-modal";
import { MODERATION_INTENTS } from "../../moderation/moderation-intents";
import {
  QUESTION_TOAST,
  showModerationToast,
} from "../../moderation/show-moderation-toast";
import { AnswerModal } from "../../moderation/text-input-modal";
import {
  useModerationModal,
  type ModerationModalKind,
} from "../../moderation/use-moderation-modal";

export type ModerationQuestion = {
  id: string;
  status: string;
  answer: string | null;
};

export type QuestionModerationPatch = {
  questionId: string;
  deleted?: boolean;
  status?: string;
  answer?: string | null;
};

interface QuestionModerationActionsProps {
  question: ModerationQuestion;
  showDelete?: boolean;
  onOptimistic?: (patch: QuestionModerationPatch) => void;
  onResult?: (result: {
    ok: boolean;
    message: string;
    patch?: QuestionModerationPatch;
  }) => void;
}

type ActionResult = {
  ok: boolean;
  message: string;
  patch?: QuestionModerationPatch;
};

type PendingAction = {
  kind: ModerationModalKind;
  patch: QuestionModerationPatch;
  toast: string;
};

export function QuestionModerationActions({
  question,
  showDelete = true,
  onOptimistic,
  onResult,
}: QuestionModerationActionsProps) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<ActionResult>();
  const busy = fetcher.state !== "idle";
  const { kind, error, setError, open, close } = useModerationModal();
  const [pendingKind, setPendingKind] = useState<ModerationModalKind>("none");
  const pendingRef = useRef<PendingAction | null>(null);
  const handledDataRef = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }
    if (handledDataRef.current === fetcher.data) {
      return;
    }
    handledDataRef.current = fetcher.data;

    const pending = pendingRef.current;
    if (!pending) {
      return;
    }

    onResult?.(fetcher.data);

    if (fetcher.data.ok) {
      const patch = fetcher.data.patch ?? pending.patch;
      onOptimistic?.(patch);
      showModerationToast(shopify, pending.toast);
      pendingRef.current = null;
      setPendingKind("none");
      close();
      return;
    }

    setError(fetcher.data.message || "Something went wrong. Please try again.");
    setPendingKind("none");
  }, [
    fetcher.state,
    fetcher.data,
    onOptimistic,
    onResult,
    shopify,
    close,
    setError,
  ]);

  function submitAction(pending: PendingAction, formData: FormData) {
    if (busy) {
      return;
    }
    setError(null);
    pendingRef.current = pending;
    setPendingKind(pending.kind);
    handledDataRef.current = null;
    fetcher.submit(formData, { method: "post" });
  }

  function openFromEvent(next: ModerationModalKind, event: Event) {
    open(next, event.currentTarget);
  }

  const submitting = busy && pendingKind !== "none";
  const unhideStatus = question.answer ? "ANSWERED" : "PUBLISHED";

  return (
    <s-stack direction="block" gap="small">
      <s-stack direction="inline" gap="small">
        {question.status !== "PUBLISHED" && question.status !== "ANSWERED" ? (
          <s-button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={(event) => openFromEvent("approve", event)}
          >
            Approve
          </s-button>
        ) : null}
        {question.status !== "HIDDEN" ? (
          <s-button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={(event) => openFromEvent("hide", event)}
          >
            Hide
          </s-button>
        ) : (
          <s-button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={(event) => openFromEvent("unhide", event)}
          >
            Unhide
          </s-button>
        )}
        <s-button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={(event) => openFromEvent("answer", event)}
        >
          {question.answer ? "Edit answer" : "Answer"}
        </s-button>
        {showDelete ? (
          <s-button
            type="button"
            tone="critical"
            variant="secondary"
            disabled={busy}
            onClick={(event) => openFromEvent("delete", event)}
          >
            Delete
          </s-button>
        ) : null}
      </s-stack>

      {question.answer ? (
        <s-box padding="small" background="subdued" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            <s-text type="strong">Answer</s-text>
            <s-text>{question.answer}</s-text>
          </s-stack>
        </s-box>
      ) : null}

      <ActionConfirmationModal
        open={kind === "approve"}
        heading="Approve question"
        primaryLabel="Approve"
        busy={submitting && pendingKind === "approve"}
        error={kind === "approve" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.UPDATE_STATUS);
          formData.set("questionId", question.id);
          formData.set("status", "PUBLISHED");
          submitAction(
            {
              kind: "approve",
              patch: { questionId: question.id, status: "PUBLISHED" },
              toast: QUESTION_TOAST.approved,
            },
            formData,
          );
        }}
      >
        <s-text>
          Approved questions are visible to customers on your storefront.
        </s-text>
      </ActionConfirmationModal>

      <ActionConfirmationModal
        open={kind === "hide"}
        heading="Hide question"
        primaryLabel="Hide question"
        busy={submitting && pendingKind === "hide"}
        error={kind === "hide" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.UPDATE_STATUS);
          formData.set("questionId", question.id);
          formData.set("status", "HIDDEN");
          submitAction(
            {
              kind: "hide",
              patch: { questionId: question.id, status: "HIDDEN" },
              toast: QUESTION_TOAST.hidden,
            },
            formData,
          );
        }}
      >
        <s-text>
          Hidden questions will no longer be visible to customers.
        </s-text>
      </ActionConfirmationModal>

      <ActionConfirmationModal
        open={kind === "unhide"}
        heading="Publish question"
        primaryLabel="Publish question"
        busy={submitting && pendingKind === "unhide"}
        error={kind === "unhide" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.UPDATE_STATUS);
          formData.set("questionId", question.id);
          formData.set("status", unhideStatus);
          submitAction(
            {
              kind: "unhide",
              patch: { questionId: question.id, status: unhideStatus },
              toast: QUESTION_TOAST.unhidden,
            },
            formData,
          );
        }}
      >
        <s-text>
          This question will be visible to customers on your storefront again.
        </s-text>
      </ActionConfirmationModal>

      <ActionConfirmationModal
        open={kind === "delete"}
        heading="Delete question"
        primaryLabel="Delete question"
        primaryTone="critical"
        busy={submitting && pendingKind === "delete"}
        error={kind === "delete" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.DELETE);
          formData.set("questionId", question.id);
          submitAction(
            {
              kind: "delete",
              patch: { questionId: question.id, deleted: true },
              toast: QUESTION_TOAST.deleted,
            },
            formData,
          );
        }}
      >
        <s-stack direction="block" gap="small">
          <s-text>Do you really want to delete this question?</s-text>
          <s-text color="subdued">This action cannot be undone.</s-text>
        </s-stack>
      </ActionConfirmationModal>

      <AnswerModal
        open={kind === "answer"}
        initialValue={question.answer ?? ""}
        busy={submitting && pendingKind === "answer"}
        error={kind === "answer" ? error : null}
        onClose={close}
        onSubmit={(answer) => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.SET_ANSWER);
          formData.set("questionId", question.id);
          formData.set("answer", answer);
          submitAction(
            {
              kind: "answer",
              patch: {
                questionId: question.id,
                answer: answer.length > 0 ? answer : null,
                status:
                  answer.length > 0 && question.status !== "HIDDEN"
                    ? "ANSWERED"
                    : undefined,
              },
              toast: QUESTION_TOAST.answered,
            },
            formData,
          );
        }}
      />
    </s-stack>
  );
}
