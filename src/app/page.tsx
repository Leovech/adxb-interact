"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import KPICards from "@/components/KPICards";
import FilterPanel from "@/components/FilterPanel";
import MedianStats from "@/components/MedianStats";
import TransactionTable from "@/components/TransactionTable";
import Charts from "@/components/Charts";
import TrendyProjects from "@/components/TrendyProjects";
import MapView from "@/components/MapView";
import PriceHistory from "@/components/PriceHistory";
import { transactions } from "@/data/abu-dhabi";
import { FilterState, defaultFilters, applyFilters } from "@/lib/filters";

export default function Home() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const filtered = useMemo(() => applyFilters(transactions, filters), [filters]);

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
          {/* Filter Panel - now first for easy searching */}
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            transactionCount={filtered.length}
          />

          {/* KPI Cards */}
          <KPICards filtered={filtered} total={transactions} />

          {/* Median Stats - dynamic based on filters */}
          <MedianStats data={filtered} filters={filters} />

          {/* Charts */}
          <Charts data={filtered} />

          {/* Trendy Projects - top projects by month */}
          <TrendyProjects data={filtered} />

          {/* Price History - repeat sales tracker */}
          <PriceHistory data={filtered} />

          {/* Map */}
          <MapView data={filtered} />

          {/* Transaction Table */}
          <TransactionTable data={filtered} />
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-card-border py-8 text-center">
          <p className="text-sm font-semibold text-accent">
            DEMO
          </p>
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
