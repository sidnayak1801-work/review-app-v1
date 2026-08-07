import { useEffect, useId, useRef, useState } from "react";
import { Form, Link } from "react-router";

import type { ShopPlan } from "../../../../repositories/shop.repository.server";
import type { ActivityFeedItem } from "../../dashboard.activity";
import { formatRelativeTime } from "../../../../lib/ui-format";
import styles from "./dashboard.module.css";
import { StoreProfileDrawer } from "./StoreProfileDrawer";

interface TopNavbarProps {
  shopName: string;
  shopDomain: string;
  plan: ShopPlan;
  activity: ActivityFeedItem[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  mobileNavOpen?: boolean;
  mobileNavId?: string;
  onMobileNavToggle?: () => void;
}

/** Spec § Top Navigation */
export function TopNavbar({
  shopName,
  shopDomain,
  plan,
  activity,
  searchValue,
  onSearchChange,
  mobileNavOpen = false,
  mobileNavId,
  onMobileNavToggle,
}: TopNavbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const panelId = useId();
  const profileDrawerId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setHelpOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const initial = (shopName.trim().charAt(0) || "M").toUpperCase();

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.topbarLead}>
          {onMobileNavToggle ? (
            <button
              type="button"
              className={styles.menuBtn}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              aria-controls={mobileNavId}
              onClick={onMobileNavToggle}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                {mobileNavOpen ? (
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          ) : null}
          <div className={styles.storeName} title={shopDomain}>
            {shopName}
          </div>
        </div>

        <Form
          className={styles.searchWrap}
          method="get"
          action="/app/reviews"
          role="search"
        >
          <svg
            className={styles.searchIcon}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12.5 12.5L16 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            name="q"
            placeholder="Search reviews, products, customers…"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search reviews, products, and customers"
          />
        </Form>

        <div className={styles.topActions} ref={wrapRef}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls={panelId}
              onClick={() => {
                setNotificationsOpen((o) => !o);
                setHelpOpen(false);
                setProfileOpen(false);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M10 2.5a4.5 4.5 0 00-4.5 4.5v2.2c0 .5-.2 1-.5 1.4L3.8 12.4A1 1 0 004.6 14h10.8a1 1 0 00.8-1.6l-1.2-1.8a2 2 0 01-.5-1.4V7A4.5 4.5 0 0010 2.5z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 15.5a2 2 0 004 0"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
              {activity.length > 0 ? (
                <span className={styles.unread} aria-hidden />
              ) : null}
            </button>
            {notificationsOpen ? (
              <div className={styles.dropdown} id={panelId} role="menu">
                {activity.length === 0 ? (
                  <div className={styles.dropdownItem}>
                    No recent activity
                    <span className={styles.dropdownMeta}>You’re all caught up</span>
                  </div>
                ) : (
                  activity.slice(0, 8).map((item) => (
                    <div key={item.id} className={styles.dropdownItem} role="menuitem">
                      {item.message}
                      <span className={styles.dropdownMeta}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Help"
              aria-expanded={helpOpen}
              onClick={() => {
                setHelpOpen((o) => !o);
                setNotificationsOpen(false);
                setProfileOpen(false);
              }}
            >
              <span aria-hidden style={{ fontWeight: 700 }}>
                ?
              </span>
            </button>
            {helpOpen ? (
              <div className={styles.dropdown} role="menu">
                <a
                  className={styles.dropdownItem}
                  href="mailto:support@reviewtrix.algorithmtrix.com"
                  role="menuitem"
                >
                  Contact support
                  <span className={styles.dropdownMeta}>
                    support@reviewtrix.algorithmtrix.com
                  </span>
                </a>
                <a
                  className={styles.dropdownItem}
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                >
                  Privacy policy
                  <span className={styles.dropdownMeta}>Opens in a new tab</span>
                </a>
                <a
                  className={styles.dropdownItem}
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                >
                  Terms of service
                  <span className={styles.dropdownMeta}>Opens in a new tab</span>
                </a>
                <Link
                  className={styles.dropdownItem}
                  to="/app/billing"
                  prefetch="intent"
                  role="menuitem"
                >
                  Plans & limits
                  <span className={styles.dropdownMeta}>Free vs Pro</span>
                </Link>
                <Link
                  className={styles.dropdownItem}
                  to="/app/api"
                  prefetch="intent"
                  role="menuitem"
                >
                  API documentation
                  <span className={styles.dropdownMeta}>Tokens and endpoints</span>
                </Link>
              </div>
            ) : null}
          </div>

          <button
            ref={avatarRef}
            type="button"
            className={`${styles.avatar} ${styles.avatarBtn}`}
            title={shopDomain}
            aria-label={`Open store profile for ${shopName}`}
            aria-expanded={profileOpen}
            aria-controls={profileDrawerId}
            onClick={() => {
              setProfileOpen((o) => !o);
              setNotificationsOpen(false);
              setHelpOpen(false);
            }}
          >
            {initial}
          </button>
        </div>
      </header>

      <StoreProfileDrawer
        open={profileOpen}
        shopName={shopName}
        shopDomain={shopDomain}
        plan={plan}
        onClose={() => setProfileOpen(false)}
        triggerRef={avatarRef}
        id={profileDrawerId}
      />
    </>
  );
}
