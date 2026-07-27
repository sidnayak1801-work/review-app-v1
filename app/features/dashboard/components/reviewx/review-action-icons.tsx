import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useFetcher } from "react-router";

import { ActionConfirmationModal } from "../../../moderation/action-confirmation-modal";
import {
  useModerationModal,
  type ModerationModalKind,
} from "../../../moderation/use-moderation-modal";
import styles from "./dashboard.module.css";
import type { DashboardReviewRow } from "./types";

type ActionResult = { ok: boolean; message: string };

interface ReviewActionIconsProps {
  review: Pick<DashboardReviewRow, "id" | "status">;
  showView?: boolean;
  expanded?: boolean;
  onToggleView?: () => void;
  onResult?: (result: ActionResult) => void;
}

function IconEye({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 4.5C5.5 4.5 2.2 7.6 1.2 10c1 2.4 4.3 5.5 8.8 5.5s7.8-3.1 8.8-5.5C17.8 7.6 14.5 4.5 10 4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      {crossed ? (
        <path
          d="M3.5 3.5l13 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 6.5h10M8 6.5V5a1 1 0 011-1h2a1 1 0 011 1v1.5M7.5 6.5v8a1 1 0 001 1h3a1 1 0 001-1v-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Compact icon actions for dashboard latest/pending cards.
 * Approve / Hide / Delete open ActionConfirmationModal, then POST dashboard intents.
 */
export function ReviewActionIcons({
  review,
  showView = false,
  expanded = false,
  onToggleView,
  onResult,
}: ReviewActionIconsProps) {
  const fetcher = useFetcher<ActionResult>();
  const busy = fetcher.state !== "idle";
  const { kind, error, setError, open, close } = useModerationModal();
  const [pendingKind, setPendingKind] = useState<ModerationModalKind>("none");
  const handledDataRef = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (handledDataRef.current === fetcher.data) return;
    handledDataRef.current = fetcher.data;

    onResult?.(fetcher.data);

    if (fetcher.data.ok) {
      setPendingKind("none");
      close();
      return;
    }

    setError(fetcher.data.message || "Something went wrong. Please try again.");
    setPendingKind("none");
  }, [fetcher.state, fetcher.data, onResult, close, setError]);

  function openModal(next: ModerationModalKind, event: MouseEvent) {
    open(next, event.currentTarget);
  }

  function submitConfirm(
    next: ModerationModalKind,
    formData: FormData,
  ) {
    if (busy) return;
    setError(null);
    setPendingKind(next);
    handledDataRef.current = null;
    fetcher.submit(formData, { method: "post" });
  }

  const submitting = busy && pendingKind !== "none";

  return (
    <>
      <div className={styles.iconActions}>
        {showView && onToggleView ? (
          <button
            type="button"
            className={styles.iconBtn}
            title={expanded ? "Collapse review" : "View full review"}
            aria-label={expanded ? "Collapse review" : "View full review"}
            aria-expanded={expanded}
            onClick={onToggleView}
          >
            <IconEye />
          </button>
        ) : null}

        {review.status !== "APPROVED" ? (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnOk}`}
            title="Approve review"
            aria-label="Approve review"
            disabled={busy}
            onClick={(event) => openModal("publish", event)}
          >
            <IconCheck />
          </button>
        ) : null}

        {review.status !== "REJECTED" ? (
          <button
            type="button"
            className={styles.iconBtn}
            title="Hide review"
            aria-label="Hide review"
            disabled={busy}
            onClick={(event) => openModal("hide", event)}
          >
            <IconEye crossed />
          </button>
        ) : null}

        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
          title="Delete review"
          aria-label="Delete review"
          disabled={busy}
          onClick={(event) => openModal("delete", event)}
        >
          <IconTrash />
        </button>
      </div>

      <ActionConfirmationModal
        open={kind === "publish"}
        heading="Approve Review"
        primaryLabel="Approve Review"
        busy={submitting && pendingKind === "publish"}
        error={kind === "publish" ? error : null}
        onClose={close}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", "update-status");
          formData.set("reviewId", review.id);
          formData.set("status", "APPROVED");
          submitConfirm("publish", formData);
        }}
      >
        <s-text>
          Approved reviews are visible to customers on your storefront.
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
          formData.set("intent", "update-status");
          formData.set("reviewId", review.id);
          formData.set("status", "REJECTED");
          submitConfirm("hide", formData);
        }}
      >
        <s-text>
          Hidden reviews will no longer be visible to customers.
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
          formData.set("intent", "delete");
          formData.set("reviewId", review.id);
          submitConfirm("delete", formData);
        }}
      >
        <s-text>
          This permanently deletes the review and cannot be undone.
        </s-text>
      </ActionConfirmationModal>
    </>
  );
}
