import { Link } from "react-router";

import styles from "./dashboard.module.css";

/** Spec § Section 7 — Quick actions (SPA Links — never full document loads). */
const ACTIONS = [
  {
    to: "/app/imports",
    title: "Import Reviews",
    description: "Bring existing reviews in with a CSV upload.",
    icon: "⇪",
  },
  {
    to: "/app#widget-settings",
    title: "Customize Widget",
    description: "Colors, layout, and storefront display options.",
    icon: "✎",
  },
  {
    to: "/app/review-requests",
    title: "Send Review Requests",
    description: "Post-fulfillment emails and monthly usage.",
    icon: "✉",
  },
  {
    to: "/app/settings",
    title: "Manage Widgets",
    description: "Enable, place, and tune your review widgets.",
    icon: "▣",
  },
  {
    to: "/app#analytics",
    title: "Analytics",
    description: "Rating, volume, and campaign performance.",
    icon: "▦",
  },
  {
    to: "/app/settings",
    title: "Settings",
    description: "Storefront controls and defaults.",
    icon: "⚙",
  },
] as const;

export function QuickActions() {
  return (
    <section aria-labelledby="rx-quick-title">
      <h2
        id="rx-quick-title"
        className={styles.sectionTitle}
        style={{ marginBottom: 16 }}
      >
        Quick actions
      </h2>
      <div className={styles.quickGrid}>
        {ACTIONS.map((action) => (
          <Link
            key={action.title}
            to={action.to}
            prefetch="intent"
            className={styles.quickCard}
          >
            <div className={styles.quickIcon} aria-hidden>
              {action.icon}
            </div>
            <h3 className={styles.quickTitle}>{action.title}</h3>
            <p className={styles.quickDesc}>{action.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
