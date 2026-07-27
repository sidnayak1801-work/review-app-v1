import { Link, useLocation } from "react-router";

import type { ShopPlan } from "../../../../repositories/shop.repository.server";
import styles from "./dashboard.module.css";

/** Spec sidebar + full merchant destinations */
const NAV = [
  { to: "/app", label: "Dashboard", icon: "⌂" },
  { to: "/app/reviews", label: "Reviews", icon: "★" },
  { to: "/app/questions", label: "Q&A", icon: "?" },
  { to: "/app/review-requests", label: "Review Requests", icon: "✉" },
  { to: "/app/imports", label: "Imports", icon: "⇪" },
  { to: "/app/incentives", label: "Incentives", icon: "◎" },
  { to: "/app/integrations", label: "Integrations", icon: "⧉" },
  { to: "/app/settings", label: "Widgets", icon: "▣" },
  {
    to: "/app/settings",
    label: "Customization",
    icon: "✎",
    hash: "#widget-settings",
  },
  { to: "/app", label: "Analytics", icon: "▦", hash: "#analytics" },
  { to: "/app/api", label: "API", icon: "{ }" },
  { to: "/app/billing", label: "Billing", icon: "◈" },
  { to: "/app/settings", label: "Settings", icon: "⚙" },
] as const;

function isActive(
  item: (typeof NAV)[number],
  pathname: string,
  hash: string,
): boolean {
  const home = pathname === "/app" || pathname === "/app/";

  if ("hash" in item && item.hash === "#analytics") {
    return home && hash === "#analytics";
  }
  if ("hash" in item && item.hash === "#widget-settings") {
    return pathname.startsWith("/app/settings") && hash === "#widget-settings";
  }
  if (item.label === "Dashboard") {
    return home && hash !== "#analytics";
  }
  if (item.label === "Widgets") {
    return pathname.startsWith("/app/settings") && hash !== "#widget-settings";
  }
  if (item.label === "Settings") {
    return false;
  }
  if (item.to === "/app") {
    return home && hash !== "#analytics";
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2l1.2 4.2L15.5 7.5l-4.3 1.3L10 13l-1.2-4.2L4.5 7.5l4.3-1.3L10 2z"
        fill="currentColor"
      />
      <path
        d="M15.5 12l.6 2.1 2.1.6-2.1.6-.6 2.1-.6-2.1-2.1-.6 2.1-.6.6-2.1z"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  plan: ShopPlan;
}

export function Sidebar({ collapsed, onToggle, plan }: SidebarProps) {
  const location = useLocation();
  const isPro = plan === "PRO";

  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>
          RX
        </span>
        <span className={styles.brandText}>ReviewX</span>
      </div>

      <p className={styles.navSection}>Menu</p>

      <nav className={styles.navList}>
        {NAV.map((item) => {
          const href = `${item.to}${"hash" in item ? item.hash : ""}`;
          const active = isActive(item, location.pathname, location.hash);
          return (
            <Link
              key={`${item.label}-${href}`}
              to={href}
              className={`${styles.navLink} ${active ? styles.navActive : ""}`}
              aria-current={active ? "page" : undefined}
              title={item.label}
            >
              <span className={styles.navIcon} aria-hidden>
                {item.icon}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "« Collapse"}
        </button>

        {!collapsed ? (
          <div className={styles.upgradeCard}>
            <div className={styles.upgradeHead}>
              <span className={styles.upgradeIcon}>
                <SparkleIcon />
              </span>
              <p className={styles.upgradeTitle}>
                {isPro ? "You're on Pro" : "Upgrade to Pro"}
              </p>
            </div>
            <p className={styles.upgradeDesc}>
              {isPro
                ? "Manage your plan, limits, and billing in one place."
                : "Unlock higher review-request limits and premium widgets."}
            </p>
            <Link
              to="/app/billing"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.upgradeBtn}`}
            >
              {isPro ? "Manage plan" : "View plans"}
            </Link>
          </div>
        ) : (
          <Link
            to="/app/billing"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.upgradeBtn}`}
            title={isPro ? "Manage plan" : "Upgrade to Pro"}
            aria-label={isPro ? "Manage plan" : "Upgrade to Pro"}
          >
            Pro
          </Link>
        )}
      </div>
    </aside>
  );
}
