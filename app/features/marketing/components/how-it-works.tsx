import { motion, useReducedMotion } from "framer-motion";

import { fadeUp, staggerContainer } from "../lib/motion";
import { MotionSection } from "./ui/motion-section";

const STEPS = [
  {
    num: "01",
    title: "Install on Shopify",
    body: "Connect your store and embed review widgets from the Theme Editor.",
  },
  {
    num: "02",
    title: "Automate requests",
    body: "Send post-purchase emails after fulfillment so feedback arrives while it’s fresh.",
  },
  {
    num: "03",
    title: "Publish & display",
    body: "Moderate, reply, and show approved reviews where shoppers decide.",
  },
] as const;

export function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <MotionSection id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          How it works
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Live in minutes, not months
        </h2>
      </div>

      <div className="relative mt-12">
        <div
          aria-hidden
          className="absolute left-[8%] right-[8%] top-10 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
        />
        <motion.ol
          className="grid gap-4 md:grid-cols-3"
          initial={reduceMotion ? undefined : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
          variants={reduceMotion ? undefined : staggerContainer}
        >
          {STEPS.map((step) => (
            <motion.li
              key={step.num}
              variants={reduceMotion ? undefined : fadeUp}
              className="relative rounded-2xl border border-border bg-surface p-6 shadow-sm"
            >
              <span className="text-sm font-bold text-brand">{step.num}</span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </MotionSection>
  );
}
