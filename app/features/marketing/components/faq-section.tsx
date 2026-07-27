import { MotionSection } from "./ui/motion-section";

const FAQS = [
  {
    q: "How do I install ReviewX?",
    a: "Enter your myshopify.com domain below, authorize the app, then add widgets in the Theme Editor.",
  },
  {
    q: "What’s the difference between Free and Pro?",
    a: "Both include core collection, moderation, and widgets. Free has limited published reviews and monthly requests. Pro raises those allowances via Shopify App Pricing.",
  },
  {
    q: "Can I customize how reviews look?",
    a: "Yes. Theme App Extension blocks and widget settings let you match accent colors and layout to your theme.",
  },
  {
    q: "Can I import reviews from another platform?",
    a: "Yes. Use CSV import to bring existing reviews, preview the mapping, then publish after moderation.",
  },
  {
    q: "Who owns my review data?",
    a: "Your shop owns its reviews in ReviewX. Shopify remains the source of truth for products, customers, and orders.",
  },
] as const;

export function FaqSection() {
  return (
    <MotionSection id="faqs" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          FAQ
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Answers before you install
        </h2>
      </div>
      <div className="mx-auto mt-10 max-w-2xl space-y-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-border bg-surface px-5 py-1 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none py-4 text-sm font-semibold tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.q}
                <span className="text-lg font-normal text-muted-foreground transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </MotionSection>
  );
}
