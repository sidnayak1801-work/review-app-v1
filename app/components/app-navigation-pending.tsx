import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useNavigation } from "react-router";

const MAX_VISIBLE_MS = 10000;

const overlayStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 2147483000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(246, 246, 247, 0.96)",
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.85rem",
  minWidth: "15rem",
  padding: "1.6rem 1.85rem",
  borderRadius: "0.75rem",
  background: "#fff",
  border: "1px solid rgba(0, 0, 0, 0.1)",
  boxShadow: "0 10px 32px rgba(0, 0, 0, 0.14)",
};

const spinnerStyle: CSSProperties = {
  width: "2.25rem",
  height: "2.25rem",
  borderRadius: "999px",
  border: "3px solid rgba(0, 0, 0, 0.12)",
  borderTopColor: "#111",
  animation: "reviewx-nav-spin 0.65s linear infinite",
};

function clearTimer(
  ref: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

/**
 * Full-screen transition loader while React Router loads the next admin page.
 * Clears as soon as navigation is idle — no artificial minimum hold.
 */
export function AppNavigationPending({ children }: { children: ReactNode }) {
  const navigation = useNavigation();
  const routerBusy =
    navigation.state === "loading" || navigation.state === "submitting";

  const [holdVisible, setHoldVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPending = routerBusy || holdVisible;

  useEffect(() => {
    if (routerBusy) {
      if (!shownAtRef.current) {
        shownAtRef.current = Date.now();
      }
      setHoldVisible(true);

      clearTimer(maxTimerRef);
      maxTimerRef.current = setTimeout(() => {
        shownAtRef.current = null;
        setHoldVisible(false);
        maxTimerRef.current = null;
      }, MAX_VISIBLE_MS);

      return () => {
        clearTimer(maxTimerRef);
      };
    }

    // Idle: clear overlay immediately so aborted/fast navigations cannot stick.
    clearTimer(maxTimerRef);
    shownAtRef.current = null;
    setHoldVisible(false);
  }, [routerBusy]);

  useEffect(() => {
    return () => {
      clearTimer(maxTimerRef);
    };
  }, []);

  return (
    <>
      <style>{`@keyframes reviewx-nav-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        aria-hidden={showPending}
        style={{
          opacity: showPending ? 0.15 : 1,
          transition: "opacity 0.1s ease",
          pointerEvents: showPending ? "none" : "auto",
        }}
      >
        {children}
      </div>

      {showPending ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={overlayStyle}
        >
          <div style={cardStyle}>
            <div style={spinnerStyle} aria-hidden="true" />
            <div
              style={{
                fontWeight: 700,
                fontSize: "1.1rem",
                color: "#111",
                fontFamily:
                  "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
              }}
            >
              Loading…
            </div>
            <div
              style={{
                color: "rgba(0,0,0,0.55)",
                fontSize: "0.92rem",
                fontFamily:
                  "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
              }}
            >
              Please wait…
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
