"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import KPICards from "@/components/KPICards";
import FilterPanel from "@/components/FilterPanel";
import MedianStats from "@/components/MedianStats";
import TransactionTable from "@/components/TransactionTable";
import Charts from "@/components/Charts";
import TrendyProjects from "@/components/TrendyProjects";
import MapView from "@/components/MapView";
import PriceHistory from "@/components/PriceHistory";
import ContactSection from "@/components/ContactSection";
import ChatWidget from "@/components/ChatWidget";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import { FilterState, defaultFilters, applyFilters } from "@/lib/filters";
import { LanguageProvider, useT } from "@/i18n/LanguageContext";

function DashboardContent() {
  const t = useT();
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

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
        {/* Hero */}
        <div className="mb-6" id="dashboard">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("hero_title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("hero_subtitle")}
          </p>
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
          <Charts data={filtered} />

          {/* Trendy Projects */}
          <TrendyProjects data={filtered} />

          {/* Price History */}
          <PriceHistory data={filtered} />

          {/* Map */}
          <MapView data={filtered} />

          {/* Transaction Table */}
          <TransactionTable data={filtered} />

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
        </footer>
      </main>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </>
  );
}

export default function Dashboard() {
  return (
    <LanguageProvider>
      <DashboardContent />
    </LanguageProvider>
  );
}
