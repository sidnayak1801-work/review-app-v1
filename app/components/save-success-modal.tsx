import { useEffect, useId, useRef } from "react";

type ModalElement = HTMLElement & {
  showOverlay?: () => void;
  hideOverlay?: () => void;
};

interface SaveSuccessModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
  heading?: string;
}

function GreenCheckIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
      style={{ display: "block", margin: "0 auto" }}
    >
      <circle cx="28" cy="28" r="28" fill="rgba(0, 128, 96, 0.12)" />
      <circle cx="28" cy="28" r="20" fill="#008060" />
      <path
        d="M18.5 28.5l6 6 13-14"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Small success dialog after merchant Save actions (incentives, widget, etc.).
 */
export function SaveSuccessModal({
  open,
  message,
  onClose,
  heading = "Saved",
}: SaveSuccessModalProps) {
  const reactId = useId();
  const modalId = `save-success-${reactId.replace(/:/g, "")}`;
  const modalRef = useRef<ModalElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    if (open) {
      modal.showOverlay?.();
    } else {
      modal.hideOverlay?.();
    }
  }, [open]);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
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
      <s-stack direction="block" gap="base" alignItems="center">
        <GreenCheckIcon />
        <s-text>
          <span
            style={{
              display: "block",
              textAlign: "center",
              fontSize: "1.05rem",
              fontWeight: 650,
              lineHeight: 1.4,
            }}
          >
            {message}
          </span>
        </s-text>
      </s-stack>

      <s-button
        slot="primary-action"
        variant="primary"
        commandFor={modalId}
        command="--hide"
        onClick={onClose}
      >
        Done
      </s-button>
    </s-modal>
  );
}
