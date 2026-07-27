const BRANDS = [
  "Northline",
  "Harbor & Co",
  "Lumen Goods",
  "Cedar Atelier",
  "Peak Form",
  "Solace Home",
  "Kinetic Supply",
  "Aperture Lab",
] as const;

export function LogoMarquee() {
  const items = [...BRANDS, ...BRANDS];

  return (
    <section
      className="border-y border-border bg-muted/40 py-10"
      aria-label="Trusted by growing Shopify brands"
    >
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Trusted by growing Shopify brands
      </p>
      <div className="mkt-marquee relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-muted/40 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-muted/40 to-transparent" />
        <div className="mkt-marquee-track gap-10 px-4 sm:gap-16">
          {items.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="shrink-0 text-sm font-semibold tracking-tight text-muted-foreground/80 sm:text-base"
              aria-hidden={index >= BRANDS.length}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      {/* Static fallback list for screen readers */}
      <ul className="sr-only">
        {BRANDS.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </section>
  );
}
