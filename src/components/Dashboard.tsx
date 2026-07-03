"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import KPICards from "@/components/KPICards";
import FilterPanel from "@/components/FilterPanel";
import MedianStats from "@/components/MedianStats";
import TransactionTable from "@/components/TransactionTable";
import Charts from "@/components/Charts";
import MapView from "@/components/MapView";
import PriceHistory from "@/components/PriceHistory";
import ContactSection from "@/components/ContactSection";
import ChatWidget from "@/components/ChatWidget";
import PageGuide from "@/components/PageGuide";
import Reveal from "@/components/ui/Reveal";
import InsightChips from "@/components/ui/InsightChips";
import Link from "next/link";
import { TrendingUp, ChevronRight } from "lucide-react";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import { FilterState, defaultFilters, applyFilters } from "@/lib/filters";
import { LanguageProvider, useT } from "@/i18n/LanguageContext";
import { buildMarketInsights } from "@/lib/analytics/insights";
import { latestDataMonthLabel } from "@/lib/data-freshness";

interface DashboardProps {
  initialDistrict?: string;
  initialProject?: string;
}

function DashboardContent({ initialDistrict = "", initialProject = "" }: DashboardProps) {
  const t = useT();
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilters,
    ...(initialDistrict ? { district: initialDistrict } : {}),
    ...(initialProject ? { project: initialProject } : {}),
  });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        // `cache: "no-cache"` forces the browser to revalidate with the
        // server; unchanged files return a cheap 304 via ETag but any
        // freshly-processed transactions.json is picked up immediately.
        const [txRes, hierRes] = await Promise.all([
          fetch("/data/transactions.json", { cache: "no-cache" }),
          fetch("/data/hierarchy.json", { cache: "no-cache" }),
        ]);

        if (!txRes.ok) throw new Error("Failed to load transaction data");
        if (!hierRes.ok) throw new Error("Failed to load hierarchy data");

        const [txJson, hierJson] = await Promise.all([
          txRes.json(),
          hierRes.json(),
        ]);

        if (cancelled) return;

        const decoded = decodeTransactions(txJson);
        setAllData(decoded);
        setHierarchy(hierJson as Hierarchy);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => applyFilters(allData, filters),
    [allData, filters]
  );

  const insights = useMemo(
    () => (allData.length && hierarchy ? buildMarketInsights(allData, hierarchy, { limit: 5 }) : []),
    [allData, hierarchy]
  );

  const freshness = useMemo(() => latestDataMonthLabel(allData), [allData]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
          <p className="text-sm text-muted">{t("loading_text")}</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="rounded-xl border border-negative/30 bg-negative/10 px-6 py-4">
            <p className="text-sm font-medium text-negative">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover"
          >
            {t("retry")}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8">
        <PageGuide
          storageKey="dashboard"
          title="Welcome to ADXBInteract — Abu Dhabi Real Estate Intelligence (DEMO)"
          description="This is a DEMO of an investor decision-support platform for Abu Dhabi real estate. The Dashboard below is the market-exploration surface — filter ADREC transactions any way you like. For momentum & recommendations, jump to Trends and Market Analysis in the nav."
          steps={[
            { icon: "🔍", text: "Filter ADREC closed-sale transactions by district, project, property type, bedrooms, date range, price, and more." },
            { icon: "📊", text: "KPI cards, median stats, price charts, map, and a full transaction table all update live with your filters." },
            { icon: "📈", text: "Open Trends (nav) for ranked project momentum — 10-day, 3/6/9/12-month windows, surging vs cooling cohorts." },
            { icon: "🎯", text: "Open Market Analysis (nav) for ranked Buy/Watch/Avoid recommendations with plain-English reasoning." },
            { icon: "🏠", text: "MLS Compare (nav) shows what PF/Bayut are asking vs what actually closed." },
            { icon: "💬", text: "THIS IS A DEMO — your feedback shapes the product. Please tell us what's useful, what's missing, and what you'd pay for." },
          ]}
          feedbackNote="Does this data help your investment decisions? What's the ONE feature that would make you sign up? Screenshot anything confusing and send it over."
        />

        {/* Hero */}
        <div className="animate-fade-in-up mb-6" id="dashboard">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t("hero_title")}
            </h1>
            {freshness && (
              <p className="text-xs text-muted">Data updated: {freshness}</p>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {t("hero_subtitle")}
          </p>
          <InsightChips insights={insights} className="mt-4" />
        </div>

        <div className="flex flex-col gap-6">
          {/* Filter Panel */}
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            transactionCount={filtered.length}
            hierarchy={hierarchy!}
          />

          {/* KPI Cards */}
          <KPICards filtered={filtered} total={allData} />

          {/* Median Stats */}
          <MedianStats data={filtered} filters={filters} />

          {/* Charts */}
          <Reveal><Charts data={filtered} /></Reveal>

          {/* Trends → dedicated /trends page */}
          <Link
            href="/trends"
            className="group flex items-center justify-between gap-4 rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 via-card-bg to-card-bg px-5 py-4 transition-colors hover:border-accent/50 hover-lift"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Trending projects & market momentum
                </p>
                <p className="text-xs text-muted">
                  Ranked transaction activity across 10d / 3mo / 6mo / 9mo / 12mo windows, with surging & cooling signals
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent">
              Open Trends
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Price History */}
          <Reveal><PriceHistory data={filtered} /></Reveal>

          {/* Map */}
          <Reveal><MapView data={filtered} /></Reveal>

          {/* Transaction Table */}
          <Reveal><TransactionTable data={filtered} /></Reveal>

          {/* Contact Section */}
          <ContactSection />
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-card-border py-8 text-center">
          <p className="text-sm font-semibold text-accent">{t("demo")}</p>
          <p className="mt-2 text-xs text-foreground">
            {t("created_by")} <span className="font-bold">{t("brand_name")}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("platform_name")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("data_source")}
          </p>
          {freshness && (
            <p className="mt-1 text-xs text-muted">Data updated: {freshness}</p>
          )}
        </footer>
      </main>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </>
  );
}

export default function Dashboard(props: DashboardProps) {
  return (
    <LanguageProvider>
      <DashboardContent {...props} />
    </LanguageProvider>
  );
}
