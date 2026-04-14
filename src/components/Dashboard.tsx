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
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import { FilterState, defaultFilters, applyFilters } from "@/lib/filters";

export default function Dashboard() {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [txRes, hierRes] = await Promise.all([
          fetch("/data/transactions.json"),
          fetch("/data/hierarchy.json"),
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
          <p className="text-sm text-muted">Loading ADREC transaction data...</p>
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
            Retry
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
            Abu Dhabi Real Estate Market
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live transaction data, trends, and analytics powered by ADREC
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
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-card-border py-8 text-center">
          <p className="text-sm font-semibold text-accent">DEMO</p>
          <p className="mt-2 text-xs text-foreground">
            Created by <span className="font-bold">Sand Square Group</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            ADXBInteract &mdash; Abu Dhabi Real Estate Intelligence Platform
          </p>
          <p className="mt-1 text-xs text-muted">
            Data sourced from ADREC (Abu Dhabi Real Estate Centre) &bull; For
            informational purposes only
          </p>
        </footer>
      </main>
    </>
  );
}
