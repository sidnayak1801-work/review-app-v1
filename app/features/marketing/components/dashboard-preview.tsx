import { MotionSection } from "./ui/motion-section";

export function DashboardPreview() {
  return (
    <MotionSection id="demo" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Interactive preview
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          A moderation workspace merchants actually enjoy
        </h2>
        <p className="mt-3 text-muted-foreground">
          Hover the tiles — ReviewX keeps KPIs, queues, and product health in one
          calm surface.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-border bg-surface p-4 shadow-2xl shadow-black/5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Reviews overview</p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <div className="flex gap-2 text-xs">
            {["Overview", "Pending", "Published", "Requests"].map((tab, i) => (
              <span
                key={tab}
                className={`rounded-full px-3 py-1.5 font-medium ${
                  i === 0
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Avg rating", value: "4.9", delta: "+0.2" },
            { label: "Pending", value: "12", delta: "−4" },
            { label: "Published", value: "1,284", delta: "+18%" },
            { label: "Requests sent", value: "326", delta: "+9%" },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-border bg-background p-4 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-brand">{item.delta}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="mb-4 text-sm font-medium">Volume trend</p>
            <div className="flex h-40 items-end gap-2">
              {[32, 48, 40, 66, 58, 78, 70, 88, 74, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-lg bg-gradient-to-t from-emerald-600/80 to-teal-400/70 transition hover:opacity-100 opacity-85"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm font-medium">Queue snapshot</p>
            <ul className="mt-4 space-y-3">
              {[
                { name: "Maya R.", status: "Pending", stars: 5 },
                { name: "Alex Kim", status: "Live", stars: 4 },
                { name: "Sofia N.", status: "Live", stars: 5 },
              ].map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-amber-500" aria-hidden>
                      {"★".repeat(row.stars)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      row.status === "Pending"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
