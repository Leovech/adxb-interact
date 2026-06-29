"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import PageGuide from "@/components/PageGuide";
import ContactSection from "@/components/ContactSection";
import FeedbackBox from "@/components/market/FeedbackBox";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import { buildListingGroups } from "@/lib/mls-data";
import { buildCohortSignals } from "@/lib/analytics/supply-demand";
import { buildProjectMomentum } from "@/lib/analytics/momentum";
import {
  buildRecommendations,
  Recommendation,
  RecommendationTag,
  TAG_LABELS,
  Verdict,
} from "@/lib/analytics/recommendations";
import {
  Loader2,
  MapPin,
  FileText,
  ExternalLink,
  CheckCircle2,
  Eye,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  Info,
} from "lucide-react";

type VerdictFilter = "all" | Verdict;

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

export default function MarketAnalysisPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [district, setDistrict] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("buy");
  const [refreshedAt, setRefreshedAt] = useState<string>("");

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
        setTransactions(decodeTransactions(txJson));
        setHierarchy(hierJson as Hierarchy);
        setRefreshedAt(new Date().toISOString());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Seed defaults from the logged-in user's preferences, once.
  useEffect(() => {
    if (!user) return;
    if (user.preferredDistricts[0] && !district) setDistrict(user.preferredDistricts[0]);
    if (user.preferredPropertyTypes[0] && !propertyType)
      setPropertyType(user.preferredPropertyTypes[0]);
    if (user.preferredBedrooms[0] && !bedrooms) setBedrooms(user.preferredBedrooms[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const listingGroups = useMemo(
    () => (transactions.length ? buildListingGroups(transactions) : []),
    [transactions]
  );
  const allSignals = useMemo(
    () => (transactions.length ? buildCohortSignals(transactions, listingGroups) : []),
    [transactions, listingGroups]
  );
  const allMomentum = useMemo(
    () => (transactions.length ? buildProjectMomentum(transactions) : []),
    [transactions]
  );

  const distressByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of listingGroups) m.set(g.key, g.distressCount);
    return m;
  }, [listingGroups]);

  const momentumByKey = useMemo(() => {
    const m = new Map();
    for (const p of allMomentum) m.set(`${p.project}|${p.bedrooms}`, p);
    return m;
  }, [allMomentum]);

  const scopedSignals = useMemo(
    () =>
      allSignals.filter((s) => {
        if (district && s.district !== district) return false;
        if (propertyType && s.propertyType !== propertyType) return false;
        if (bedrooms) {
          if (bedrooms === "6+") return s.bedrooms >= 6;
          if (s.bedrooms !== Number(bedrooms)) return false;
        }
        return true;
      }),
    [allSignals, district, propertyType, bedrooms]
  );

  const recommendations = useMemo(
    () =>
      buildRecommendations(scopedSignals, momentumByKey, {
        distressCountByKey: distressByKey,
        limit: 40,
      }),
    [scopedSignals, momentumByKey, distressByKey]
  );

  const filtered = useMemo(
    () =>
      verdictFilter === "all"
        ? recommendations
        : recommendations.filter((r) => r.verdict === verdictFilter),
    [recommendations, verdictFilter]
  );

  const countByVerdict = useMemo(() => {
    return {
      buy: recommendations.filter((r) => r.verdict === "buy").length,
      watch: recommendations.filter((r) => r.verdict === "watch").length,
      avoid: recommendations.filter((r) => r.verdict === "avoid").length,
    };
  }, [recommendations]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-muted">
            Running market analysis across Abu Dhabi project cohorts…
          </p>
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
          storageKey="market-analysis"
          title="Market Analysis — Ranked investor recommendations (DEMO)"
          description="This page combines closed-sale data (ADREC) with live listing supply (PF/Bayut) to surface the Abu Dhabi project-bedroom cohorts with the best current opportunity. Every recommendation explains its reasoning in plain numbers. DEMO — your thumbs-up/down trains the model."
          steps={[
            { icon: "🎯", text: "Cards are ranked by Opportunity Score (0-100). Higher = stronger combination of discount, demand, supply-tightness, momentum, and unit-type premium." },
            { icon: "🧠", text: "Each card shows the verdict (Buy / Watch / Avoid) with plain-English reasoning anchored in real numbers." },
            { icon: "🔎", text: "Use filters to scope to your investment thesis: district, property type, bedrooms, verdict." },
            { icon: "👍", text: "Thumbs-up / thumbs-down on any card — with an optional comment — helps us tune the scoring. Your feedback is the most valuable signal." },
            { icon: "📄", text: "Click 'Open Investor Report' on any card for a full printable brief you can share with clients." },
            { icon: "💬", text: "DEMO — does this surface opportunities you'd actually pursue? What's missing? All feedback shapes the product." },
          ]}
          feedbackNote="The recommendation logic is rule-based for now. If it's consistently surfacing or hiding the wrong projects, that's the most important thing you can tell us."
        />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Market Analysis</h1>
            <p className="mt-1 text-sm text-muted">
              Ranked opportunities combining ADREC transactions with live PF/Bayut supply
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted">
            <RefreshCw className="h-3 w-3 text-accent" />
            Refreshed {refreshedAt ? new Date(refreshedAt).toLocaleString() : "—"}
            <span className="mx-1 text-muted/50">·</span>
            <span>Auto-refresh: daily</span>
          </div>
        </div>

        {/* Filter + verdict toggle */}
        <div className="mb-6 overflow-hidden rounded-xl border border-card-border bg-card-bg">
          <div className="grid grid-cols-1 gap-3 border-b border-card-border px-5 py-4 sm:grid-cols-3">
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

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Verdict:
              </span>
              {(["buy", "watch", "avoid", "all"] as VerdictFilter[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVerdictFilter(v)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                    verdictFilter === v
                      ? "border-accent bg-accent text-background"
                      : "border-card-border bg-card-bg text-muted hover:border-accent/50 hover:text-foreground"
                  }`}
                >
                  {v === "buy" && `Buy (${countByVerdict.buy})`}
                  {v === "watch" && `Watch (${countByVerdict.watch})`}
                  {v === "avoid" && `Avoid (${countByVerdict.avoid})`}
                  {v === "all" && `All (${recommendations.length})`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">
              Showing top {filtered.length} cohort{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mb-5 flex items-start gap-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="text-xs leading-relaxed text-foreground">
            <span className="font-semibold">Rule-based recommendation engine.</span>
            <p className="mt-0.5 text-muted">
              The Opportunity Score combines price discount (30%), demand momentum (25%),
              supply tightness (20%), raw momentum bonus (15%), and unit-type spread (10%).
              Tuning weights happens in one file (<code className="rounded bg-input-bg px-1 py-0.5 text-[10px]">lib/analytics/recommendations.ts</code>).
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-card-border bg-card-bg px-6 py-12 text-center">
            <p className="text-sm text-muted">
              No {verdictFilter === "all" ? "" : verdictFilter} recommendations match this filter.
              Try widening your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filtered.map((r) => (
              <RecommendationCard key={r.key} rec={r} />
            ))}
          </div>
        )}

        <ContactSection />
      </main>
    </>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const verdictStyle =
    rec.verdict === "buy"
      ? "border-positive/40 bg-positive/5"
      : rec.verdict === "avoid"
      ? "border-negative/40 bg-negative/5"
      : "border-accent/40 bg-accent/5";

  const VerdictIcon =
    rec.verdict === "buy" ? CheckCircle2 : rec.verdict === "avoid" ? XCircle : Eye;
  const verdictColor =
    rec.verdict === "buy" ? "text-positive" : rec.verdict === "avoid" ? "text-negative" : "text-accent";

  return (
    <article className={`overflow-hidden rounded-xl border hover-lift ${verdictStyle}`}>
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_260px]">
        <div className="bg-card-bg p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className={`mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${verdictColor}`}>
                <VerdictIcon className="h-3 w-3" />
                Verdict: {rec.verdict}
              </div>
              <h3 className="text-lg font-bold text-foreground">{rec.headline}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3 w-3" /> {rec.district} · {rec.propertyType}
              </p>
            </div>
            <ScorePill score={rec.opportunityScore} />
          </div>

          {rec.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rec.tags.map((t) => (
                <TagPill key={t} tag={t} />
              ))}
            </div>
          )}

          <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-foreground">
            {rec.reasoning.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{b.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`/mls/report?project=${encodeURIComponent(rec.project)}&bedrooms=${rec.bedrooms}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20"
            >
              <FileText className="h-3.5 w-3.5" />
              Investor report
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href={`/mls?project=${encodeURIComponent(rec.project)}&bedrooms=${rec.bedrooms}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-xs font-semibold text-foreground hover:border-accent/40"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              See on MLS Compare
            </a>
          </div>
        </div>

        <div className="border-t border-card-border bg-background/40 p-4 lg:border-l lg:border-t-0">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted">
            Signals
          </p>
          <Signal label="Closed-sale median" value={formatAED(rec.signals.projectMedianPrice)} />
          <Signal label="Area closed median" value={formatAED(rec.signals.areaBedroomsMedianPrice)} />
          <Signal
            label="Discount"
            value={`${rec.signals.priceDiscountPct >= 0 ? "-" : "+"}${Math.abs(rec.signals.priceDiscountPct).toFixed(1)}%`}
            accent={rec.signals.priceDiscountPct >= 15 ? "positive" : rec.signals.priceDiscountPct <= -5 ? "negative" : undefined}
          />
          <Signal label="Tx / month (90d)" value={rec.signals.txPerMonth90d.toString()} />
          <Signal label="Active listings" value={rec.signals.activeListings.toString()} />
          <Signal
            label="Inventory months"
            value={rec.signals.inventoryMonths >= 99 ? "—" : rec.signals.inventoryMonths.toString()}
            accent={rec.signals.inventoryMonths <= 3 ? "positive" : rec.signals.inventoryMonths >= 12 ? "negative" : undefined}
          />
          {rec.momentum && (
            <Signal
              label="Momentum 3mo"
              value={`${rec.momentum.momentum["3mo"].toFixed(2)}×`}
              accent={rec.momentum.momentum["3mo"] >= 1.3 ? "positive" : rec.momentum.momentum["3mo"] <= 0.6 ? "negative" : undefined}
            />
          )}

          <div className="mt-4">
            <FeedbackBox
              itemKey={rec.key}
              context={{
                project: rec.project,
                bedrooms: rec.bedrooms,
                verdict: rec.verdict,
                score: rec.opportunityScore,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function Signal({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  const accentClass =
    accent === "positive" ? "text-positive" : accent === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-card-border/50 py-1 last:border-0">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`text-sm font-semibold ${accentClass}`}>{value}</span>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 70
      ? "border-positive/40 bg-positive/10 text-positive"
      : score >= 50
      ? "border-accent/40 bg-accent/10 text-accent"
      : "border-negative/30 bg-negative/10 text-negative";
  return (
    <div className={`rounded-xl border px-3 py-2 text-right ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Opportunity</p>
      <p className="text-2xl font-bold leading-none">{score}</p>
    </div>
  );
}

function TagPill({ tag }: { tag: RecommendationTag }) {
  const styles: Record<RecommendationTag, string> = {
    undervalued: "bg-positive/15 text-positive",
    high_demand: "bg-negative/15 text-negative",
    tight_supply: "bg-accent/15 text-accent",
    oversupplied: "bg-muted/15 text-muted",
    best_unit_type: "bg-accent/15 text-accent",
    distressed_inventory: "bg-positive/15 text-positive",
    thin_liquidity: "bg-negative/10 text-negative",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[tag]}`}>
      {TAG_LABELS[tag]}
    </span>
  );
}

