import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useLocation, useNavigation, useSearchParams } from "react-router";

import type { ShopPlan } from "../../../../repositories/shop.repository.server";
import type { ActivityFeedItem } from "../../dashboard.activity";
import styles from "./dashboard.module.css";
import { AdminPageSkeleton } from "./EmptyState";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

const COLLAPSE_KEY = "reviewtrix.sidebar.collapsed";

interface MerchantAppShellProps {
  shopDomain: string;
  plan: ShopPlan;
  activity?: ActivityFeedItem[];
  children: ReactNode;
}

function locationsDiffer(
  current: { pathname: string; search: string; hash: string },
  next: { pathname: string; search: string; hash: string },
): boolean {
  return (
    current.pathname !== next.pathname ||
    current.search !== next.search ||
    current.hash !== next.hash
  );
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
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const mobileNavId = useId();
  const shopName =
    shopDomain.replace(/\.myshopify\.com$/i, "") || shopDomain;

  const pendingLocation =
    navigation.state === "loading" && navigation.location
      ? navigation.location
      : null;
  const isDocumentNavigating =
    pendingLocation != null &&
    locationsDiffer(location, pendingLocation);

  const navPathname = pendingLocation?.pathname ?? location.pathname;
  const navHash = pendingLocation?.hash ?? location.hash;

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/app/reviews")) {
      setSearchValue(searchParams.get("q") ?? "");
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileNavOpen]);

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div
      className={`${styles.appRoot} ${mobileNavOpen ? styles.mobileNavOpen : ""}`}
    >
      <div
        className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}
      >
        {mobileNavOpen ? (
          <button
            type="button"
            className={styles.mobileNavBackdrop}
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}
        <Sidebar
          id={mobileNavId}
          collapsed={collapsed}
          onToggle={toggle}
          plan={plan}
          onNavigate={() => setMobileNavOpen(false)}
          activePathname={navPathname}
          activeHash={navHash}
        />
        <div className={styles.main}>
          <TopNavbar
            shopName={shopName}
            shopDomain={shopDomain}
            plan={plan}
            activity={activity}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            mobileNavOpen={mobileNavOpen}
            mobileNavId={mobileNavId}
            onMobileNavToggle={() => setMobileNavOpen((open) => !open)}
          />
          <div
            className={`${styles.pageSlot} ${isDocumentNavigating ? styles.pageSlotPending : ""}`}
          >
            {isDocumentNavigating ? <AdminPageSkeleton /> : children}
          </div>
        </div>
      </div>
    </div>
  );
}
