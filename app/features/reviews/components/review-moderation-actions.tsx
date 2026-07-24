import { useEffect, useRef, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFetcher } from "react-router";

import { ActionConfirmationModal } from "../../moderation/action-confirmation-modal";
import { MODERATION_INTENTS } from "../../moderation/moderation-intents";
import {
  REVIEW_TOAST,
  showModerationToast,
} from "../../moderation/show-moderation-toast";
import { ReplyModal } from "../../moderation/text-input-modal";
import {
  useModerationModal,
  type ModerationModalKind,
} from "../../moderation/use-moderation-modal";

export type ModerationReview = {
  id: string;
  status: string;
  featured: boolean;
  merchantReply: string | null;
};

export type ModerationPatch = {
  reviewId: string;
  deleted?: boolean;
  status?: string;
  featured?: boolean;
  merchantReply?: string | null;
};

interface ReviewModerationActionsProps {
  review: ModerationReview;
  atPublishedLimit?: boolean;
  showDelete?: boolean;
  onOptimistic?: (patch: ModerationPatch) => void;
  onResult?: (result: {
    ok: boolean;
    message: string;
    patch?: ModerationPatch;
  }) => void;
}

type ActionResult = {
  ok: boolean;
  message: string;
  patch?: ModerationPatch;
};

type PendingAction = {
  kind: ModerationModalKind;
  patch: ModerationPatch;
  toast: string;
};

export function ReviewModerationActions({
  review,
  atPublishedLimit = false,
  showDelete = true,
  onOptimistic,
  onResult,
}: ReviewModerationActionsProps) {
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

  return (
    <s-stack direction="block" gap="small">
      <s-stack direction="inline" gap="small">
        {review.status !== "APPROVED" ? (
          <s-button
            type="button"
            variant="primary"
            disabled={busy || atPublishedLimit}
            onClick={(event) => openFromEvent("publish", event)}
          >
            Publish
          </s-button>
        ) : null}
        {review.status !== "REJECTED" ? (
          <s-button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={(event) => openFromEvent("hide", event)}
          >
            Hide
          </s-button>
        ) : null}
        <s-button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={(event) =>
            openFromEvent(review.featured ? "unfeature" : "feature", event)
          }
        >
          {review.featured ? "Unfeature" : "Feature"}
        </s-button>
        <s-button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={(event) => openFromEvent("reply", event)}
        >
          {review.merchantReply ? "Edit reply" : "Reply"}
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

      {review.merchantReply ? (
        <s-box padding="small" background="subdued" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            <s-text type="strong">Merchant reply</s-text>
            <s-text>{review.merchantReply}</s-text>
          </s-stack>
        </s-box>
      ) : null}

      <ActionConfirmationModal
        open={kind === "publish"}
        heading="Publish Review"
        primaryLabel="Publish Review"
        busy={submitting && pendingKind === "publish"}
        error={kind === "publish" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.UPDATE_STATUS);
          formData.set("reviewId", review.id);
          formData.set("status", "APPROVED");
          submitAction(
            {
              kind: "publish",
              patch: { reviewId: review.id, status: "APPROVED" },
              toast: REVIEW_TOAST.published,
            },
            formData,
          );
        }}
      >
        <s-text>
          Published reviews are visible to customers on your storefront.
        </s-text>
      </ActionConfirmationModal>

      <ActionConfirmationModal
        open={kind === "hide"}
        heading="Hide Review"
        primaryLabel="Hide Review"
        busy={submitting && pendingKind === "hide"}
        error={kind === "hide" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.UPDATE_STATUS);
          formData.set("reviewId", review.id);
          formData.set("status", "REJECTED");
          submitAction(
            {
              kind: "hide",
              patch: { reviewId: review.id, status: "REJECTED" },
              toast: REVIEW_TOAST.hidden,
            },
            formData,
          );
        }}
      >
        <s-text>
          Hidden reviews will no longer be visible to customers.
        </s-text>
      </ActionConfirmationModal>

      <ActionConfirmationModal
        open={kind === "feature"}
        heading="Feature Review"
        primaryLabel="Feature Review"
        busy={submitting && pendingKind === "feature"}
        error={kind === "feature" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.SET_FEATURED);
          formData.set("reviewId", review.id);
          formData.set("featured", "true");
          submitAction(
            {
              kind: "feature",
              patch: { reviewId: review.id, featured: true },
              toast: REVIEW_TOAST.featured,
            },
            formData,
          );
        }}
      >
        <s-text>
          Featured reviews are prioritized in the storefront widget.
        </s-text>
      </ActionConfirmationModal>

      <ActionConfirmationModal
        open={kind === "unfeature"}
        heading="Remove Feature"
        primaryLabel="Remove Feature"
        busy={submitting && pendingKind === "unfeature"}
        error={kind === "unfeature" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.SET_FEATURED);
          formData.set("reviewId", review.id);
          formData.set("featured", "false");
          submitAction(
            {
              kind: "unfeature",
              patch: { reviewId: review.id, featured: false },
              toast: REVIEW_TOAST.unfeatured,
            },
            formData,
          );
        }}
      >
        <s-text>
          This review will no longer be prioritized in the storefront widget.
        </s-text>
      </ActionConfirmationModal>

      <ActionConfirmationModal
        open={kind === "delete"}
        heading="Delete Review"
        primaryLabel="Delete Review"
        primaryTone="critical"
        busy={submitting && pendingKind === "delete"}
        error={kind === "delete" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.DELETE);
          formData.set("reviewId", review.id);
          submitAction(
            {
              kind: "delete",
              patch: { reviewId: review.id, deleted: true },
              toast: REVIEW_TOAST.deleted,
            },
            formData,
          );
        }}
      >
        <s-stack direction="block" gap="small">
          <s-text>Do you really want to delete this review?</s-text>
          <s-text color="subdued">This action cannot be undone.</s-text>
        </s-stack>
      </ActionConfirmationModal>

      <ReplyModal
        open={kind === "reply"}
        initialValue={review.merchantReply ?? ""}
        busy={submitting && pendingKind === "reply"}
        error={kind === "reply" ? error : null}
        onClose={close}
        onSubmit={(reply) => {
          const formData = new FormData();
          formData.set("intent", MODERATION_INTENTS.SET_REPLY);
          formData.set("reviewId", review.id);
          formData.set("merchantReply", reply);
          submitAction(
            {
              kind: "reply",
              patch: { reviewId: review.id, merchantReply: reply },
              toast: REVIEW_TOAST.replied,
            },
            formData,
          );
        }}
      />
    </s-stack>
  );
}
