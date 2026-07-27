export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <a href="#top" className="inline-flex items-center gap-2 font-semibold">
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-brand-foreground"
            >
              RX
            </span>
            ReviewX
          </a>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Product reviews for Shopify merchants who care about trust and
            conversion.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Pricing" },
            { href: "#how", label: "How it works" },
            { href: "#demo", label: "Demo" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { href: "#faqs", label: "FAQ" },
            { href: "#contact", label: "Contact" },
            { href: "mailto:support@reviewx.app", label: "Support" },
            { href: "/auth/login", label: "Merchant login" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
          ]}
        />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} ReviewX. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-foreground">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h4>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
