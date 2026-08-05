import type { ReactNode } from "react";

import styles from "./dashboard.module.css";

interface DashboardLayoutProps {
  children: ReactNode;
}

/** Dashboard home content stack (shell/sidebar live in MerchantAppShell). */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className={styles.content}>
      <div className={styles.stack}>{children}</div>
    </div>
  );
}
