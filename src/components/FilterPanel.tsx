"use client";

import { getProjectsForDistrict, Hierarchy } from "@/data/abu-dhabi";
import { FilterState, DatePreset, defaultFilters } from "@/lib/filters";
import { RotateCcw, Calendar, Search, ChevronDown, MapPin, Building2 } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  transactionCount: number;
  hierarchy: Hierarchy;
}

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
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
  { value: "Apartment", label: "Apartment" },
  { value: "Villa", label: "Villa" },
  { value: "Townhouse", label: "Townhouse" },
  { value: "Duplex", label: "Duplex" },
  { value: "Land", label: "Land" },
  { value: "Penthouse", label: "Penthouse" },
  { value: "Office", label: "Office" },
  { value: "Retail", label: "Retail" },
  { value: "Other", label: "Other" },
];

const statusOptions = [
  { value: "", label: "All" },
  { value: "Off-Plan", label: "Off-Plan" },
  { value: "Ready", label: "Ready" },
];

const sequenceOptions = [
  { value: "", label: "All" },
  { value: "Primary", label: "Primary (First Sale)" },
  { value: "Secondary", label: "Secondary (Resale)" },
];

const assetClassOptions = [
  { value: "", label: "All" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "agricultural", label: "Agricultural" },
  { value: "other", label: "Other" },
];

const bedroomOptions = [
  { value: "", label: "All" },
  { value: "0", label: "Studio" },
  { value: "1", label: "1BR" },
  { value: "2", label: "2BR" },
  { value: "3", label: "3BR" },
  { value: "4", label: "4BR" },
  { value: "5", label: "5BR" },
  { value: "6+", label: "6+BR" },
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
  hierarchy,
}: FilterPanelProps) {
  const [showRanges, setShowRanges] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortedDistricts = useMemo(
    () => [...hierarchy.districts].sort((a, b) => a.name.localeCompare(b.name)),
    [hierarchy.districts]
  );

  const projectsForDistrict = useMemo(
    () =>
      filters.district
        ? getProjectsForDistrict(hierarchy, filters.district).sort(
            (a, b) => a.name.localeCompare(b.name)
          )
        : [],
    [hierarchy, filters.district]
  );

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    const q = filters.searchQuery.toLowerCase().trim();
    if (q.length < 2) return { districts: [], projects: [] };

    const matchedDistricts = hierarchy.districts
      .filter((d) => d.name.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const matchedProjects = hierarchy.projects
      .filter((p) => p.name.toLowerCase().includes(q) || p.district.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { districts: matchedDistricts, projects: matchedProjects };
  }, [filters.searchQuery, hierarchy]);

  const showDropdown =
    searchFocused &&
    filters.searchQuery.length >= 2 &&
    (suggestions.districts.length > 0 || suggestions.projects.length > 0);

  const update = (partial: Partial<FilterState>) => {
    const next = { ...filters, ...partial };
    if (partial.district !== undefined) {
      next.project = "";
    }
    onChange(next);
  };

  const selectDistrict = (name: string) => {
    update({ district: name, searchQuery: "" });
    setSearchFocused(false);
  };

  const selectProject = (projectName: string, districtName: string) => {
    update({ district: districtName, project: projectName, searchQuery: "" });
    setSearchFocused(false);
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

      {/* Search Box with Autocomplete */}
      <div className="border-b border-card-border px-5 py-4">
        <div className="relative" ref={searchRef}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search district, project, community..."
            value={filters.searchQuery}
            onChange={(e) => update({ searchQuery: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            className="w-full rounded-lg border border-input-border bg-input-bg py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />

          {/* Autocomplete Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-card-border bg-card-bg shadow-xl shadow-black/20">
              {/* District matches */}
              {suggestions.districts.length > 0 && (
                <div className="border-b border-card-border px-3 py-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Districts
                  </p>
                  {suggestions.districts.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => selectDistrict(d.name)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-input-bg"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {d.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {d.count.toLocaleString()} transactions &middot; {d.projectCount} projects
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Project matches */}
              {suggestions.projects.length > 0 && (
                <div className="px-3 py-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Projects
                  </p>
                  {suggestions.projects.map((p) => (
                    <button
                      key={`${p.district}-${p.id}`}
                      onClick={() => selectProject(p.name, p.district)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-input-bg"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/5">
                        <Building2 className="h-3.5 w-3.5 text-muted" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {p.district} &middot; {p.count.toLocaleString()} transactions
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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

      {/* Status + Sale Type + Asset Class */}
      <div className="grid grid-cols-1 gap-4 border-b border-card-border px-5 py-4 sm:grid-cols-3">
        <PillGroup
          label="Status"
          options={statusOptions}
          value={filters.status}
          onChange={(v) => update({ status: v })}
        />
        <PillGroup
          label="Sale Type"
          options={sequenceOptions}
          value={filters.sequence}
          onChange={(v) => update({ sequence: v })}
        />
        <PillGroup
          label="Asset Class"
          options={assetClassOptions}
          value={filters.assetClass}
          onChange={(v) => update({ assetClass: v })}
        />
      </div>

      {/* Bedrooms */}
      <div className="border-b border-card-border px-5 py-4">
        <PillGroup
          label="Bedrooms"
          options={bedroomOptions}
          value={filters.bedrooms}
          onChange={(v) => update({ bedrooms: v })}
        />
      </div>

      {/* Location: District -> Project */}
      <div className="border-b border-card-border px-5 py-4">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Location
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={filters.district}
            onChange={(e) => update({ district: e.target.value })}
            className={selectClass}
          >
            <option value="">All Districts</option>
            {sortedDistricts.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} ({d.count.toLocaleString()})
              </option>
            ))}
          </select>
          <select
            value={filters.project}
            onChange={(e) => update({ project: e.target.value })}
            className={selectClass}
            disabled={!filters.district}
          >
            <option value="">
              {filters.district ? "All Projects" : "Select District First"}
            </option>
            {projectsForDistrict.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} ({p.count.toLocaleString()})
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

      {/* Price, Size & Rate - expandable */}
      <div className="px-5 py-4">
        <button
          onClick={() => setShowRanges(!showRanges)}
          className="mb-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent hover:underline"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showRanges ? "rotate-180" : ""}`}
          />
          {showRanges ? "Hide" : "Show"} Price, Size & Rate Filters
        </button>
        {showRanges && (
          <div className="animate-fade-in grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            {/* Size Range */}
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
            {/* Rate Range */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Rate (AED/sqft)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.rateMin}
                  onChange={(e) => update({ rateMin: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.rateMax}
                  onChange={(e) => update({ rateMax: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
