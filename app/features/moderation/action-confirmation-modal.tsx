import { useEffect, useId, useRef } from "react";

type ModalElement = HTMLElement & {
  showOverlay?: () => void;
  hideOverlay?: () => void;
};

interface ActionConfirmationModalProps {
  open: boolean;
  heading: string;
  children: React.ReactNode;
  primaryLabel: string;
  primaryTone?: "critical" | undefined;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ActionConfirmationModal({
  open,
  heading,
  children,
  primaryLabel,
  primaryTone,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: ActionConfirmationModalProps) {
  const reactId = useId();
  const modalId = `moderation-confirm-${reactId.replace(/:/g, "")}`;
  const modalRef = useRef<ModalElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) {
      return;
    }
    if (open) {
      modal.showOverlay?.();
    } else {
      modal.hideOverlay?.();
    }
  }, [open]);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) {
      return;
    }
    const handleHide = () => {
      onClose();
    };
    modal.addEventListener("hide", handleHide);
    return () => modal.removeEventListener("hide", handleHide);
  }, [onClose]);

  return (
    <s-modal
      id={modalId}
      heading={heading}
      size="small"
      ref={modalRef as never}
    >
      <s-stack direction="block" gap="base">
        {error ? (
          <s-banner tone="critical" heading="Could not complete action">
            {error}
          </s-banner>
        ) : null}
        {children}
      </s-stack>

      <s-button
        slot="secondary-actions"
        variant="secondary"
        disabled={busy}
        commandFor={modalId}
        command="--hide"
        onClick={onClose}
      >
        Cancel
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        tone={primaryTone}
        disabled={busy}
        onClick={() => {
          if (busy) {
            return;
          }
          onConfirm();
        }}
      >
        {busy ? "Working…" : primaryLabel}
      </s-button>
    </s-modal>
  );
}
