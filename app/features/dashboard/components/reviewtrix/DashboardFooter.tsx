import { Link } from "react-router";

import styles from "./dashboard.module.css";

/** Concise merchant footer — support, legal, plans, settings */
export function DashboardFooter() {
  return (
    <footer className={styles.dashFooter}>
      <p className={styles.dashFooterCopy}>
        Need help? Support, legal pages, plans, and settings are one click away.
      </p>
      <nav className={styles.footerLinks} aria-label="Dashboard help">
        <Link to="/app/support">Support</Link>
        <span aria-hidden>·</span>
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy
        </a>
        <span aria-hidden>·</span>
        <a href="/terms" target="_blank" rel="noopener noreferrer">
          Terms
        </a>
        <span aria-hidden>·</span>
        <Link to="/app/billing">Plans</Link>
        <span aria-hidden>·</span>
        <Link to="/app/api">API docs</Link>
        <span aria-hidden>·</span>
        <Link to="/app/settings">Settings</Link>
      </nav>
    </footer>
  );
}
