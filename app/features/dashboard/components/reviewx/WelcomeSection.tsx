import styles from "./dashboard.module.css";

/** Spec § Section 1 — Welcome */
export function WelcomeSection() {
  return (
    <section aria-labelledby="rx-welcome">
      <h1 id="rx-welcome" className={styles.hero}>
        Welcome back 👋
      </h1>
      <p className={styles.body}>
        Here’s what’s happening with your reviews today.
      </p>
    </section>
  );
}
