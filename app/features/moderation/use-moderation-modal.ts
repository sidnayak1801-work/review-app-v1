import { useCallback, useRef, useState } from "react";

export type ModerationModalKind =
  | "none"
  | "hide"
  | "publish"
  | "feature"
  | "unfeature"
  | "reply"
  | "delete"
  | "approve"
  | "unhide"
  | "answer";

export function useModerationModal() {
  const [kind, setKind] = useState<ModerationModalKind>("none");
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = useCallback(
    (next: ModerationModalKind, trigger?: EventTarget | null) => {
      setError(null);
      if (trigger instanceof HTMLElement) {
        triggerRef.current = trigger;
      }
      setKind(next);
    },
    [],
  );

  const close = useCallback(() => {
    setKind("none");
    setError(null);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    queueMicrotask(() => {
      trigger?.focus?.();
    });
  }, []);

  return {
    kind,
    error,
    setError,
    open,
    close,
    isOpen: kind !== "none",
  };
}
