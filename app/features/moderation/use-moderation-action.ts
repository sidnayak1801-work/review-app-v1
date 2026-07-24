import { useEffect } from "react";
import { useFetcher } from "react-router";

export type ModerationActionResult<TPatch> = {
  ok: boolean;
  message: string;
  patch?: TPatch;
};

/**
 * Shared fetcher wiring for moderation action forms (optimistic + result).
 */
export function useModerationAction<TPatch>(options?: {
  onOptimistic?: (patch: TPatch) => void;
  onResult?: (result: ModerationActionResult<TPatch>) => void;
}) {
  const fetcher = useFetcher<ModerationActionResult<TPatch>>();
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }
    options?.onResult?.(fetcher.data);
  }, [fetcher.state, fetcher.data, options?.onResult]);

  function submitOptimistic(
    _event: React.FormEvent<HTMLFormElement>,
    patch: TPatch,
  ) {
    options?.onOptimistic?.(patch);
  }

  return { fetcher, busy, submitOptimistic };
}
