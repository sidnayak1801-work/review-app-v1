import { motion, useReducedMotion } from "framer-motion";
import { PackageCheck, Play, Star } from "lucide-react";

import { floatY } from "../lib/motion";

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="top"
      className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 sm:pt-16"
      aria-labelledby="hero-heading"
    >
      <div className="mkt-page-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="mkt-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-4xl text-center">
        <a
          href="#features"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-muted"
        >
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          New — moderation queue &amp; widgets that convert
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
        </a>

        <h1
          id="hero-heading"
          className="text-balance text-[2.35rem] font-semibold tracking-[-0.04em] text-foreground sm:text-5xl md:text-6xl lg:text-[4.1rem] lg:leading-[1.08]"
        >
          Ship product {" "}
          <span className="text-brand">reviews</span> at lightning{" "}
          <span className="text-brand">speed </span>
          
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          ReviewX is the modern review platform built for Shopify. Collect
          stunning photo &amp; video reviews, automate requests, and showcase
          social proof that actually converts.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <motion.a
            href="#install"
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className="inline-flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25"
          >
            <PackageCheck className="size-4" aria-hidden />
            Install free on Shopify
            <span aria-hidden>→</span>
          </motion.a>
          <a
            href="#demo"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-brand/30 bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-brand/15"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand/15 text-brand">
              <Play className="size-3 fill-current" aria-hidden />
            </span>
            Watch 90-sec demo
          </a>
        </div>

        <div className="mt-7 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="flex text-amber-400" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-amber-400" aria-hidden />
              ))}
            </span>
            <span className="text-sm font-semibold text-foreground">4.9</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Rated 4.9 by{" "}
            <span className="font-semibold text-foreground">2,847</span>{" "}
            merchants on the Shopify App Store.
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-16 max-w-5xl">
        <HeroDashboardMock />
        <FloatingCards reduceMotion={!!reduceMotion} />
      </div>
    </section>
  );
}

function HeroDashboardMock() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-3 shadow-2xl shadow-emerald-900/10 sm:p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          ReviewX · Dashboard
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Avg rating", value: "4.9" },
          { label: "Published", value: "1,284" },
          { label: "Pending", value: "12" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-border bg-background/70 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="mb-4 text-sm font-medium">Reviews vs requests</p>
          <div className="flex h-36 items-end gap-2">
            {[40, 55, 35, 70, 62, 85, 58].map((h, i) => (
              <div key={i} className="flex flex-1 items-end gap-1">
                <div
                  className="w-full rounded-t-md bg-emerald-500/80"
                  style={{ height: `${h}%` }}
                />
                <div
                  className="w-full rounded-t-md bg-sky-400/70"
                  style={{ height: `${Math.max(20, h - 18)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="text-sm font-medium">Latest review</p>
          <p className="mt-2 text-amber-400" aria-hidden>
            ★★★★★
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Softest hoodie I own — sizing perfect. Already ordered again.
          </p>
          <p className="mt-3 text-xs font-medium">Ava Chen · Verified buyer</p>
        </div>
      </div>
    </div>
  );
}

function FloatingCards({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      <motion.aside
        className="absolute -left-2 top-10 hidden w-52 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur md:block lg:-left-6"
        {...(reduceMotion ? {} : { animate: floatY.animate })}
        aria-hidden
      >
        <p className="text-xs text-amber-400">★★★★★</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Packaging was beautiful. Photo attached.
        </p>
        <p className="mt-2 text-[11px] font-semibold">Jordan · Pending</p>
      </motion.aside>
      <motion.aside
        className="absolute -right-2 bottom-16 hidden w-44 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur md:block lg:-right-4"
        {...(reduceMotion
          ? {}
          : {
              animate: {
                y: [0, 8, 0],
                transition: {
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              },
            })}
        aria-hidden
      >
        <p className="text-2xl font-semibold tracking-tight">4.9</p>
        <p className="text-xs text-muted-foreground">Store rating</p>
      </motion.aside>
    </>
  );
}
