import { Link } from "react-router";

import styles from "./dashboard.module.css";

/** Concise merchant footer — plans, API, settings */
export function DashboardFooter() {
  return (
    <footer className={styles.dashFooter}>
      <p className={styles.dashFooterCopy}>
        Need help? Plans, API, and widget settings are one click away.
      </p>
      <nav className={styles.footerLinks} aria-label="Dashboard help">
        <Link to="/app/billing">Plans</Link>
        <span aria-hidden>·</span>
        <Link to="/app/api">API docs</Link>
        <span aria-hidden>·</span>
        <Link to="/app/settings">Settings</Link>
      </nav>
    </footer>
  );
}
