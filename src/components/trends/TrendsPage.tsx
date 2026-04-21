"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import ContactSection from "@/components/ContactSection";
import PageGuide from "@/components/PageGuide";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import {
  buildProjectMomentum,
  sortByWindow,
  MomentumWindow,
  WINDOW_LABELS,
  ProjectMomentum,
} from "@/lib/analytics/momentum";
import {
  Loader2,
  TrendingUp,
  Flame,
  Snowflake,
  Sparkles,
  MapPin,
  ChevronRight,
} from "lucide-react";

const WINDOWS: MomentumWindow[] = ["10d", "3mo", "6mo", "9mo", "12mo"];

function formatAED(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function bedroomLabel(br: number): string {
  if (br === 0) return "Studio";
  if (br >= 6) return "6+ BR";
  return `${br} BR`;
}

export default function TrendsPage() {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [window, setWindow] = useState<MomentumWindow>("3mo");
  const [district, setDistrict] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [txRes, hierRes] = await Promise.all([
          fetch("/data/transactions.json", { cache: "no-cache" }),
          fetch("/data/hierarchy.json", { cache: "no-cache" }),
        ]);
        if (!txRes.ok || !hierRes.ok) throw new Error("Failed to load data");
        const [txJson, hierJson] = await Promise.all([txRes.json(), hierRes.json()]);
        if (cancelled) return;
        setAllData(decodeTransactions(txJson));
        setHierarchy(hierJson as Hierarchy);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const momentum = useMemo(
    () =>
      allData.length
        ? buildProjectMomentum(allData, {
            districtFilter: district,
            propertyTypeFilter: propertyType,
            bedroomsFilter: bedrooms,
          })
        : [],
    [allData, district, propertyType, bedrooms]
  );

  const ranked = useMemo(() => sortByWindow(momentum, window), [momentum, window]);

  const mostActive = useMemo(
    () => [...momentum].sort((a, b) => b.counts["3mo"] - a.counts["3mo"]).slice(0, 6),
    [momentum]
  );
  const surging = useMemo(
    () =>
      momentum
        .filter((m) => m.badges.includes("surging"))
        .sort((a, b) => b.surge30d - a.surge30d)
        .slice(0, 6),
    [momentum]
  );
  const cooling = useMemo(
    () =>
      momentum
        .filter((m) => m.badges.includes("cooling"))
        .sort((a, b) => a.momentum["3mo"] - b.momentum["3mo"])
        .slice(0, 6),
    [momentum]
  );
  const newDemand = useMemo(
    () =>
      momentum
        .filter((m) => m.badges.includes("new_demand"))
        .sort((a, b) => b.counts["3mo"] - a.counts["3mo"])
        .slice(0, 6),
    [momentum]
  );

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-muted">Computing project momentum…</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-negative">
          {error}
        </div>
      </>
    );
  }

  const sortedDistricts = hierarchy
    ? [...hierarchy.districts].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8">
        <PageGuide
          storageKey="trends"
          title="Trends — Which projects are the market pricing in? (DEMO)"
          description="This page ranks Abu Dhabi projects by transaction activity across multiple time windows and flags surging / cooling cohorts. Use it to spot where capital is rotating. It's a DEMO — please tell us what's missing."
          steps={[
            { icon: "⏱️", text: "Pick a time window (10 days → 12 months). The ranked table re-sorts by transaction count in that window." },
            { icon: "🔥", text: "The 'Surging' strip highlights projects accelerating above their 12-month baseline — possible early signals." },
            { icon: "🧊", text: "'Cooling' cards show cohorts losing momentum — useful if you hold exposure there." },
            { icon: "🆕", text: "'New Demand' surfaces projects with their first transactions in the last year — fresh inventory showing traction." },
            { icon: "🎯", text: "Use the filters (district / property type / bedrooms) to drill into your investment thesis." },
            { icon: "💬", text: "DEMO — what momentum signals would you want us to add? Let us know!" },
          ]}
          feedbackNote="Which projects would you expect to see at the top? If we're missing obvious ones, the data source probably is too — tell us so we can calibrate."
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Trends</h1>
          <p className="mt-1 text-sm text-muted">
            Transaction momentum across 10-day, 3, 6, 9, and 12-month windows
          </p>
        </div>

        {/* Window toggle + filters */}
        <div className="mb-6 rounded-xl border border-card-border bg-card-bg">
          <div className="border-b border-card-border px-5 py-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Time window
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    window === w
                      ? "border-accent bg-accent text-background"
                      : "border-card-border bg-card-bg text-muted hover:border-accent/50 hover:text-foreground"
                  }`}
                >
                  {WINDOW_LABELS[w]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                District
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              >
                <option value="">All districts</option>
                {sortedDistricts.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                Property type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              >
                <option value="">All</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Duplex">Duplex</option>
                <option value="Penthouse">Penthouse</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                Bedrooms
              </label>
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              >
                <option value="">All</option>
                <option value="0">Studio</option>
                <option value="1">1 BR</option>
                <option value="2">2 BR</option>
                <option value="3">3 BR</option>
                <option value="4">4 BR</option>
                <option value="5">5 BR</option>
                <option value="6+">6+ BR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Highlight strips */}
        <HighlightStrip
          icon={<Flame className="h-4 w-4 text-negative" />}
          title="Surging cohorts"
          subtitle="Transactions in last 30 days ≥ 2× the prior 90-day pace"
          rows={surging}
          accent="negative"
          emptyText="No cohorts surging right now in this filter."
        />
        <HighlightStrip
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
          title="Most active (last 90 days)"
          subtitle="Highest absolute transaction volume this quarter"
          rows={mostActive}
          accent="accent"
          emptyText="No cohorts with activity in this filter."
        />
        <HighlightStrip
          icon={<Sparkles className="h-4 w-4 text-positive" />}
          title="New demand"
          subtitle="First transaction in the last 12 months — fresh inventory getting traction"
          rows={newDemand}
          accent="positive"
          emptyText="No newly-trading cohorts right now."
        />
        <HighlightStrip
          icon={<Snowflake className="h-4 w-4 text-muted" />}
          title="Cooling"
          subtitle="Transaction pace slowing to under half the 12-month baseline"
          rows={cooling}
          accent="muted"
          emptyText="Nothing cooling in this filter."
        />

        {/* Ranked table */}
        <section className="mb-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Ranked by {WINDOW_LABELS[window]} ({ranked.length})
            </h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-card-border bg-card-bg">
            <table className="w-full text-sm">
              <thead className="bg-input-bg text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold">Project</th>
                  <th className="px-4 py-3 text-left font-semibold">BR</th>
                  <th className="px-4 py-3 text-right font-semibold">10d</th>
                  <th className="px-4 py-3 text-right font-semibold">3mo</th>
                  <th className="px-4 py-3 text-right font-semibold">6mo</th>
                  <th className="px-4 py-3 text-right font-semibold">12mo</th>
                  <th className="px-4 py-3 text-right font-semibold">Median</th>
                  <th className="px-4 py-3 text-right font-semibold">Momentum 3mo</th>
                  <th className="px-4 py-3 text-center font-semibold">Tags</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 100).map((r, i) => (
                  <tr
                    key={`${r.project}|${r.bedrooms}`}
                    className="border-t border-card-border/50 hover:bg-input-bg/50"
                  >
                    <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-foreground">{r.project}</p>
                      <p className="flex items-center gap-1 text-[11px] text-muted">
                        <MapPin className="h-2.5 w-2.5" />
                        {r.district}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{bedroomLabel(r.bedrooms)}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">{r.counts["10d"]}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{r.counts["3mo"]}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">{r.counts["6mo"]}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{r.counts["12mo"]}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">
                      {formatAED(r.medianPrice)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <MomentumPill value={r.momentum["3mo"]} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap justify-center gap-1">
                        {r.badges.slice(0, 2).map((b) => (
                          <BadgePill key={b} badge={b} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ranked.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted">
                No cohorts match this filter.
              </p>
            )}
          </div>
        </section>

        <ContactSection />
      </main>
    </>
  );
}

function HighlightStrip({
  icon,
  title,
  subtitle,
  rows,
  accent,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rows: ProjectMomentum[];
  accent: "accent" | "positive" | "negative" | "muted";
  emptyText: string;
}) {
  const accentBorder = {
    accent: "border-accent/25",
    positive: "border-positive/25",
    negative: "border-negative/25",
    muted: "border-card-border",
  }[accent];

  return (
    <section className={`mb-5 rounded-xl border ${accentBorder} bg-card-bg`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-card-border px-5 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <MomentumCard key={`${r.project}|${r.bedrooms}`} row={r} accent={accent} />
          ))}
        </div>
      )}
    </section>
  );
}

function MomentumCard({
  row,
  accent,
}: {
  row: ProjectMomentum;
  accent: "accent" | "positive" | "negative" | "muted";
}) {
  const accentText = {
    accent: "text-accent",
    positive: "text-positive",
    negative: "text-negative",
    muted: "text-muted",
  }[accent];

  return (
    <a
      href={`/mls/report?project=${encodeURIComponent(row.project)}&bedrooms=${row.bedrooms}`}
      className="group flex flex-col gap-2 rounded-lg border border-card-border bg-background/40 p-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{row.project}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted">
            <MapPin className="h-3 w-3" />
            {row.district} · {bedroomLabel(row.bedrooms)}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted group-hover:text-accent" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-muted">10d</p>
          <p className="font-semibold text-foreground">{row.counts["10d"]}</p>
        </div>
        <div>
          <p className="text-muted">90d</p>
          <p className={`font-semibold ${accentText}`}>{row.counts["3mo"]}</p>
        </div>
        <div>
          <p className="text-muted">12mo</p>
          <p className="font-semibold text-foreground">{row.counts["12mo"]}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-card-border pt-1.5 text-[11px]">
        <span className="text-muted">Median: <span className="text-foreground">{formatAED(row.medianPrice)}</span></span>
        <MomentumPill value={row.momentum["3mo"]} />
      </div>
    </a>
  );
}

function MomentumPill({ value }: { value: number }) {
  const color =
    value >= 1.3
      ? "bg-positive/15 text-positive"
      : value <= 0.6
      ? "bg-negative/15 text-negative"
      : "bg-muted/15 text-muted";
  const sign = value >= 1 ? "×" : "×";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>
      {value.toFixed(2)}{sign}
    </span>
  );
}

function BadgePill({ badge }: { badge: ProjectMomentum["badges"][number] }) {
  const styles: Record<string, { label: string; cls: string }> = {
    most_active: { label: "Most Active", cls: "bg-accent/15 text-accent" },
    surging: { label: "Surging", cls: "bg-negative/15 text-negative" },
    accelerating: { label: "Accelerating", cls: "bg-positive/15 text-positive" },
    cooling: { label: "Cooling", cls: "bg-muted/15 text-muted" },
    new_demand: { label: "New Demand", cls: "bg-positive/15 text-positive" },
    high_liquidity: { label: "High Liquidity", cls: "bg-accent/10 text-accent" },
  };
  const s = styles[badge];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

