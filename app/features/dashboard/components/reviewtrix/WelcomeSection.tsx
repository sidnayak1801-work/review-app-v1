import styles from "./dashboard.module.css";

const FRESH_ONBOARDING_MS = 7 * 24 * 60 * 60 * 1000;

/** True when onboarding was completed (not skipped) within the last 7 days. */
export function isFreshAfterOnboarding(
  reminder:
    | {
        completed: boolean;
        completedAt: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!reminder?.completed || !reminder.completedAt) {
    return false;
  }
  const completedAtMs = new Date(reminder.completedAt).getTime();
  if (Number.isNaN(completedAtMs)) {
    return false;
  }
  return Date.now() - completedAtMs < FRESH_ONBOARDING_MS;
}

interface WelcomeSectionProps {
  isFreshAfterOnboarding?: boolean;
}

/** Spec § Section 1 — Welcome */
export function WelcomeSection({
  isFreshAfterOnboarding: fresh = false,
}: WelcomeSectionProps) {
  return (
    <section aria-labelledby="rx-welcome">
      <h1 id="rx-welcome" className={styles.hero}>
        {fresh ? "Welcome to ReviewTrix" : "Welcome back 👋"}
      </h1>
      <p className={styles.body}>
        {fresh
          ? "You're all set — here's what's happening with your reviews."
          : "Here's what's happening with your reviews today."}
      </p>
    </section>
  );
}
