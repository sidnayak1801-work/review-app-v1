import { motion, useReducedMotion } from "framer-motion";

import { InstallForm } from "./install-form";
import { MotionSection } from "./ui/motion-section";

type CtaSectionProps = {
  showForm: boolean;
};

export function CtaSection({ showForm }: CtaSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <MotionSection
        id="contact"
        className="mx-auto max-w-6xl px-4 pb-8 sm:px-6"
      >
        <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-700 via-green-700 to-teal-800 px-6 py-14 text-center text-white sm:px-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to turn reviews into revenue?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/75 sm:text-base">
            Install ReviewX on your Shopify store, embed widgets, and start
            collecting social proof today.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <motion.a
              href="#install"
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-emerald-900"
            >
              Install on Shopify
            </motion.a>
            <a
              href="mailto:support@reviewx.app"
              className="inline-flex h-11 items-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white/95 transition hover:bg-white/10"
            >
              Contact support
            </a>
          </div>
        </div>
      </MotionSection>

      <section id="install" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-[1.75rem] border border-brand/25 bg-gradient-to-br from-emerald-800 to-green-900 px-6 py-12 text-center text-white sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Install ReviewX on your store
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/70">
            Enter your Shopify domain to connect. No credit card required to
            start on Free.
          </p>
          <InstallForm showForm={showForm} inputId="install-shop" />
        </div>
      </section>
    </>
  );
}
