import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";

import type { ShopPlan } from "../../../../repositories/shop.repository.server";
import type { ActivityFeedItem } from "../../dashboard.activity";
import styles from "./dashboard.module.css";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

const COLLAPSE_KEY = "reviewx.sidebar.collapsed";

interface MerchantAppShellProps {
  shopDomain: string;
  plan: ShopPlan;
  activity?: ActivityFeedItem[];
  children: ReactNode;
}

/**
 * Shared merchant shell: fixed nav card + adjacent page content.
 * Used by all `/app/*` routes so navigation stays available.
 */
export function MerchantAppShell({
  shopDomain,
  plan,
  activity = [],
  children,
}: MerchantAppShellProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const shopName =
    shopDomain.replace(/\.myshopify\.com$/i, "") || shopDomain;

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/app/reviews")) {
      setSearchValue(searchParams.get("q") ?? "");
    }
  }, [location.pathname, searchParams]);

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className={styles.appRoot}>
      <div
        className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}
      >
        <Sidebar collapsed={collapsed} onToggle={toggle} plan={plan} />
        <div className={styles.main}>
          <TopNavbar
            shopName={shopName}
            shopDomain={shopDomain}
            activity={activity}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
          <div className={styles.pageSlot}>{children}</div>
        </div>
      </div>
    </div>
  );
}
