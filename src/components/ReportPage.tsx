"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Transaction, decodeTransactions } from "@/data/abu-dhabi";
import {
  ArrowLeft,
  Printer,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface Props {
  project: string;
  district: string;
  bedrooms: string;
  propertyType: string;
  offerPrice: string;
  offerSize: string;
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function brLabel(br: string): string {
  if (br === "0") return "Studio";
  if (!br) return "All";
  return `${br} BR`;
}

interface MonthRow {
  month: string;
  count: number;
  medianPrice: number;
  medianRate: number;
  cumulative: number;
}

function ReportContent({ project, district, bedrooms, propertyType, offerPrice, offerSize }: Props) {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/data/transactions.json", { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to load data");
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

  const filtered = useMemo(() => {
    return allData.filter((t) => {
      if (project && t.project !== project) return false;
      if (district && t.district !== district) return false;
      if (propertyType && t.propertyType !== propertyType) return false;
      if (bedrooms) {
        if (bedrooms === "6+") { if (t.bedrooms < 6) return false; }
        else if (t.bedrooms !== Number(bedrooms)) return false;
      }
      return true;
    });
  }, [allData, project, district, bedrooms, propertyType]);

  const monthly = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = t.date.slice(0, 7);
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    const rows: MonthRow[] = [];
    let cum = 0;
    for (const [month, txs] of [...map.entries()].sort()) {
      cum += txs.length;
      rows.push({
        month,
        count: txs.length,
        medianPrice: Math.round(median(txs.map((t) => t.price))),
        medianRate: Math.round(median(txs.map((t) => t.ratePerSqft))),
        cumulative: cum,
      });
    }
    return rows;
  }, [filtered]);

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

  if (error) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-negative">{error}</p>
          <a href="/" className="mt-4 inline-block text-sm text-accent hover:underline">Back to Dashboard</a>
        </div>
      </>
    );
  }

  if (filtered.length === 0) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">No transactions found</p>
          <p className="mt-2 text-sm text-muted">
            No data for {project || "this filter"}. Try a different search.
          </p>
          <a href="/" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </a>
        </div>
      </>
    );
  }

  // Stats
  const prices = filtered.map((t) => t.price);
  const rates = filtered.map((t) => t.ratePerSqft);
  const sizes = filtered.map((t) => t.sizeSqft);
  const medPrice = Math.round(median(prices));
  const medRate = Math.round(median(rates));
  const medSize = Math.round(median(sizes));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const totalVol = prices.reduce((s, v) => s + v, 0);
  const sortedDates = filtered.map((t) => t.date).sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  // Price trend Q1 vs Q4
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const q1 = sorted.slice(0, Math.ceil(sorted.length / 4));
  const q4 = sorted.slice(-Math.ceil(sorted.length / 4));
  const q1Rate = median(q1.map((t) => t.ratePerSqft));
  const q4Rate = median(q4.map((t) => t.ratePerSqft));
  const rateDelta = q1Rate > 0 ? ((q4Rate - q1Rate) / q1Rate) * 100 : 0;

  // Offer comparison
  const offerNum = Number(offerPrice) || 0;
  const offerSz = Number(offerSize) || 0;
  const offerRate = offerSz > 0 ? Math.round(offerNum / offerSz) : 0;
  const offerVsMedian = medPrice > 0 ? ((offerNum - medPrice) / medPrice) * 100 : 0;
  const belowCount = prices.filter((p) => p <= offerNum).length;
  const percentile = Math.round((belowCount / prices.length) * 100);

  // Title
  const titleParts = [project, district, propertyType, bedrooms ? brLabel(bedrooms) : ""].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join(" · ") : "Abu Dhabi Market";

  return (
    <>
      <div className="print:hidden"><Header /></div>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a href="/" className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm font-medium text-foreground hover:border-accent/50">
            <ArrowLeft className="h-4 w-4" /> Back
          </a>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover">
            <Printer className="h-4 w-4" /> Save as PDF
          </button>
        </div>

        <article className="report-sheet rounded-2xl border border-card-border bg-card-bg p-6 print:rounded-none print:border-0 print:p-0">
          {/* Header */}
          <header className="border-b border-card-border pb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              <BarChart3 className="me-1 inline h-3 w-3" /> Transaction Report
            </p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted">
              <Calendar className="me-1 inline h-3.5 w-3.5" />
              {firstDate} → {lastDate} · {filtered.length} transactions
            </p>
          </header>

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Median price" value={`AED ${formatAED(medPrice)}`} />
            <Stat label="Price range" value={`${formatAED(minPrice)} – ${formatAED(maxPrice)}`} />
            <Stat label="Median rate" value={`${medRate.toLocaleString()} AED/sqft`} />
            <Stat label="Typical size" value={`${medSize.toLocaleString()} sqft`} />
          </div>

          {/* Trend */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-card-border p-3">
            {rateDelta >= 0 ? <TrendingUp className="h-5 w-5 text-positive" /> : <TrendingDown className="h-5 w-5 text-negative" />}
            <div>
              <p className="text-sm font-semibold text-foreground">
                Rate {rateDelta >= 0 ? "up" : "down"}{" "}
                <span className={rateDelta >= 0 ? "text-positive" : "text-negative"}>
                  {Math.abs(rateDelta).toFixed(1)}%
                </span>{" "}
                from first to latest quarter
              </p>
              <p className="text-xs text-muted">
                {Math.round(q1Rate).toLocaleString()} → {Math.round(q4Rate).toLocaleString()} AED/sqft ·
                Total volume: AED {formatAED(totalVol)}
              </p>
            </div>
          </div>

          {/* Offer comparison */}
          {offerNum > 0 && (
            <section className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-accent">
                Your offer vs market
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Your offer" value={`AED ${formatAED(offerNum)}`} />
                <Stat label="vs Median" value={`${offerVsMedian >= 0 ? "+" : ""}${offerVsMedian.toFixed(1)}%`} />
                {offerRate > 0 && <Stat label="Your rate" value={`${offerRate.toLocaleString()} AED/sqft`} />}
                <Stat label="Percentile" value={`${percentile}% of sales ≤ your offer`} />
              </div>
              <p className="mt-3 text-sm text-foreground">
                {offerVsMedian < -10
                  ? "Strong negotiation position — significantly below market. Use closed-sale data as leverage."
                  : offerVsMedian < 0
                  ? "Competitive offer — below the median. Room to move up if needed."
                  : offerVsMedian <= 5
                  ? "Fair-market offer — in line with recent closed sales."
                  : "Above market median — check if the unit justifies the premium."}
              </p>
              <p className="mt-1 text-xs text-muted">
                Market median: AED {formatAED(medPrice)} · Rate: {medRate.toLocaleString()} AED/sqft
              </p>
            </section>
          )}

          {/* Price History Chart */}
          <section className="mt-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
              <TrendingUp className="me-1 inline h-4 w-4 text-accent" />
              Price per sqft — {monthly.length} months
            </h2>
            <LineChart data={monthly.map((m) => m.medianRate)} labels={monthly.map((m) => m.month)} />
          </section>

          {/* Cumulative transactions */}
          <section className="mt-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
              <BarChart3 className="me-1 inline h-4 w-4 text-accent" />
              Cumulative transactions over time
            </h2>
            <LineChart data={monthly.map((m) => m.cumulative)} labels={monthly.map((m) => m.month)} />
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>Total: {filtered.length} transactions</span>
              <span>Avg: {(filtered.length / Math.max(1, monthly.length)).toFixed(1)} / month</span>
              <span>Peak: {Math.max(...monthly.map((m) => m.count))} tx/month</span>
            </div>
          </section>

          {/* Monthly volume bars */}
          <section className="mt-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
              <Calendar className="me-1 inline h-4 w-4 text-accent" />
              Monthly transaction volume
            </h2>
            <BarChartSVG data={monthly.map((m) => m.count)} labels={monthly.map((m) => m.month)} />
          </section>

          {/* Recent transactions */}
          <section className="mt-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
              Latest 15 transactions
            </h2>
            <div className="overflow-hidden rounded-lg border border-card-border">
              <table className="w-full text-sm">
                <thead className="bg-input-bg text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Project</th>
                    <th className="px-3 py-2 text-center">BR</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15).map((t, i) => (
                    <tr key={i} className="border-t border-card-border/50">
                      <td className="px-3 py-1.5 text-xs text-muted">{t.date}</td>
                      <td className="px-3 py-1.5 text-xs font-semibold text-foreground">{t.project || "—"}</td>
                      <td className="px-3 py-1.5 text-center text-xs">{t.bedrooms === 0 ? "S" : t.bedrooms}</td>
                      <td className="px-3 py-1.5 text-right text-xs text-muted">{t.sizeSqft.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-xs font-semibold">AED {t.price.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-xs text-muted">{t.ratePerSqft.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-6 border-t border-card-border pt-4 text-[11px] text-muted">
            <div className="flex justify-between">
              <span>Generated {new Date().toLocaleDateString()} · ADREC data</span>
              <span>ADXBInteract · Sand Square Group</span>
            </div>
            <p className="mt-1">
              <AlertTriangle className="me-1 inline h-3 w-3" />
              Based on ADREC closed-sale records. Not financial advice.
            </p>
          </footer>
        </article>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-border p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function LineChart({ data, labels }: { data: number[]; labels: string[] }) {
  if (data.length < 2) return <p className="py-6 text-center text-sm text-muted">Not enough data.</p>;
  const w = 660, h = 140, px = 8, py = 14;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = (w - px * 2) / (data.length - 1);
  const pts = data.map((v, i) => `${px + i * step},${py + (h - py * 2) * (1 - (v - min) / span)}`).join(" ");
  const area = `${px},${h - py} ${pts} ${px + (data.length - 1) * step},${h - py}`;
  const ticks = [0, Math.floor(data.length / 2), data.length - 1];
  return (
    <div className="rounded-lg border border-card-border p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <polygon points={area} className="fill-accent/10" />
        <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" points={pts} />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        {ticks.map((i) => <span key={i}>{labels[i]}</span>)}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>Min: {min.toLocaleString()}</span>
        <span>Max: {max.toLocaleString()}</span>
      </div>
    </div>
  );
}

function BarChartSVG({ data, labels }: { data: number[]; labels: string[] }) {
  if (data.length < 2) return <p className="py-6 text-center text-sm text-muted">Not enough data.</p>;
  const w = 660, h = 100, px = 8, py = 10;
  const maxVal = Math.max(...data);
  const barW = Math.max(2, (w - px * 2) / data.length - 1);
  return (
    <div className="rounded-lg border border-card-border p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        {data.map((v, i) => {
          const x = px + i * ((w - px * 2) / data.length);
          const barH = maxVal > 0 ? ((h - py * 2) * v) / maxVal : 0;
          return <rect key={i} x={x} y={h - py - barH} width={barW} height={barH} rx={1} className="fill-accent/60" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export default function ReportPage(props: Props) {
  return (
    <LanguageProvider>
      <ReportContent {...props} />
    </LanguageProvider>
  );
}
