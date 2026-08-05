import { useEffect, useId, useRef, type RefObject } from "react";
import { Link } from "react-router";

import type { ShopPlan } from "../../../../repositories/shop.repository.server";
import styles from "./dashboard.module.css";

interface StoreProfileDrawerProps {
  open: boolean;
  shopName: string;
  shopDomain: string;
  plan: ShopPlan;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  id?: string;
}

/**
 * Right-side store profile slide-over (Notion/Stripe-style).
 * Uses shell data only — no extra Shopify fetches.
 */
export function StoreProfileDrawer({
  open,
  shopName,
  shopDomain,
  plan,
  onClose,
  triggerRef,
  id,
}: StoreProfileDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const initial = (shopName.trim().charAt(0) || "M").toUpperCase();
  const isPro = plan === "PRO";

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = triggerRef.current;
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div className={styles.storeDrawerRoot} role="presentation">
      <button
        type="button"
        className={styles.storeDrawerBackdrop}
        aria-label="Close store profile"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id={id}
        className={styles.storeDrawerPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.storeDrawerHeader}>
          <div className={styles.storeDrawerIdentity}>
            <span className={styles.storeDrawerAvatar} aria-hidden>
              {initial}
            </span>
            <div>
              <h2 id={titleId} className={styles.storeDrawerTitle}>
                {shopName}
              </h2>
              <p className={styles.storeDrawerSubtitle}>Store profile</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.storeDrawerClose}
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={styles.storeDrawerBody}>
          <div className={styles.storeDrawerField}>
            <span className={styles.storeDrawerLabel}>Shopify domain</span>
            <code className={styles.storeDrawerDomain}>{shopDomain}</code>
          </div>

          <div className={styles.storeDrawerField}>
            <span className={styles.storeDrawerLabel}>Current plan</span>
            <span
              className={`${styles.storeDrawerPlan} ${isPro ? styles.storeDrawerPlanPro : ""}`}
            >
              {isPro ? "Pro" : "Free"}
            </span>
          </div>

          <nav className={styles.storeDrawerNav} aria-label="Store shortcuts">
            <Link
              className={styles.storeDrawerLink}
              to="/app/billing"
              prefetch="intent"
              onClick={onClose}
            >
              <span>{isPro ? "Manage plan" : "Upgrade to Pro"}</span>
              <span className={styles.storeDrawerLinkMeta}>
                Billing & limits
              </span>
            </Link>
            <Link
              className={styles.storeDrawerLink}
              to="/app/settings"
              prefetch="intent"
              onClick={onClose}
            >
              <span>Widget settings</span>
              <span className={styles.storeDrawerLinkMeta}>
                Layout, colors, display
              </span>
            </Link>
            <Link
              className={styles.storeDrawerLink}
              to="/app/api"
              prefetch="intent"
              onClick={onClose}
            >
              <span>API</span>
              <span className={styles.storeDrawerLinkMeta}>
                Tokens and endpoints
              </span>
            </Link>
          </nav>
        </div>

        <p className={styles.storeDrawerFooter}>
          Shopify remains the source of truth for your store, products, and
          customers.
        </p>
      </div>
    </div>
  );
}
