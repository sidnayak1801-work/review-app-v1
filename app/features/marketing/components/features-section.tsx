import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  Camera,
  Inbox,
  Mail,
  Search,
  Sparkles,
  Star,
  Upload,
  Video,
  LayoutTemplate,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { staggerContainer, fadeUp } from "../lib/motion";
import { MotionSection } from "./ui/motion-section";

type Feature = {
  title: string;
  body: string;
  icon: LucideIcon;
  soon?: boolean;
};

const FEATURES: Feature[] = [
  {
    title: "Collect Reviews",
    body: "Storefront submission with validation and spam protection.",
    icon: Star,
  },
  {
    title: "Review Requests",
    body: "Post-fulfillment emails that ask while the experience is fresh.",
    icon: Mail,
  },
  {
    title: "Photo Reviews",
    body: "Let buyers attach photos so product pages feel real.",
    icon: Camera,
  },
  {
    title: "Video Reviews",
    body: "Richer UGC for PDPs that convert with motion.",
    icon: Video,
    soon: true,
  },
  {
    title: "AI Moderation",
    body: "Smarter queue assistance for faster publish decisions.",
    icon: Sparkles,
    soon: true,
  },
  {
    title: "Verified Buyer",
    body: "Signal purchase confidence with verified-purchase reviews.",
    icon: BadgeCheck,
  },
  {
    title: "Import Reviews",
    body: "CSV import so you never start social proof from zero.",
    icon: Upload,
  },
  {
    title: "Review Widget",
    body: "Theme App Extension widgets that match your brand.",
    icon: LayoutTemplate,
  },
  {
    title: "Analytics",
    body: "Rating mix, volume trends, and product health at a glance.",
    icon: BarChart3,
  },
  {
    title: "SEO Rich Snippets",
    body: "Aggregate-rating markup to help trust travel further.",
    icon: Search,
    soon: true,
  },
  {
    title: "Moderation Queue",
    body: "Approve, reject, feature, and reply from one clean queue.",
    icon: Inbox,
  },
];

export function FeaturesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <MotionSection id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Features
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to grow with trust
        </h2>
        <p className="mt-3 text-muted-foreground">
          A focused toolkit for collection, moderation, and display — without
          enterprise clutter.
        </p>
      </div>

      <motion.div
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial={reduceMotion ? undefined : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.15 }}
        variants={reduceMotion ? undefined : staggerContainer}
      >
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.article
              key={feature.title}
              variants={reduceMotion ? undefined : fadeUp}
              className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-accent text-brand">
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight">
                  {feature.title}
                </h3>
                {feature.soon ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Coming soon
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </motion.article>
          );
        })}
      </motion.div>
    </MotionSection>
  );
}
