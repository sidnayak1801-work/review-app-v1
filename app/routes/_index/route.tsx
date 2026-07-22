import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect, Form, useLoaderData, Link } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const meta: MetaFunction = () => [
  { title: "Vouch — Product reviews that sell" },
  {
    name: "description",
    content:
      "Collect, display, and syndicate product reviews for Shopify. Build trust, lift conversions, and turn happy customers into your best sales channel.",
  },
];

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,700&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function LandingPage() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true" />

      <header className={styles.nav}>
        <a className={styles.logo} href="#top">
          <span className={styles.logoMark} aria-hidden="true" />
          Vouch
        </a>
        <nav className={styles.navLinks} aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <a className={styles.navCta} href="#install">
          Install free
        </a>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.brand}>Vouch</p>
            <h1 className={styles.headline}>
              Reviews that turn browsers into buyers
            </h1>
            <p className={styles.lede}>
              Collect unlimited product reviews, show them where shoppers decide,
              and syndicate ratings across Google and social — designed for Shopify
              merchants.
            </p>
            <div className={styles.ctaGroup}>
              <a className={styles.primaryCta} href="#install">
                Start collecting reviews
              </a>
              <a className={styles.secondaryCta} href="#features">
                See how it works
              </a>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroGlow} />
            <div className={styles.reviewStage}>
              <article className={`${styles.reviewCard} ${styles.cardOne}`}>
                <div className={styles.stars}>★★★★★</div>
                <p>
                  Softest linen sheets I&apos;ve owned. Arrived fast and look
                  exactly like the photos.
                </p>
                <footer>
                  <span className={styles.avatar}>M</span>
                  Maya · Verified buyer
                </footer>
              </article>
              <article className={`${styles.reviewCard} ${styles.cardTwo}`}>
                <div className={styles.stars}>★★★★★</div>
                <p>
                  Packaging was beautiful. Already recommended it to three
                  friends.
                </p>
                <footer>
                  <span className={styles.avatar}>J</span>
                  Jordan · Photo review
                </footer>
              </article>
              <article className={`${styles.ratingBadge} ${styles.badgeFloat}`}>
                <strong>4.9</strong>
                <span>2,418 reviews</span>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.section} id="features">
          <div className={styles.sectionIntro}>
            <h2>Everything you need to grow with trust</h2>
            <p>
              One platform to collect, display, and share authentic customer
              feedback — without enterprise pricing.
            </p>
          </div>

          <div className={styles.featureGrid}>
            <article className={styles.feature}>
              <h3>Collect without limits</h3>
              <p>
                Automated email requests after fulfillment, photo and video
                reviews, and imports from other platforms so you never start
                from zero.
              </p>
            </article>
            <article className={styles.feature}>
              <h3>Display that converts</h3>
              <p>
                Star badges, carousels, UGC grids, and Q&amp;A widgets that match
                your theme and sit where purchase decisions happen.
              </p>
            </article>
            <article className={styles.feature}>
              <h3>Syndicate everywhere</h3>
              <p>
                Push ratings to Google rich snippets, Shopping, Meta, and TikTok
                Shop so social proof follows shoppers across channels.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section} id="how">
          <div className={styles.sectionIntro}>
            <h2>Live in minutes, not months</h2>
            <p>Three steps from install to reviews on your product pages.</p>
          </div>

          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNum}>01</span>
              <div>
                <h3>Install on Shopify</h3>
                <p>Connect your store and embed review widgets with Theme Editor.</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNum}>02</span>
              <div>
                <h3>Automate requests</h3>
                <p>
                  Schedule post-purchase emails and reminders that ask for
                  ratings, photos, and videos.
                </p>
              </div>
            </li>
            <li>
              <span className={styles.stepNum}>03</span>
              <div>
                <h3>Publish &amp; grow</h3>
                <p>
                  Moderate, reply, and syndicate reviews so trust compounds with
                  every order.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.section} id="pricing">
          <div className={styles.pricing}>
            <div>
              <h2>Simple pricing for serious stores</h2>
              <p>
                Start free with unlimited reviews. Upgrade when you want AI
                summaries, coupons, and deeper syndication.
              </p>
            </div>
            <div className={styles.priceCard}>
              <p className={styles.priceLabel}>Unlimited</p>
              <p className={styles.price}>
                <span>$0</span>
                <small>/ to start</small>
              </p>
              <ul>
                <li>Unlimited product &amp; store reviews</li>
                <li>Core widgets &amp; star ratings</li>
                <li>Google rich snippets</li>
                <li>Review request emails</li>
              </ul>
              <a className={styles.primaryCta} href="#install">
                Get started free
              </a>
            </div>
          </div>
        </section>

        <section className={styles.install} id="install">
          <div className={styles.installInner}>
            <h2>Install Vouch on your store</h2>
            <p>
              Enter your Shopify domain to connect. No credit card required.
            </p>

            {showForm ? (
              <Form className={styles.form} method="post" action="/auth/login">
                <label className={styles.label} htmlFor="shop">
                  Shop domain
                </label>
                <div className={styles.formRow}>
                  <input
                    className={styles.input}
                    id="shop"
                    type="text"
                    name="shop"
                    placeholder="my-shop.myshopify.com"
                    autoComplete="off"
                    required
                  />
                  <button className={styles.submit} type="submit">
                    Log in
                  </button>
                </div>
              </Form>
            ) : (
              <p className={styles.installFallback}>
                Run <code>npm run dev</code> with Shopify CLI to enable install.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.logo}>
          <span className={styles.logoMark} aria-hidden="true" />
          Vouch
        </span>
        <p>Product reviews for Shopify merchants who care about trust.</p>
        <Link to="/auth/login">Merchant login</Link>
      </footer>
    </div>
  );
}
