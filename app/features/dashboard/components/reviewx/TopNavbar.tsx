import { useEffect, useId, useRef, useState } from "react";
import { Form, Link } from "react-router";

import type { ActivityFeedItem } from "../../dashboard.activity";
import { formatRelativeTime } from "../../../../lib/ui-format";
import styles from "./dashboard.module.css";

interface TopNavbarProps {
  shopName: string;
  shopDomain: string;
  activity: ActivityFeedItem[];
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/** Spec § Top Navigation */
export function TopNavbar({
  shopName,
  shopDomain,
  activity,
  searchValue,
  onSearchChange,
}: TopNavbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className={styles.topbar}>
      <div className={styles.storeName} title={shopDomain}>
        {shopName}
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
            }}
          >
            <span aria-hidden style={{ fontWeight: 700 }}>
              ?
            </span>
          </button>
          {helpOpen ? (
            <div className={styles.dropdown} role="menu">
              <Link className={styles.dropdownItem} to="/app/billing" role="menuitem">
                Plans & limits
                <span className={styles.dropdownMeta}>Free vs Pro</span>
              </Link>
              <Link className={styles.dropdownItem} to="/app/api" role="menuitem">
                API documentation
                <span className={styles.dropdownMeta}>Tokens and endpoints</span>
              </Link>
            </div>
          ) : null}
        </div>

        <div
          className={styles.avatar}
          title={shopDomain}
          aria-label={`Merchant for ${shopName}`}
        >
          {(shopName.trim().charAt(0) || "M").toUpperCase()}
        </div>
      </div>
    </header>
  );
}
