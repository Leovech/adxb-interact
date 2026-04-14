"use client";

import {
  areas,
  getProjectsForArea,
  getBuildingsForProject,
} from "@/data/abu-dhabi";
import { FilterState, DatePreset, defaultFilters } from "@/lib/filters";
import { Filter, RotateCcw, Calendar, Search } from "lucide-react";
import { useState, useMemo } from "react";

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  transactionCount: number;
}

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "Q" },
  { value: "this_year", label: "This Year" },
  { value: "last_month", label: "Last Month" },
  { value: "last_quarter", label: "Last Q" },
  { value: "last_year", label: "Last Year" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
];

const propertyTypeOptions = [
  { value: "", label: "All" },
  { value: "Apartment", label: "Unit" },
  { value: "Villa", label: "Villa" },
  { value: "Townhouse", label: "Townhouse" },
  { value: "Penthouse", label: "Penthouse" },
  { value: "Land", label: "Land" },
  { value: "Office", label: "Office" },
  { value: "Retail", label: "Retail" },
];

const dealTypeOptions = [
  { value: "", label: "All" },
  { value: "Sale", label: "Sale" },
  { value: "Rental", label: "Rent" },
];

const statusOptions = [
  { value: "", label: "All" },
  { value: "Ready", label: "Ready" },
  { value: "Off-Plan", label: "Off-Plan" },
];

const paymentOptions = [
  { value: "", label: "All" },
  { value: "Cash", label: "Cash" },
  { value: "Mortgage", label: "Mortgage" },
];

const developers = [
  "Aldar Properties",
  "Bloom Properties",
  "Mubadala",
  "IMKAN Properties",
  "Reportage Properties",
  "Al Barakah International Investment",
  "Tamouh Investments",
  "Reem Developers",
  "Q Properties",
  "Dar Al Arkan",
];

function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              value === opt.value
                ? "bg-accent text-background shadow-sm shadow-accent/25"
                : "bg-input-bg text-muted hover:bg-input-border hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterPanel({
  filters,
  onChange,
  transactionCount,
}: FilterPanelProps) {
  const [showRanges, setShowRanges] = useState(false);

  const projects = useMemo(
    () => (filters.areaId ? getProjectsForArea(filters.areaId) : []),
    [filters.areaId]
  );
  const buildings = useMemo(
    () => (filters.projectId ? getBuildingsForProject(filters.projectId) : []),
    [filters.projectId]
  );

  const update = (partial: Partial<FilterState>) => {
    const next = { ...filters, ...partial };
    if (partial.areaId !== undefined) {
      next.projectId = "";
      next.buildingId = "";
    }
    if (partial.projectId !== undefined) {
      next.buildingId = "";
    }
    onChange(next);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) =>
      val !== "" && val !== defaultFilters[key as keyof FilterState]
  ).length;

  const selectClass =
    "w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30";
  const inputClass = selectClass;

  return (
    <div className="rounded-xl border border-card-border bg-card-bg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Search className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Search Transactions
            </h2>
            <p className="text-xs text-muted">
              {transactionCount.toLocaleString()} results
              {activeFilterCount > 0 && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  {activeFilterCount} filters
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => onChange(defaultFilters)}
          className="flex items-center gap-1.5 rounded-lg border border-input-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-negative hover:text-negative"
        >
          <RotateCcw className="h-3 w-3" />
          Clear All
        </button>
      </div>

      {/* Property Type Pills */}
      <div className="border-b border-card-border px-5 py-4">
        <PillGroup
          label="Property Type"
          options={propertyTypeOptions}
          value={filters.propertyType}
          onChange={(v) => update({ propertyType: v })}
        />
      </div>

      {/* Deal Type + Status + Payment - side by side pills */}
      <div className="grid grid-cols-1 gap-4 border-b border-card-border px-5 py-4 sm:grid-cols-3">
        <PillGroup
          label="Deal Type"
          options={dealTypeOptions}
          value={filters.transactionType}
          onChange={(v) => update({ transactionType: v })}
        />
        <PillGroup
          label="Status"
          options={statusOptions}
          value={filters.status}
          onChange={(v) => update({ status: v })}
        />
        <PillGroup
          label="Payment"
          options={paymentOptions}
          value={filters.paymentMethod}
          onChange={(v) => update({ paymentMethod: v })}
        />
      </div>

      {/* Location: Area → Project → Building */}
      <div className="border-b border-card-border px-5 py-4">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Location
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={filters.areaId}
            onChange={(e) => update({ areaId: e.target.value })}
            className={selectClass}
          >
            <option value="">All Areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={filters.projectId}
            onChange={(e) => update({ projectId: e.target.value })}
            className={selectClass}
            disabled={!filters.areaId}
          >
            <option value="">{filters.areaId ? "All Projects" : "Select Area First"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={filters.buildingId}
            onChange={(e) => update({ buildingId: e.target.value })}
            className={selectClass}
            disabled={!filters.projectId}
          >
            <option value="">{filters.projectId ? "All Buildings" : "Select Project First"}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Presets */}
      <div className="border-b border-card-border px-5 py-4">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          <Calendar className="mr-1 inline h-3 w-3" />
          Time Period
        </label>
        <div className="flex flex-wrap gap-1.5">
          {datePresets.map((p) => (
            <button
              key={p.value}
              onClick={() => update({ datePreset: p.value })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                filters.datePreset === p.value
                  ? "bg-accent text-background shadow-sm shadow-accent/25"
                  : "bg-input-bg text-muted hover:bg-input-border hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {filters.datePreset === "custom" && (
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => update({ dateFrom: e.target.value })}
                className={inputClass + " w-40"}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => update({ dateTo: e.target.value })}
                className={inputClass + " w-40"}
              />
            </div>
          </div>
        )}
      </div>

      {/* Price, Size, Bedrooms, Developer */}
      <div className="px-5 py-4">
        <button
          onClick={() => setShowRanges(!showRanges)}
          className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-accent hover:underline"
        >
          {showRanges ? "- Hide" : "+ Show"} Price, Size, Bedrooms & Developer
        </button>
        {showRanges && (
          <div className="animate-fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Price Range */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Price (AED)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin}
                  onChange={(e) => update({ priceMin: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax}
                  onChange={(e) => update({ priceMax: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            {/* Size */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Size (sqft)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.sizeMin}
                  onChange={(e) => update({ sizeMin: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.sizeMax}
                  onChange={(e) => update({ sizeMax: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            {/* Bedrooms */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Bedrooms
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="9"
                  placeholder="Min"
                  value={filters.bedroomsMin}
                  onChange={(e) => update({ bedroomsMin: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  max="9"
                  placeholder="Max"
                  value={filters.bedroomsMax}
                  onChange={(e) => update({ bedroomsMax: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            {/* Developer */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Developer
              </label>
              <select
                value={filters.developer}
                onChange={(e) => update({ developer: e.target.value })}
                className={selectClass}
              >
                <option value="">All Developers</option>
                {developers.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
