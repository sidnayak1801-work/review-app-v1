import { Menu, Star, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { ThemeToggle } from "./ui/theme-toggle";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faqs", label: "FAQ" },
] as const;

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex flex-col items-center px-3 pt-4 sm:px-4">
      <nav
        className={cn(
          "relative flex w-full max-w-[920px] items-center justify-between gap-3 rounded-full border border-brand/20 bg-nav px-3 py-2 pl-4 text-nav-foreground shadow-[0_8px_30px_rgba(16,85,60,0.1)] backdrop-blur-xl transition-all duration-300",
          scrolled && "shadow-[0_10px_36px_rgba(16,85,60,0.16)]",
        )}
        aria-label="Primary"
      >
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight text-nav-foreground"
        >
          <span
            aria-hidden
            className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-600/30"
          >
            <Star className="size-3.5 fill-white" />
          </span>
          ReviewX
        </a>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-[13px] font-medium text-nav-muted lg:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="transition hover:text-nav-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <a
            href="/auth/login"
            className="px-2 text-[13px] font-medium text-nav-muted transition hover:text-nav-foreground"
          >
            Sign in
          </a>
          <a
            href="#install"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-4 text-[13px] font-semibold text-white shadow-md shadow-emerald-600/25 transition hover:brightness-105"
          >
            Install on Shopify
            <span aria-hidden>→</span>
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-brand/25 bg-brand/10 text-nav-foreground"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div
          id="mobile-nav"
          className="mt-2 w-full max-w-[920px] rounded-3xl border border-brand/20 bg-nav p-4 text-nav-foreground shadow-xl backdrop-blur-xl lg:hidden"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-xl px-3 py-2.5 text-nav-muted hover:bg-brand/10 hover:text-nav-foreground"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/auth/login"
                className="block rounded-xl px-3 py-2.5 text-nav-muted hover:bg-brand/10 hover:text-nav-foreground"
                onClick={() => setOpen(false)}
              >
                Sign in
              </a>
            </li>
          </ul>
          <a
            href="#install"
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-sm font-semibold text-white"
            onClick={() => setOpen(false)}
          >
            Install on Shopify →
          </a>
        </div>
      ) : null}
    </header>
  );
}
