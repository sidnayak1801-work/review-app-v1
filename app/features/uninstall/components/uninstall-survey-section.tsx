import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";

import {
  UNINSTALL_DETAILS_MAX,
  UNINSTALL_REASON_CODES,
  UNINSTALL_REASON_LABELS,
  type UninstallReasonCode,
} from "../uninstall.schema";
import styles from "../uninstall-survey.module.css";

type ActionResult =
  | { ok: true; intent: "uninstallFeedback" }
  | { ok: false; intent: "uninstallFeedback"; message: string; issues?: string[] }
  | { ok: boolean; message?: string; intent?: string };

function shopifyAppsAdminUrl(shopDomain: string): string {
  const handle = shopDomain.replace(/\.myshopify\.com$/i, "");
  return `https://admin.shopify.com/store/${handle}/settings/apps`;
}

interface UninstallSurveySectionProps {
  shopDomain: string;
}

export function UninstallSurveySection({
  shopDomain,
}: UninstallSurveySectionProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<UninstallReasonCode>>(
    () => new Set(),
  );
  const [details, setDetails] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const titleId = useId();
  const listId = useId();
  const fetcher = useFetcher<ActionResult>();
  const handledRef = useRef<ActionResult | null>(null);
  const busy = fetcher.state !== "idle";

  const summary = useMemo(() => {
    if (selected.size === 0) return null;
    return [...selected]
      .map((code) => UNINSTALL_REASON_LABELS[code])
      .join("; ");
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (handledRef.current === fetcher.data) return;
    if (fetcher.data.intent !== "uninstallFeedback") return;
    handledRef.current = fetcher.data;

    if (fetcher.data.ok) {
      const url = shopifyAppsAdminUrl(shopDomain);
      if (window.top) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
      return;
    }

    setLocalError(
      fetcher.data.message ||
        fetcher.data.issues?.join(" ") ||
        "Could not save feedback.",
    );
  }, [fetcher.state, fetcher.data, shopDomain]);

  function toggleReason(code: UninstallReasonCode) {
    setLocalError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setLocalError(null);
  }

  function submit() {
    setLocalError(null);
    if (selected.size === 0) {
      setLocalError("Select at least one reason.");
      return;
    }
    if (selected.has("other") && !details.trim()) {
      setLocalError("Please share a short note when selecting Other.");
      return;
    }

    const formData = new FormData();
    formData.set("intent", "uninstallFeedback");
    for (const code of selected) {
      formData.append("reasons", code);
    }
    formData.set("details", details);
    fetcher.submit(formData, { method: "post" });
  }

  return (
    <section className={styles.dangerCard} aria-labelledby="rx-uninstall-title">
      <h2 id="rx-uninstall-title" className={styles.dangerTitle}>
        Uninstall ReviewX
      </h2>
      <p className={styles.dangerBody}>
        Leaving? Tell us why first. You’ll still confirm uninstall in Shopify
        Admin. Reviews and settings stay until Shopify’s privacy deletion
        (~48 hours).
      </p>
      <button
        type="button"
        className={styles.openBtn}
        onClick={() => {
          setOpen(true);
          setLocalError(null);
        }}
      >
        Uninstall ReviewX
      </button>

      {open ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className={styles.dialogHeader}>
              <h3 id={titleId} className={styles.dialogTitle}>
                Uninstall ReviewX?
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Close"
                onClick={close}
                disabled={busy}
              >
                ×
              </button>
            </div>

            <p className={styles.copy}>
              You’ll no longer be able to use the app. After uninstalling,
              reviews and settings managed by ReviewX stay available until
              Shopify sends a shop deletion request (~48 hours).
            </p>
            <p className={styles.copy}>
              A request will be sent to the app developer within 48 hours to
              delete all{" "}
              <a href="/privacy" target="_blank" rel="noreferrer">
                personal customer information
              </a>
              .
            </p>

            <label className={styles.fieldLabel} htmlFor={listId}>
              Reason for uninstalling
            </label>
            <div
              className={styles.summaryBox}
              id={listId}
              aria-live="polite"
            >
              {summary ? (
                summary
              ) : (
                <span className={styles.summaryPlaceholder}>
                  Select all that apply
                </span>
              )}
            </div>

            <div className={styles.reasonList} role="group" aria-label="Reasons">
              {UNINSTALL_REASON_CODES.map((code) => (
                <label key={code} className={styles.reasonRow}>
                  <input
                    type="checkbox"
                    checked={selected.has(code)}
                    onChange={() => toggleReason(code)}
                    disabled={busy}
                  />
                  <span>{UNINSTALL_REASON_LABELS[code]}</span>
                </label>
              ))}
            </div>

            {selected.has("other") ? (
              <>
                <label className={styles.fieldLabel} htmlFor="rx-uninstall-details">
                  Share feedback
                </label>
                <textarea
                  id="rx-uninstall-details"
                  className={styles.textarea}
                  value={details}
                  maxLength={UNINSTALL_DETAILS_MAX}
                  onChange={(event) => setDetails(event.target.value)}
                  disabled={busy}
                  placeholder="Tell us what would have helped…"
                />
                <div className={styles.counterRow}>
                  {details.length}/{UNINSTALL_DETAILS_MAX}
                </div>
              </>
            ) : null}

            {localError ? (
              <p className={styles.error} role="alert">
                {localError}
              </p>
            ) : null}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnUninstall}
                onClick={submit}
                disabled={busy}
              >
                {busy ? "Saving…" : "Uninstall"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
