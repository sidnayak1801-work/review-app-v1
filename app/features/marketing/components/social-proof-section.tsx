import { Counter } from "./ui/counter";
import { MotionSection } from "./ui/motion-section";

const TESTIMONIALS = [
  {
    quote:
      "We went from scattered screenshots to a real review system in an afternoon. PDP trust jumped immediately.",
    name: "Elena Park",
    role: "Founder, Harbor & Co",
    initial: "E",
  },
  {
    quote:
      "The moderation queue is fast. Bulk publish + reply means we keep up without hiring someone just for reviews.",
    name: "Marcus Webb",
    role: "Ops lead, Peak Form",
    initial: "M",
  },
  {
    quote:
      "Photo reviews made our product pages feel alive. Imports from our old tool meant we never lost social proof.",
    name: "Sofia Nguyen",
    role: "Growth, Lumen Goods",
    initial: "S",
  },
] as const;

export function SocialProofSection() {
  return (
    <MotionSection
      id="social"
      className="border-y border-border bg-muted/30 px-4 py-20 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Social proof
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Merchants who lead with trust
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Stat label="Avg merchant rating" value={4.9} decimals={1} />
          <Stat label="Reviews moderated" value={1284} suffix="+" />
          <Stat label="Requests / month" value={326} suffix="+" />
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article
              key={item.name}
              className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm"
            >
              <p className="text-amber-400" aria-label="5 out of 5 stars">
                ★★★★★
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                “{item.quote}”
              </p>
              <footer className="mt-5 flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {item.initial}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function Stat({
  label,
  value,
  suffix,
  decimals = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-5 text-center shadow-sm">
      <p className="text-3xl font-semibold tracking-tight">
        <Counter value={value} suffix={suffix} decimals={decimals} />
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
