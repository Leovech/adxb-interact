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

import { useEffect, useMemo, useState, Component, type ReactNode } from "react";
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
  searchQuery: string;
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  sizeMin: string;
  sizeMax: string;
  rateMin: string;
  rateMax: string;
  offerPrice?: string;
  offerBR?: string;
  offerSize?: string;
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
      searchQuery: props.searchQuery,
      datePreset: (props.datePreset || "all_time") as DatePreset,
      dateFrom: props.dateFrom,
      dateTo: props.dateTo,
      priceMin: props.priceMin,
      priceMax: props.priceMax,
      sizeMin: props.sizeMin,
      sizeMax: props.sizeMax,
      rateMin: props.rateMin,
      rateMax: props.rateMax,
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
  if (props.searchQuery) filterParts.push(`"${props.searchQuery}"`);
  const filterTitle = filterParts.length > 0 ? filterParts.join(" · ") : "All Abu Dhabi";

  // Active range filters for display
  const activeRanges: string[] = [];
  if (props.priceMin || props.priceMax) {
    activeRanges.push(`Price: ${props.priceMin ? formatAED(Number(props.priceMin)) : "0"} – ${props.priceMax ? formatAED(Number(props.priceMax)) : "∞"}`);
  }
  if (props.sizeMin || props.sizeMax) {
    activeRanges.push(`Size: ${props.sizeMin || "0"} – ${props.sizeMax || "∞"} sqft`);
  }
  if (props.rateMin || props.rateMax) {
    activeRanges.push(`Rate: ${props.rateMin || "0"} – ${props.rateMax || "∞"} AED/sqft`);
  }

  // Cumulative transaction count chart data
  const cumulativeBuckets = useMemo(() => {
    let running = 0;
    return monthlyBuckets.map((b) => {
      running += b.txCount;
      return { ...b, cumulative: running };
    });
  }, [monthlyBuckets]);

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

          {/* Active range filters */}
          {activeRanges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeRanges.map((r, i) => (
                <span key={i} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-foreground">
                  {r}
                </span>
              ))}
            </div>
          )}

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

          {/* Offer vs Market comparison — only if the user entered an offer */}
          <OfferComparison
            offerPrice={props.offerPrice}
            offerBR={props.offerBR}
            offerSize={props.offerSize}
            medianPrice={medianPrice}
            medianRate={medianRate}
            minPrice={minPrice}
            maxPrice={maxPrice}
            medianSize={medianSize}
            txCount={filtered.length}
            prices={prices}
          />

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

          {/* Cumulative transaction count */}
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
              <TrendingUp className="h-4 w-4 text-accent" />
              Cumulative transaction count over time
            </h2>
            <CumulativeChart buckets={cumulativeBuckets} />
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

/**
 * Offer vs market comparison.
 * Only renders when the user provided an offer price.
 */
/**
 * Cumulative transaction count over time — shows how deals accumulated
 * from the first sale to today.
 */
function CumulativeChart({ buckets }: { buckets: (MonthBucket & { cumulative: number })[] }) {
  if (buckets.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">Not enough data.</p>;
  }

  const w = 700;
  const h = 160;
  const padX = 10;
  const padY = 18;
  const maxCum = buckets[buckets.length - 1].cumulative;
  const stepX = (w - padX * 2) / (buckets.length - 1);

  const points = buckets
    .map((b, i) => {
      const x = padX + i * stepX;
      const y = padY + (h - padY * 2) * (1 - b.cumulative / maxCum);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints =
    `${padX},${h - padY} ` +
    points +
    ` ${padX + (buckets.length - 1) * stepX},${h - padY}`;

  const ticks = [0, Math.floor(buckets.length / 2), buckets.length - 1];
  const total = buckets[buckets.length - 1].cumulative;

  return (
    <div className="rounded-lg border border-card-border bg-background/40 p-4 print:bg-transparent">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted">{buckets[0].month} → {buckets[buckets.length - 1].month}</span>
        <span className="font-semibold text-foreground">Total: {total.toLocaleString()} transactions</span>
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
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted">
        <div>First sale: <span className="text-foreground">{buckets[0].month}</span></div>
        <div className="text-center">Avg/month: <span className="text-foreground">{(total / buckets.length).toFixed(1)}</span></div>
        <div className="text-right">Peak month: <span className="text-foreground">{Math.max(...buckets.map(b => b.txCount))} tx</span></div>
      </div>
    </div>
  );
}

function OfferComparison({
  offerPrice: offerPriceStr,
  offerBR: offerBRStr,
  offerSize: offerSizeStr,
  medianPrice,
  medianRate,
  minPrice,
  maxPrice,
  medianSize,
  txCount,
  prices,
}: {
  offerPrice?: string;
  offerBR?: string;
  offerSize?: string;
  medianPrice: number;
  medianRate: number;
  minPrice: number;
  maxPrice: number;
  medianSize: number;
  txCount: number;
  prices: number[];
}) {
  const offerPrice = Number(offerPriceStr) || 0;
  const offerBR = offerBRStr || "";
  const offerSize = Number(offerSizeStr) || 0;

  if (offerPrice <= 0) return null;

  const offerRate = offerSize > 0 ? Math.round(offerPrice / offerSize) : 0;
  const vsMedianPct =
    medianPrice > 0 ? ((offerPrice - medianPrice) / medianPrice) * 100 : 0;
  const vsMinPct =
    minPrice > 0 ? ((offerPrice - minPrice) / minPrice) * 100 : 0;
  const vsMaxPct =
    maxPrice > 0 ? ((offerPrice - maxPrice) / maxPrice) * 100 : 0;

  // Position in the distribution (what percentile is the offer?)
  const belowCount = prices.filter((p) => p <= offerPrice).length;
  const percentile = txCount > 0 ? Math.round((belowCount / txCount) * 100) : 0;

  const isBelow = vsMedianPct < 0;
  const isWayBelow = vsMedianPct < -10;
  const isAbove = vsMedianPct > 5;

  let verdictText: string;
  let verdictColor: string;
  if (isWayBelow) {
    verdictText =
      "Your offer is significantly below the market median. This is a strong negotiation position — but the seller may reject it outright. Consider using the closed-sale data below as leverage.";
    verdictColor = "border-positive/40 bg-positive/5";
  } else if (isBelow) {
    verdictText =
      "Your offer is below the market median — a competitive position. You have room to negotiate up if needed while still getting a good deal.";
    verdictColor = "border-positive/40 bg-positive/5";
  } else if (isAbove) {
    verdictText =
      "Your offer is above the market median. Consider whether the specific unit justifies the premium, or use the data below to negotiate closer to market.";
    verdictColor = "border-negative/30 bg-negative/5";
  } else {
    verdictText =
      "Your offer is in line with recent closed-sale prices. This is a fair-market offer.";
    verdictColor = "border-accent/30 bg-accent/5";
  }

  // Price distribution bar — visual position of the offer
  const priceRange = maxPrice - minPrice;
  const offerPosition =
    priceRange > 0 ? Math.max(0, Math.min(100, ((offerPrice - minPrice) / priceRange) * 100)) : 50;
  const medianPosition =
    priceRange > 0 ? ((medianPrice - minPrice) / priceRange) * 100 : 50;

  return (
    <section className={`mt-5 rounded-xl border ${verdictColor} p-5`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
        <TrendingUp className="h-4 w-4 text-accent" />
        Your offer vs market
      </h2>

      {/* Offer summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Your offer</p>
          <p className="text-xl font-bold text-foreground">{formatFullAED(offerPrice)}</p>
        </div>
        {offerBR && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Bedrooms</p>
            <p className="text-xl font-bold text-foreground">
              {offerBR === "0" ? "Studio" : `${offerBR} BR`}
            </p>
          </div>
        )}
        {offerSize > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Size</p>
            <p className="text-xl font-bold text-foreground">{offerSize.toLocaleString()} sqft</p>
          </div>
        )}
        {offerRate > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Your rate</p>
            <p className="text-xl font-bold text-foreground">{offerRate.toLocaleString()} AED/sqft</p>
          </div>
        )}
      </div>

      {/* Verdict */}
      <p className="mb-4 rounded-lg border border-card-border bg-card-bg px-4 py-3 text-sm leading-relaxed text-foreground">
        {verdictText}
      </p>

      {/* Comparison grid */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CompareRow
          label="vs Market median"
          market={formatFullAED(medianPrice)}
          delta={vsMedianPct}
        />
        <CompareRow
          label="vs Lowest sale"
          market={formatFullAED(minPrice)}
          delta={vsMinPct}
        />
        <CompareRow
          label="vs Highest sale"
          market={formatFullAED(maxPrice)}
          delta={vsMaxPct}
        />
      </div>

      {/* Rate comparison */}
      {offerRate > 0 && (
        <div className="mb-4 rounded-lg border border-card-border bg-card-bg px-4 py-3 text-sm">
          <span className="text-muted">Your rate: </span>
          <span className="font-bold text-foreground">{offerRate.toLocaleString()} AED/sqft</span>
          <span className="mx-2 text-muted">vs market median:</span>
          <span className="font-bold text-accent">{medianRate.toLocaleString()} AED/sqft</span>
          {medianSize > 0 && (
            <span className="ms-2 text-muted">(typical size: {medianSize.toLocaleString()} sqft)</span>
          )}
        </div>
      )}

      {/* Visual price distribution bar */}
      <div className="rounded-lg border border-card-border bg-card-bg p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Where your offer sits in the distribution
        </p>
        <div className="relative h-8 w-full rounded-full bg-input-bg">
          {/* Full range bar */}
          <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-positive/30 via-accent/20 to-negative/30" />
          {/* Median marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-accent"
            style={{ left: `${medianPosition}%` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-accent">
              Median
            </span>
          </div>
          {/* Offer marker */}
          <div
            className="absolute top-0 bottom-0 w-1 rounded-full bg-foreground"
            style={{ left: `${offerPosition}%` }}
          >
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-foreground">
              Your offer
            </span>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between text-[11px] text-muted">
          <span>Low: {formatAED(minPrice)}</span>
          <span className="font-semibold text-foreground">
            Percentile: {percentile}% of sales were at or below your offer
          </span>
          <span>High: {formatAED(maxPrice)}</span>
        </div>
      </div>
    </section>
  );
}

function CompareRow({
  label, market, delta,
}: {
  label: string;
  market: string;
  delta: number;
}) {
  const color =
    delta < -2 ? "text-positive" : delta > 5 ? "text-negative" : "text-foreground";
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-muted">{market}</p>
      <p className={`text-lg font-bold ${color}`}>
        {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
      </p>
    </div>
  );
}

class ReportErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-sm font-semibold text-negative">Report rendering error</p>
          <p className="mt-2 text-xs text-muted">{this.state.error}</p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            Back to Dashboard
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardReportPage(props: Props) {
  return (
    <LanguageProvider>
      <ReportErrorBoundary>
        <DashboardReportContent {...props} />
      </ReportErrorBoundary>
    </LanguageProvider>
  );
}
