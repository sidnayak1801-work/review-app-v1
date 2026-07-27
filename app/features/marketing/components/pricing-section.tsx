import {
  FREE_MAX_PUBLISHED_REVIEWS,
  FREE_MAX_REVIEW_REQUESTS_PER_MONTH,
  PRO_MAX_PUBLISHED_REVIEWS,
  PRO_MAX_REVIEW_REQUESTS_PER_MONTH,
  PRO_MONTHLY_PRICE_USD,
  PRO_TRIAL_DAYS,
} from "../../billing/billing.constants";
import { MotionSection } from "./ui/motion-section";

export function PricingSection() {
  return (
    <MotionSection id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Pricing
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple plans for serious stores
        </h2>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade through Shopify when you need higher allowances.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          blurb="Core reviews and widgets for stores getting started."
          features={[
            `Up to ${FREE_MAX_PUBLISHED_REVIEWS} published reviews`,
            `${FREE_MAX_REVIEW_REQUESTS_PER_MONTH} review requests / month`,
            "Storefront widgets & star ratings",
            "Moderation queue & CSV import",
          ]}
        />
        <PlanCard
          name="Pro"
          price={`$${PRO_MONTHLY_PRICE_USD}`}
          blurb={`${PRO_TRIAL_DAYS}-day trial. Scale published reviews and requests.`}
          featured
          features={[
            `Up to ${PRO_MAX_PUBLISHED_REVIEWS.toLocaleString()} published reviews`,
            `${PRO_MAX_REVIEW_REQUESTS_PER_MONTH.toLocaleString()} review requests / month`,
            "Everything in Free",
            "Integrations & higher limits",
          ]}
        />
      </div>
    </MotionSection>
  );
}

function PlanCard({
  name,
  price,
  blurb,
  features,
  featured,
}: {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-3xl border p-6 shadow-sm ${
        featured
          ? "border-brand/40 bg-gradient-to-b from-accent to-surface shadow-lg"
          : "border-border bg-surface"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
        {name}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight">{price}</span>
        <span className="text-sm text-muted-foreground">/ month</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm text-muted-foreground">
        {features.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
            {item}
          </li>
        ))}
      </ul>
      <a
        href="#install"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {featured ? "Start Pro trial" : "Install on Shopify"}
      </a>
    </article>
  );
}
