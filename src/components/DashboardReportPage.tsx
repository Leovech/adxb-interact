"use client";

/**
 * Dashboard search report — printable PDF.
 *
 * Takes the same filters the user set on the Dashboard, loads the data,
 * applies filters, and renders a clean multi-section report with:
 *   - Filter summary header
 *   - KPI row
 *   - Full price history chart (first tx → report date)
 *   - Monthly volume chart
 *   - Median stats
 *   - Recent transactions table
 *
 * Print stylesheet in globals.css hides the toolbar and forces ink layout.
 */

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { LanguageProvider } from "@/i18n/LanguageContext";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import { FilterState, defaultFilters, applyFilters, DatePreset } from "@/lib/filters";
import {
  ArrowLeft,
  Printer,
  MapPin,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface Props {
  district: string;
  project: string;
  propertyType: string;
  bedrooms: string;
  status: string;
  sequence: string;
  assetClass: string;
  datePreset: string;
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatFullAED(n: number): string {
  return `AED ${n.toLocaleString()}`;
}

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function brLabel(br: string): string {
  if (br === "0") return "Studio";
  if (br === "6+") return "6+ BR";
  if (br) return `${br} BR`;
  return "All bedrooms";
}

// Monthly bucket for charts
interface MonthBucket {
  month: string; // YYYY-MM
  txCount: number;
  medianPrice: number;
  medianRate: number;
  totalVolume: number;
}

function bucketByMonth(txs: Transaction[]): MonthBucket[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = t.date.slice(0, 7);
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(t);
  }

  const buckets: MonthBucket[] = [];
  for (const [month, rows] of map) {
    buckets.push({
      month,
      txCount: rows.length,
      medianPrice: Math.round(median(rows.map((r) => r.price))),
      medianRate: Math.round(median(rows.map((r) => r.ratePerSqft))),
      totalVolume: rows.reduce((s, r) => s + r.price, 0),
    });
  }
  return buckets.sort((a, b) => a.month.localeCompare(b.month));
}

function DashboardReportContent(props: Props) {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters: FilterState = useMemo(
    () => ({
      ...defaultFilters,
      district: props.district,
      project: props.project,
      propertyType: props.propertyType,
      bedrooms: props.bedrooms,
      status: props.status,
      sequence: props.sequence,
      assetClass: props.assetClass,
      datePreset: (props.datePreset || "all_time") as DatePreset,
    }),
    [props]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/data/transactions.json", { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (cancelled) return;
        setAllData(decodeTransactions(json));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // For the FULL price history chart we use ALL TIME data for this project/BR
  // regardless of the date filter — so users see the entire price journey.
  const fullHistoryFilters: FilterState = useMemo(
    () => ({ ...filters, datePreset: "all_time" as DatePreset, dateFrom: "", dateTo: "" }),
    [filters]
  );

  const filtered = useMemo(() => applyFilters(allData, filters), [allData, filters]);
  const fullHistory = useMemo(() => applyFilters(allData, fullHistoryFilters), [allData, fullHistoryFilters]);
  const monthlyBuckets = useMemo(() => bucketByMonth(fullHistory), [fullHistory]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-muted">Building report…</p>
        </div>
      </>
    );
  }

  if (error || filtered.length === 0) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            {error ? error : "No transactions match this filter"}
          </h1>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </a>
        </div>
      </>
    );
  }

  // KPIs
  const prices = filtered.map((t) => t.price);
  const rates = filtered.map((t) => t.ratePerSqft);
  const sizes = filtered.map((t) => t.sizeSqft);
  const medianPrice = Math.round(median(prices));
  const medianRate = Math.round(median(rates));
  const medianSize = Math.round(median(sizes));
  const avgPrice = Math.round(prices.reduce((s, v) => s + v, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const totalVolume = prices.reduce((s, v) => s + v, 0);
  const firstDate = [...filtered].sort((a, b) => a.date.localeCompare(b.date))[0].date;
  const lastDate = [...filtered].sort((a, b) => b.date.localeCompare(a.date))[0].date;

  // Price trend (first vs last quarter median)
  const sortedByDate = [...fullHistory].sort((a, b) => a.date.localeCompare(b.date));
  const q1 = sortedByDate.slice(0, Math.ceil(sortedByDate.length / 4));
  const q4 = sortedByDate.slice(-Math.ceil(sortedByDate.length / 4));
  const q1Median = median(q1.map((t) => t.ratePerSqft));
  const q4Median = median(q4.map((t) => t.ratePerSqft));
  const rateChangePct = q1Median > 0 ? ((q4Median - q1Median) / q1Median) * 100 : 0;

  // Filter description
  const filterParts: string[] = [];
  if (props.project) filterParts.push(props.project);
  if (props.district) filterParts.push(props.district);
  if (props.propertyType) filterParts.push(props.propertyType);
  if (props.bedrooms) filterParts.push(brLabel(props.bedrooms));
  if (props.status) filterParts.push(props.status);
  if (props.sequence) filterParts.push(props.sequence);
  const filterTitle = filterParts.length > 0 ? filterParts.join(" · ") : "All Abu Dhabi";

  return (
    <>
      <div className="print:hidden">
        <Header />
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 lg:px-0">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm font-medium text-foreground hover:border-accent/50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" /> Download PDF
          </button>
        </div>

        <article className="report-sheet rounded-2xl border border-card-border bg-card-bg p-6 print:rounded-none print:border-0 print:p-0">
          {/* Header */}
          <header className="border-b border-card-border pb-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
              <BarChart3 className="h-3 w-3" />
              Dashboard Search Report
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">{filterTitle}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {props.district && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {props.district}
                </span>
              )}
              {props.project && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {props.project}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {firstDate} → {lastDate}
              </span>
            </p>
          </header>

          {/* KPI Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPI label="Transactions" value={filtered.length.toLocaleString()} sub={`${firstDate} → ${lastDate}`} />
            <KPI label="Median price" value={formatFullAED(medianPrice)} sub={`Avg ${formatFullAED(avgPrice)}`} />
            <KPI label="Price range" value={`${formatAED(minPrice)} – ${formatAED(maxPrice)}`} sub="Lowest → highest" />
            <KPI label="Median rate" value={`${medianRate.toLocaleString()} AED/sqft`} sub={`Typical size: ${medianSize.toLocaleString()} sqft`} />
          </div>

          {/* Price trend summary */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-card-border bg-background/40 px-4 py-3 print:bg-transparent">
            {rateChangePct >= 0 ? (
              <TrendingUp className="h-5 w-5 text-positive" />
            ) : (
              <TrendingDown className="h-5 w-5 text-negative" />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                Rate per sqft {rateChangePct >= 0 ? "increased" : "decreased"} by{" "}
                <span className={rateChangePct >= 0 ? "text-positive" : "text-negative"}>
                  {Math.abs(rateChangePct).toFixed(1)}%
                </span>{" "}
                from first quarter to latest quarter
              </p>
              <p className="text-xs text-muted">
                Q1 median: {Math.round(q1Median).toLocaleString()} AED/sqft →
                Latest: {Math.round(q4Median).toLocaleString()} AED/sqft ·{" "}
                {fullHistory.length} total transactions in history
              </p>
            </div>
          </div>

          {/* Total volume */}
          <div className="mt-3 rounded-lg border border-card-border bg-background/40 px-4 py-3 text-sm print:bg-transparent">
            <span className="text-muted">Total transaction volume: </span>
            <span className="font-bold text-foreground">AED {formatAED(totalVolume)}</span>
            <span className="ms-2 text-muted">
              across {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Full Price History Chart — from first tx to report date */}
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
              <TrendingUp className="h-4 w-4 text-accent" />
              Price history — from first transaction to today ({monthlyBuckets.length} months)
            </h2>
            <PriceHistoryChart buckets={monthlyBuckets} />
          </section>

          {/* Monthly Volume Chart */}
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
              <BarChart3 className="h-4 w-4 text-accent" />
              Monthly transaction volume
            </h2>
            <VolumeChart buckets={monthlyBuckets} />
          </section>

          {/* Recent transactions table */}
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
              <Calendar className="h-4 w-4 text-accent" />
              Latest transactions ({Math.min(20, filtered.length)} of {filtered.length})
            </h2>
            <RecentTransactionsTable txs={filtered} />
          </section>

          {/* Footer */}
          <footer className="mt-6 border-t border-card-border pt-4 text-[11px] text-muted">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Generated {new Date().toLocaleString()} · Data source: ADREC</span>
              <span>ADXBInteract · Sand Square Group</span>
            </div>
            <p className="mt-2 leading-relaxed">
              <AlertTriangle className="me-1 inline h-3 w-3" />
              Transaction data from ADREC (Abu Dhabi Real Estate Centre). Prices shown are
              actual closed-sale records. Not financial advice.
            </p>
          </footer>
        </article>
      </main>
    </>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-background/40 p-3 print:bg-transparent">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted">{sub}</p>
    </div>
  );
}

/**
 * Inline SVG price history chart (rate per sqft over time).
 * No recharts dependency — prints clean.
 */
function PriceHistoryChart({ buckets }: { buckets: MonthBucket[] }) {
  if (buckets.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">Not enough monthly data to plot.</p>;
  }

  const w = 700;
  const h = 180;
  const padX = 10;
  const padY = 20;
  const rates = buckets.map((b) => b.medianRate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = Math.max(1, max - min);
  const stepX = (w - padX * 2) / (buckets.length - 1);

  const points = buckets
    .map((b, i) => {
      const x = padX + i * stepX;
      const y = padY + (h - padY * 2) * (1 - (b.medianRate - min) / span);
      return `${x},${y}`;
    })
    .join(" ");

  // Area fill
  const areaPoints =
    `${padX},${h - padY} ` +
    points +
    ` ${padX + (buckets.length - 1) * stepX},${h - padY}`;

  const first = rates[0];
  const last = rates[rates.length - 1];
  const delta = first > 0 ? ((last - first) / first) * 100 : 0;

  // Tick labels: show first, middle, last month
  const ticks = [0, Math.floor(buckets.length / 2), buckets.length - 1];

  return (
    <div className="rounded-lg border border-card-border bg-background/40 p-4 print:bg-transparent">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted">
          {buckets[0].month} → {buckets[buckets.length - 1].month}
        </span>
        <span className={`font-semibold ${delta >= 0 ? "text-positive" : "text-negative"}`}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% overall
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <polygon points={areaPoints} className="fill-accent/10" />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
          points={points}
        />
        {buckets.map((b, i) => {
          const x = padX + i * stepX;
          const y = padY + (h - padY * 2) * (1 - (b.medianRate - min) / span);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={buckets.length > 40 ? 1.5 : 2.5}
              className="fill-accent"
            />
          );
        })}
        {/* Tick labels */}
        {ticks.map((idx) => {
          const x = padX + idx * stepX;
          return (
            <text
              key={idx}
              x={x}
              y={h - 2}
              textAnchor="middle"
              className="fill-muted text-[9px]"
            >
              {buckets[idx].month}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-muted">
        <div>Start: <span className="text-foreground">{min.toLocaleString()}</span> AED/sqft</div>
        <div>End: <span className="text-foreground">{last.toLocaleString()}</span> AED/sqft</div>
        <div>Min: <span className="text-foreground">{min.toLocaleString()}</span></div>
        <div>Max: <span className="text-foreground">{max.toLocaleString()}</span></div>
      </div>
    </div>
  );
}

/**
 * Monthly volume bar chart — shows how many transactions per month.
 */
function VolumeChart({ buckets }: { buckets: MonthBucket[] }) {
  if (buckets.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">Not enough data.</p>;
  }

  const w = 700;
  const h = 120;
  const padX = 10;
  const padY = 15;
  const maxCount = Math.max(...buckets.map((b) => b.txCount));
  const barW = Math.max(2, (w - padX * 2) / buckets.length - 1);

  return (
    <div className="rounded-lg border border-card-border bg-background/40 p-4 print:bg-transparent">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        {buckets.map((b, i) => {
          const x = padX + i * ((w - padX * 2) / buckets.length);
          const barH = maxCount > 0 ? ((h - padY * 2) * b.txCount) / maxCount : 0;
          const y = h - padY - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={1}
              className="fill-accent/60"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <span>{buckets[0].month}</span>
        <span>Peak: {maxCount} tx/month</span>
        <span>{buckets[buckets.length - 1].month}</span>
      </div>
    </div>
  );
}

/**
 * Recent transactions table — latest 20, sorted newest first.
 */
function RecentTransactionsTable({ txs }: { txs: Transaction[] }) {
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <div className="overflow-hidden rounded-lg border border-card-border">
      <table className="w-full text-sm">
        <thead className="bg-input-bg text-[10px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Date</th>
            <th className="px-3 py-2 text-left font-semibold">Project</th>
            <th className="px-3 py-2 text-left font-semibold">Type</th>
            <th className="px-3 py-2 text-center font-semibold">BR</th>
            <th className="px-3 py-2 text-right font-semibold">Size</th>
            <th className="px-3 py-2 text-right font-semibold">Price</th>
            <th className="px-3 py-2 text-right font-semibold">Rate</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id} className="border-t border-card-border/50">
              <td className="px-3 py-1.5 text-xs text-muted">{t.date}</td>
              <td className="px-3 py-1.5 text-xs font-semibold text-foreground">{t.project || "—"}</td>
              <td className="px-3 py-1.5 text-xs text-foreground">{t.propertyType}</td>
              <td className="px-3 py-1.5 text-center text-xs text-foreground">
                {t.bedrooms === 0 ? "S" : t.bedrooms}
              </td>
              <td className="px-3 py-1.5 text-right text-xs text-muted">
                {t.sizeSqft.toLocaleString()}
              </td>
              <td className="px-3 py-1.5 text-right text-xs font-semibold text-foreground">
                {formatFullAED(t.price)}
              </td>
              <td className="px-3 py-1.5 text-right text-xs text-muted">
                {t.ratePerSqft.toLocaleString()}
              </td>
              <td className="px-3 py-1.5 text-xs text-muted">{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardReportPage(props: Props) {
  return (
    <LanguageProvider>
      <DashboardReportContent {...props} />
    </LanguageProvider>
  );
}
