"use client";

/**
 * Investor Report page.
 *
 * Loads the same ADREC + MLS data the /mls page uses, finds the requested
 * project + bedroom group, derives the investor metrics via
 * `buildInvestorReport`, and renders a printable one-page brief.
 *
 * The print stylesheet (in globals.css under the `@media print` rule) hides
 * the header, chat widget, and the back/print buttons so the printed PDF
 * comes out clean.
 */

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { LanguageProvider } from "@/i18n/LanguageContext";
import PageGuide from "@/components/PageGuide";
import {
  Transaction,
  decodeTransactions,
} from "@/data/abu-dhabi";
import {
  buildListingGroups,
  buildListingUrl,
  ListingGroup,
} from "@/lib/mls-data";
import {
  buildInvestorReport,
  InvestorReport,
  MonthlyPoint,
} from "@/lib/investor-report";
import {
  ArrowLeft,
  Printer,
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

interface Props {
  project: string;
  bedrooms: number;
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatFullAED(n: number): string {
  return `AED ${n.toLocaleString()}`;
}

function ReportContent({ project, bedrooms }: Props) {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<ListingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // no-cache so the report reflects the latest transactions on disk.
        const txRes = await fetch("/data/transactions.json", { cache: "no-cache" });
        if (!txRes.ok) throw new Error("Failed to load transaction data");
        const txJson = await txRes.json();
        if (cancelled) return;
        const decoded = decodeTransactions(txJson);
        setAllData(decoded);
        setGroups(buildListingGroups(decoded));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const group = useMemo(
    () => groups.find((g) => g.project === project && g.bedrooms === bedrooms),
    [groups, project, bedrooms]
  );

  const report = useMemo<InvestorReport | null>(
    () => (group ? buildInvestorReport(group, allData) : null),
    [group, allData]
  );

  if (!project) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">Missing project</h1>
          <p className="mt-2 text-sm text-muted">
            Open this report from a project card on the MLS page.
          </p>
          <a
            href="/mls"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            <ArrowLeft className="h-4 w-4" /> Back to MLS Compare
          </a>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-muted">Building investor report…</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-sm text-negative">{error}</p>
        </div>
      </>
    );
  }

  if (!group || !report) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            No report data for {project} ({bedrooms === 0 ? "Studio" : `${bedrooms} BR`})
          </h1>
          <p className="mt-2 text-sm text-muted">
            We have no MLS comparison rows for this project + bedroom config.
            Try a different project from the MLS Compare page.
          </p>
          <a
            href="/mls"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            <ArrowLeft className="h-4 w-4" /> Back to MLS Compare
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="print:hidden">
        <Header />
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 lg:px-0">
        <PageGuide
          storageKey="report"
          title="Investor Property Report (DEMO)"
          description="This is a DEMO one-page investment brief generated from ADREC closed-sale data + modelled MLS listings. It gives you a snapshot: market position, price trend, rental yield estimate, distress deals, and an auto-generated buy/watch/avoid verdict. We need your feedback to make this useful for real investment decisions!"
          steps={[
            { icon: "📊", text: "The top section shows the verdict (Buy / Watch / Avoid) and the key stats: asking vs recent-market median, premium %, and estimated rental yield." },
            { icon: "📈", text: "Scroll down for the 12-month price trend chart, liquidity metrics (how many units trade per month), and the best deals currently below market." },
            { icon: "🖨️", text: "Click 'Print / Save as PDF' to get a clean one-page brief you can share with clients or use in presentations. The guide and toolbar are hidden in the PDF." },
            { icon: "🔗", text: "Use the PF / Bayut buttons at the bottom to browse live listings for this exact project + bedroom configuration." },
            { icon: "💬", text: "THIS IS A DEMO — Is this the kind of report you'd actually use? What numbers matter most? What's missing? Tell us!" },
          ]}
          feedbackNote="Would you send this to a client? What would you add or remove? Does the yield estimate feel realistic for this area? All feedback is gold."
        />

        {/* Toolbar (hidden in print) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a
            href="/mls"
            className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm font-medium text-foreground hover:border-accent/50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to MLS Compare
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
        </div>

        {/* Printable card */}
        <article className="report-sheet rounded-2xl border border-card-border bg-card-bg p-6 print:rounded-none print:border-0 print:p-0">
          <ReportHeader report={report} />
          <ThesisBanner thesis={report.thesis} />

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Asking median" value={formatAED(report.askPriceMedianAED)} sub={`${report.askRateMedian.toLocaleString()} AED/sqft`} />
            <Stat
              label={`Recent market (${report.recentWindowMonths}mo)`}
              value={formatAED(report.marketPriceMedianAED)}
              sub={`${report.marketRateMedian.toLocaleString()} AED/sqft · n=${report.recentTxCount}`}
            />
            <Stat
              label="Premium vs recent"
              value={`${report.premiumPct >= 0 ? "+" : ""}${report.premiumPct.toFixed(1)}%`}
              sub={report.premiumPct < 0 ? "Buyer's edge" : "Seller's market"}
              accent={report.premiumPct < 0 ? "positive" : report.premiumPct > 8 ? "negative" : undefined}
            />
            <Stat
              label={`Modelled gross yield (${report.yieldEstimate.confidence})`}
              value={`${report.yieldEstimate.grossPct.toFixed(1)}%`}
              sub={`~${formatAED(report.yieldEstimate.monthlyRentAED)} AED/month`}
              accent="positive"
            />
          </div>

          {/* Recent vs historical drift — lets a reader see if the market has
              moved fast enough that the 24mo median is misleading on its own. */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            <div className="rounded-lg border border-card-border bg-background/40 p-2.5 print:bg-transparent">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                24-month median
              </p>
              <p className="mt-0.5 text-sm font-semibold text-muted">
                {formatAED(report.historicalPriceMedianAED)} · {report.historicalRateMedian.toLocaleString()} AED/sqft
              </p>
            </div>
            {report.historicalRateMedian > 0 && (() => {
              const driftPct =
                ((report.marketRateMedian - report.historicalRateMedian) /
                  report.historicalRateMedian) * 100;
              const driftColor =
                Math.abs(driftPct) < 5
                  ? "text-foreground"
                  : driftPct > 0
                  ? "text-positive"
                  : "text-negative";
              return (
                <div className="rounded-lg border border-card-border bg-background/40 p-2.5 md:col-span-3 print:bg-transparent">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Market drift ({report.recentWindowMonths}mo vs 24mo)
                  </p>
                  <p className={`mt-0.5 text-sm font-semibold ${driftColor}`}>
                    {driftPct >= 0 ? "+" : ""}{driftPct.toFixed(1)}%
                    <span className="ms-2 font-normal text-muted">
                      {Math.abs(driftPct) >= 10
                        ? "— fast-moving market, 24mo median is stale"
                        : Math.abs(driftPct) >= 5
                        ? "— meaningful drift"
                        : "— stable, 24mo median is a good anchor"}
                    </span>
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Section title="Liquidity" icon={<Calendar className="h-4 w-4 text-accent" />}>
              <KV label="Transactions, last 24mo" value={report.txLast24mo.toLocaleString()} />
              <KV label="Per-month average" value={`${report.txPerMonth} / mo`} />
              <KV label="Most recent ADREC sale" value={report.adrecLastDate} />
              <KV label="Typical unit size" value={`${report.typicalSizeSqft.toLocaleString()} sqft`} />
            </Section>
            <Section title="Inventory" icon={<Building2 className="h-4 w-4 text-accent" />}>
              <KV label="Active listings" value={report.totalListings.toLocaleString()} />
              <KV label="Property Finder" value={`${report.pfCount}`} />
              <KV label="Bayut" value={`${report.bayutCount}`} />
              <KV
                label={`Distress (≥${report.distressThresholdPct.toFixed(0)}% below market)`}
                value={`${report.distressCount}`}
                accent={report.distressCount > 0 ? "negative" : undefined}
              />
            </Section>
          </div>

          <Section
            title="Price trend (last 12 months)"
            icon={<TrendingUp className="h-4 w-4 text-accent" />}
            className="mt-6"
          >
            <PriceTrendChart trend={report.trend} />
          </Section>

          <Section
            title={`Best deals on the market right now (${report.bestDeals.length})`}
            icon={<Sparkles className="h-4 w-4 text-accent" />}
            className="mt-6"
          >
            {report.bestDeals.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No distress inventory at the {report.distressThresholdPct.toFixed(0)}% threshold.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted">
                  <tr className="border-b border-card-border">
                    <th className="py-2 text-left font-semibold">Platform</th>
                    <th className="py-2 text-left font-semibold">Size</th>
                    <th className="py-2 text-right font-semibold">Asking</th>
                    <th className="py-2 text-right font-semibold">vs market</th>
                    <th className="py-2 text-right font-semibold">Est. saving</th>
                    <th className="py-2 text-right font-semibold print:hidden">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bestDeals.map((row) => (
                    <tr key={row.listing.id} className="border-b border-card-border/50 last:border-0">
                      <td className="py-2 text-foreground">
                        {row.listing.platform === "propertyfinder" ? "PF" : "BAYUT"}
                      </td>
                      <td className="py-2 text-foreground">{row.listing.sizeSqft.toLocaleString()} sqft</td>
                      <td className="py-2 text-right font-semibold text-foreground">{formatFullAED(row.listing.askingPrice)}</td>
                      <td className="py-2 text-right font-bold text-negative">{row.discountPct.toFixed(1)}%</td>
                      <td className="py-2 text-right text-positive">{formatFullAED(row.estimatedSavingAED)}</td>
                      <td className="py-2 text-right print:hidden">
                        <a
                          href={row.listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section
            title="Yield model"
            icon={<TrendingUp className="h-4 w-4 text-accent" />}
            className="mt-6"
          >
            <p className="text-sm text-foreground">
              <strong>{report.yieldEstimate.grossPct.toFixed(1)}% gross</strong> · est. monthly rent{" "}
              <strong>{formatFullAED(report.yieldEstimate.monthlyRentAED)}</strong> · confidence{" "}
              <span className={
                report.yieldEstimate.confidence === "high" ? "text-positive" :
                report.yieldEstimate.confidence === "medium" ? "text-foreground" : "text-muted"
              }>
                {report.yieldEstimate.confidence}
              </span>
            </p>
            <p className="mt-2 text-xs text-muted">{report.yieldEstimate.basis}</p>
          </Section>

          {/* Action row — hidden in print */}
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden">
            <a
              href={buildListingUrl("propertyfinder", group.project, group.district, group.bedrooms, group.propertyType)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#EF4036]/40 bg-[#EF4036]/10 py-2.5 text-sm font-semibold text-[#EF4036]"
            >
              Browse on Property Finder <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={buildListingUrl("bayut", group.project, group.district, group.bedrooms, group.propertyType)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#00C48C]/40 bg-[#00C48C]/10 py-2.5 text-sm font-semibold text-[#00C48C]"
            >
              Browse on Bayut <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="/mls"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-bg py-2.5 text-sm font-semibold text-foreground"
            >
              Compare another project <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            </a>
          </div>

          <ReportFooter report={report} />
        </article>
      </main>
    </>
  );
}

function ReportHeader({ report }: { report: InvestorReport }) {
  return (
    <header className="border-b border-card-border pb-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
        <Eye className="h-3 w-3" />
        Investor Property Report
      </div>
      <h1 className="mt-2 text-2xl font-bold text-foreground">{report.project}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {report.district}
        </span>
        <span>·</span>
        <span>{report.propertyType}</span>
        <span>·</span>
        <span>{report.bedrooms === 0 ? "Studio" : `${report.bedrooms} bedroom`}</span>
      </p>
    </header>
  );
}

function ThesisBanner({ thesis }: { thesis: InvestorReport["thesis"] }) {
  const verdictStyle =
    thesis.verdict === "buy"
      ? "border-positive/40 bg-positive/10 text-positive"
      : thesis.verdict === "avoid"
      ? "border-negative/40 bg-negative/10 text-negative"
      : "border-accent/40 bg-accent/10 text-accent";
  const VerdictIcon =
    thesis.verdict === "buy" ? CheckCircle2 :
    thesis.verdict === "avoid" ? XCircle : Eye;

  return (
    <div className={`mt-4 rounded-xl border ${verdictStyle} p-4`}>
      <div className="flex items-center gap-3">
        <VerdictIcon className="h-6 w-6 shrink-0" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Verdict: {thesis.verdict}</p>
          <p className="text-base font-semibold">{thesis.headline}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-foreground">
        {thesis.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted">·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title, icon, children, className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-card-border bg-background/40 p-4 print:bg-transparent ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "positive" | "negative";
}) {
  const accentClass = accent === "negative" ? "text-negative" : accent === "positive" ? "text-positive" : "text-foreground";
  return (
    <div className="rounded-xl border border-card-border bg-background/40 p-3 print:bg-transparent">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accentClass}`}>{value}</p>
      <p className="text-[11px] text-muted">{sub}</p>
    </div>
  );
}

function KV({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  const accentClass = accent === "negative" ? "text-negative" : accent === "positive" ? "text-positive" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-card-border/50 py-1.5 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-sm font-semibold ${accentClass}`}>{value}</span>
    </div>
  );
}

/**
 * Tiny inline SVG sparkline of monthly median rate. Avoids pulling in
 * recharts on the report page so print weight stays small.
 */
function PriceTrendChart({ trend }: { trend: MonthlyPoint[] }) {
  if (trend.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-muted">Not enough recent transactions to plot a trend.</p>;
  }
  const w = 600;
  const h = 120;
  const padX = 8;
  const padY = 12;
  const rates = trend.map((p) => p.medianRate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = Math.max(1, max - min);
  const stepX = trend.length > 1 ? (w - padX * 2) / (trend.length - 1) : 0;

  const points = trend
    .map((p, i) => {
      const x = padX + i * stepX;
      const y = padY + (h - padY * 2) * (1 - (p.medianRate - min) / span);
      return `${x},${y}`;
    })
    .join(" ");

  const first = trend[0].medianRate;
  const last = trend[trend.length - 1].medianRate;
  const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const Trend = deltaPct >= 0 ? TrendingUp : TrendingDown;
  const trendColor = deltaPct >= 0 ? "text-positive" : "text-negative";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted">{trend[0].month} → {trend[trend.length - 1].month}</span>
        <span className={`inline-flex items-center gap-1 font-semibold ${trendColor}`}>
          <Trend className="h-3.5 w-3.5" />
          {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}% AED/sqft
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
          points={points}
        />
        {trend.map((p, i) => {
          const x = padX + i * stepX;
          const y = padY + (h - padY * 2) * (1 - (p.medianRate - min) / span);
          return <circle key={i} cx={x} cy={y} r={2.5} className="fill-accent" />;
        })}
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted">
        <div>Min: <span className="text-foreground">{min.toLocaleString()}</span></div>
        <div className="text-center">Max: <span className="text-foreground">{max.toLocaleString()}</span></div>
        <div className="text-right">{trend.reduce((s, p) => s + p.txCount, 0)} tx</div>
      </div>
    </div>
  );
}

function ReportFooter({ report }: { report: InvestorReport }) {
  const ts = new Date(report.generatedAt);
  return (
    <footer className="mt-6 border-t border-card-border pt-4 text-[11px] text-muted">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          Generated {ts.toLocaleString()} · ADREC data through {report.adrecLastDate}
        </span>
        <span>ADXBInteract · Sand Square Group</span>
      </div>
      <p className="mt-2 leading-relaxed">
        <AlertTriangle className="me-1 inline h-3 w-3" />
        Asking-price comparables are sample listings derived from ADREC medians; live PF/Bayut deep-links
        let you verify in-app. Yield is modelled, not appraised. Not financial advice.
      </p>
    </footer>
  );
}

export default function InvestorReportPage(props: Props) {
  return (
    <LanguageProvider>
      <ReportContent {...props} />
    </LanguageProvider>
  );
}
