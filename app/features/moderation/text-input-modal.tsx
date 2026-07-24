import { useEffect, useId, useRef, useState } from "react";

type ModalElement = HTMLElement & {
  showOverlay?: () => void;
  hideOverlay?: () => void;
};

interface TextInputModalProps {
  open: boolean;
  heading: string;
  label: string;
  placeholder: string;
  initialValue: string;
  maxLength: number;
  primaryLabel: string;
  helperText?: string;
  allowEmpty?: boolean;
  emptyErrorMessage?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function TextInputModal({
  open,
  heading,
  label,
  placeholder,
  initialValue,
  maxLength,
  primaryLabel,
  helperText,
  allowEmpty = false,
  emptyErrorMessage = "This field cannot be empty.",
  busy = false,
  error = null,
  onClose,
  onSubmit,
}: TextInputModalProps) {
  const reactId = useId();
  const modalId = `moderation-text-${reactId.replace(/:/g, "")}`;
  const modalRef = useRef<ModalElement | null>(null);
  const [value, setValue] = useState(initialValue);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setFieldError(null);
    }
  }, [open, initialValue]);

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

  function handleSubmit() {
    if (busy) {
      return;
    }
    const trimmed = value.trim();
    if (!allowEmpty && trimmed.length === 0) {
      setFieldError(emptyErrorMessage);
      return;
    }
    if (trimmed.length > maxLength) {
      setFieldError(`Must be ${maxLength} characters or fewer.`);
      return;
    }
    setFieldError(null);
    onSubmit(trimmed);
  }

  return (
    <s-modal
      id={modalId}
      heading={heading}
      size="base"
      ref={modalRef as never}
    >
      <s-stack direction="block" gap="base">
        {error ? (
          <s-banner tone="critical" heading="Could not save">
            {error}
          </s-banner>
        ) : null}
        <s-text-area
          label={label}
          name="moderationText"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={5}
          error={fieldError ?? undefined}
          disabled={busy}
          onInput={(event) => {
            const target = event.currentTarget as unknown as {
              value?: string;
            };
            setValue(String(target.value ?? ""));
            if (fieldError) {
              setFieldError(null);
            }
          }}
        />
        <s-stack
          direction="inline"
          gap="small"
          justifyContent="space-between"
          alignItems="center"
        >
          <s-text color="subdued">
            {value.length}/{maxLength}
          </s-text>
          {helperText ? <s-text color="subdued">{helperText}</s-text> : null}
        </s-stack>
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
        disabled={busy}
        onClick={handleSubmit}
      >
        {busy ? "Submitting…" : primaryLabel}
      </s-button>
    </s-modal>
  );
}

interface ReplyModalProps {
  open: boolean;
  initialValue: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function ReplyModal({
  open,
  initialValue,
  busy,
  error,
  onClose,
  onSubmit,
}: ReplyModalProps) {
  return (
    <TextInputModal
      open={open}
      heading="Reply to Review"
      label="Reply"
      placeholder="Write your reply to this customer..."
      initialValue={initialValue}
      maxLength={1000}
      primaryLabel="Submit Reply"
      emptyErrorMessage="Reply cannot be empty."
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface AnswerModalProps {
  open: boolean;
  initialValue: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function AnswerModal({
  open,
  initialValue,
  busy,
  error,
  onClose,
  onSubmit,
}: AnswerModalProps) {
  return (
    <TextInputModal
      open={open}
      heading="Answer question"
      label="Answer"
      placeholder="Write your answer to this customer..."
      initialValue={initialValue}
      maxLength={5000}
      primaryLabel="Save answer"
      helperText="Clear and save to remove the answer."
      allowEmpty
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
