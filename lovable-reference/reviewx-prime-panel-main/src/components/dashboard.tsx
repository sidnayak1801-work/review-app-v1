import { useState } from "react";
import {
  Star,
  MessageSquare,
  Clock,
  Send,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Eye,
  EyeOff,
  Trash2,
  MoreHorizontal,
  Plus,
  Palette,
  Settings,
  Download,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/* ---------- data ---------- */

const kpis = [
  { label: "Total Reviews", value: "2,847", delta: "+12.4%", up: true, icon: MessageSquare, sub: "vs last 30 days" },
  { label: "Average Rating", value: "4.82", delta: "+0.08", up: true, icon: Star, sub: "out of 5.0" },
  { label: "Pending Moderation", value: "18", delta: "-3", up: false, icon: Clock, sub: "awaiting review", muted: true },
  { label: "Requests Sent", value: "1,204", delta: "+8.1%", up: true, icon: Send, sub: "this month" },
];

const chartData: Record<string, { d: string; reviews: number }[]> = {
  "7d": [
    { d: "Mon", reviews: 34 }, { d: "Tue", reviews: 42 }, { d: "Wed", reviews: 38 },
    { d: "Thu", reviews: 51 }, { d: "Fri", reviews: 62 }, { d: "Sat", reviews: 48 }, { d: "Sun", reviews: 55 },
  ],
  "30d": Array.from({ length: 30 }, (_, i) => ({
    d: `${i + 1}`,
    reviews: Math.round(30 + Math.sin(i / 3) * 15 + Math.random() * 20 + i * 0.6),
  })),
  "90d": Array.from({ length: 12 }, (_, i) => ({
    d: `W${i + 1}`,
    reviews: Math.round(180 + Math.sin(i / 2) * 40 + Math.random() * 40),
  })),
};

const ratingDist = [
  { stars: 5, count: 2143, pct: 75 },
  { stars: 4, count: 502, pct: 18 },
  { stars: 3, count: 128, pct: 4 },
  { stars: 2, count: 48, pct: 2 },
  { stars: 1, count: 26, pct: 1 },
];

const latestReviews = [
  { name: "Sarah Chen", product: "Merino Wool Sweater", rating: 5, review: "Absolutely love the quality — perfect fit and cozy for winter.", date: "2h ago", status: "Published" },
  { name: "Marcus Reid", product: "Classic Denim Jacket", rating: 4, review: "Great jacket, sizing runs slightly small but material feels premium.", date: "5h ago", status: "Published" },
  { name: "Priya Patel", product: "Linen Summer Dress", rating: 5, review: "Beautiful piece, exceeded expectations. Fast shipping too.", date: "8h ago", status: "Pending" },
  { name: "James O'Neil", product: "Leather Weekender Bag", rating: 3, review: "Nice look but the strap stitching could be more durable.", date: "1d ago", status: "Pending" },
  { name: "Elena Rossi", product: "Cashmere Scarf", rating: 5, review: "Soft, warm, and elegant. Would buy again in every color.", date: "1d ago", status: "Published" },
  { name: "Devon Wells", product: "Canvas Sneakers", rating: 2, review: "Not what I expected based on the photos.", date: "2d ago", status: "Hidden" },
];

const pending = [
  { name: "Priya Patel", product: "Linen Summer Dress", rating: 5, snippet: "Beautiful piece, exceeded expectations…" },
  { name: "James O'Neil", product: "Leather Weekender", rating: 3, snippet: "Nice look but the strap stitching…" },
  { name: "Aya Tanaka", product: "Wool Beanie", rating: 4, snippet: "Warm and well made, arrived quickly." },
];

/* ---------- component ---------- */

export function Dashboard() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
            Welcome back, Shish <span className="inline-block">👋</span>
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Here's how your reviews are performing today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 h-9 text-[13px] font-medium shadow-soft transition hover:bg-accent">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 h-9 text-[13px] font-semibold text-primary-foreground shadow-soft transition hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New request
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="group rounded-2xl border bg-card p-5 shadow-soft transition hover:shadow-elevated">
            <div className="flex items-start justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                <k.icon className="h-4 w-4" />
              </div>
              <div
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  k.muted
                    ? "bg-muted text-muted-foreground"
                    : k.up
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {k.delta}
              </div>
            </div>
            <div className="mt-4 text-[28px] font-bold tracking-tight leading-none">{k.value}</div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground/80">{k.label}</span>
              <span className="text-[11.5px] text-muted-foreground">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Rating distribution */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold">Reviews collected</h3>
              <p className="text-[12.5px] text-muted-foreground">Trend over the selected period</p>
            </div>
            <div className="inline-flex rounded-lg border bg-surface p-0.5">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 h-7 rounded-md text-[12px] font-medium transition ${
                    range === r ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData[range]} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.2 }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "var(--shadow-elevated)",
                  }}
                />
                <Area type="monotone" dataKey="reviews" stroke="var(--color-primary)" strokeWidth={2.25} fill="url(#rx)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Rating distribution</h3>
              <p className="text-[12.5px] text-muted-foreground">All-time breakdown</p>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-bold leading-none">4.82</div>
              <div className="mt-1 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-star text-star" />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {ratingDist.map((r) => (
              <div key={r.stars} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <div className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground w-8">
                  {r.stars} <Star className="h-3 w-3 fill-star text-star" />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
                <div className="flex items-baseline gap-1.5 text-[12px] tabular-nums w-20 justify-end">
                  <span className="font-semibold">{r.count.toLocaleString()}</span>
                  <span className="text-muted-foreground">{r.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest reviews + Pending moderation */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="text-[15px] font-semibold">Latest reviews</h3>
              <p className="text-[12.5px] text-muted-foreground">Most recent submissions from your store</p>
            </div>
            <button className="text-[12.5px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-y bg-surface/60 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-semibold">Customer</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Rating</th>
                  <th className="px-3 py-2.5 text-left font-semibold hidden md:table-cell">Review</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {latestReviews.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 transition hover:bg-surface/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-accent text-accent-foreground text-[11px] font-semibold">
                            {r.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[13px]">{r.name}</div>
                          <div className="truncate text-[11.5px] text-muted-foreground">{r.product} · {r.date}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${s < r.rating ? "fill-star text-star" : "text-muted"}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 max-w-[320px] hidden md:table-cell">
                      <p className="truncate text-muted-foreground">{r.review}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={r.status as any} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconAction label="View"><Eye className="h-3.5 w-3.5" /></IconAction>
                        <IconAction label="Publish"><Check className="h-3.5 w-3.5" /></IconAction>
                        <IconAction label="Hide"><EyeOff className="h-3.5 w-3.5" /></IconAction>
                        <IconAction label="Delete" danger><Trash2 className="h-3.5 w-3.5" /></IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Pending moderation</h3>
              <p className="text-[12.5px] text-muted-foreground">{pending.length} awaiting approval</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-warning/15 text-[12px] font-bold text-warning-foreground">
              {pending.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {pending.map((p, i) => (
              <div key={i} className="rounded-xl border bg-surface/60 p-3.5 transition hover:bg-surface">
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-accent text-accent-foreground text-[11px] font-semibold">
                      {p.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">{p.name}</span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star key={s} className={`h-3 w-3 ${s < p.rating ? "fill-star text-star" : "text-muted"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="truncate text-[11.5px] text-muted-foreground">{p.product}</div>
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] text-foreground/80">{p.snippet}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-success py-1.5 text-[12px] font-semibold text-success-foreground transition hover:opacity-90">
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border bg-card py-1.5 text-[12px] font-semibold transition hover:bg-accent">
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Quick actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <QuickAction icon={Download} label="Import reviews" desc="From CSV or another app" />
          <QuickAction icon={Send} label="Send requests" desc="Email past customers" />
          <QuickAction icon={Palette} label="Customize widget" desc="Match your storefront" />
          <QuickAction icon={Star} label="View store reviews" desc="See public page" />
          <QuickAction icon={Settings} label="Settings" desc="App preferences" />
        </div>
      </div>

      {/* Widget preview + Analytics snapshot */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Widget preview</h3>
              <p className="text-[12.5px] text-muted-foreground">Live example on your storefront</p>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 h-8 text-[12px] font-semibold transition hover:bg-accent">
              <Palette className="h-3.5 w-3.5" /> Customize
            </button>
          </div>
          <div className="mt-4 rounded-xl border bg-surface p-4">
            <div className="flex gap-3">
              <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-accent to-muted grid place-items-center text-2xl">
                🧥
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold">Merino Wool Sweater</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-star text-star" />
                    ))}
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">5.0 · 214 reviews</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/85">
                  "Absolutely love the quality — perfect fit and cozy for winter. Runs true to size and washes beautifully."
                </p>
                <div className="mt-2 text-[11.5px] text-muted-foreground">— Sarah C., verified buyer</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Analytics snapshot</h3>
            <button className="text-[12.5px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
              Open analytics <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Avg. rating trend" value="4.82" delta="+0.08" up />
            <MiniStat label="Reviews this month" value="412" delta="+12%" up />
            <MiniStat label="Email open rate" value="48.6%" delta="+2.1%" up />
            <MiniStat label="Review conversion" value="6.4%" delta="-0.3%" up={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function StatusBadge({ status }: { status: "Published" | "Pending" | "Hidden" }) {
  const map = {
    Published: "bg-success/10 text-success ring-success/20",
    Pending: "bg-warning/15 text-warning-foreground ring-warning/30",
    Hidden: "bg-muted text-muted-foreground ring-border",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${map[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

function IconAction({ children, label, danger }: { children: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      title={label}
      aria-label={label}
      className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-accent ${
        danger ? "hover:text-destructive" : "hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <button className="group flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:shadow-elevated hover:-translate-y-0.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[11.5px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function MiniStat({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="text-[11.5px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-[20px] font-bold leading-none tracking-tight">{value}</div>
      <div className={`mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-success" : "text-destructive"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {delta}
      </div>
    </div>
  );
}
