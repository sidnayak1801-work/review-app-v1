import { useCallback, useEffect, useRef, useState } from "react";

type SaveActionResult = {
  ok: boolean;
  message?: string;
};

/**
 * Opens a save-success modal once per submit edge (submitting → idle) when ok.
 * Errors are left to page banners.
 */
export function useSaveSuccessModal(
  actionData: SaveActionResult | undefined,
  isSubmitting: boolean,
  defaultSuccessMessage: string,
) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultSuccessMessage);
  const wasSubmittingRef = useRef(false);

  useEffect(() => {
    if (isSubmitting) {
      wasSubmittingRef.current = true;
      return;
    }

    if (!wasSubmittingRef.current || !actionData) {
      return;
    }

    wasSubmittingRef.current = false;

    if (!actionData.ok) {
      return;
    }

    setMessage(
      actionData.message?.trim() || defaultSuccessMessage,
    );
    setOpen(true);
  }, [actionData, isSubmitting, defaultSuccessMessage]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return { open, message, close };
}
