"use client";

import { getProjectsForDistrict, Hierarchy } from "@/data/abu-dhabi";
import { FilterState, DatePreset, defaultFilters } from "@/lib/filters";
import { parseSmartSearch, applySmartSearch } from "@/lib/smart-search";
import { RotateCcw, Calendar, Search, ChevronDown, MapPin, Building2, X, Filter, Sparkles, ArrowRight, FileText } from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useT } from "@/i18n/LanguageContext";

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  transactionCount: number;
  hierarchy: Hierarchy;
}

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
  const t = useT();
  const [showRanges, setShowRanges] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [smartQuery, setSmartQuery] = useState("");

  const smartSearchPlaceholder = t("search_placeholder");

  const datePresets: { value: DatePreset; label: string }[] = [
    { value: "all_time", label: t("all_time") },
    { value: "today", label: t("today") },
    { value: "7d", label: t("d7") },
    { value: "30d", label: t("d30") },
    { value: "90d", label: t("d90") },
    { value: "this_week", label: t("this_week") },
    { value: "this_month", label: t("this_month") },
    { value: "this_quarter", label: t("this_quarter") },
    { value: "this_year", label: t("this_year") },
    { value: "last_month", label: t("last_month") },
    { value: "last_quarter", label: t("last_quarter") },
    { value: "last_year", label: t("last_year") },
    { value: "ytd", label: t("ytd") },
    { value: "custom", label: t("custom") },
  ];

  const propertyTypeOptions = [
    { value: "", label: t("all") },
    { value: "Apartment", label: t("apartment") },
    { value: "Villa", label: t("villa") },
    { value: "Townhouse", label: t("townhouse") },
    { value: "Duplex", label: t("duplex") },
    { value: "Land", label: t("land") },
    { value: "Penthouse", label: t("penthouse") },
    { value: "Office", label: t("office") },
    { value: "Retail", label: t("retail") },
    { value: "Other", label: t("other") },
  ];

  const statusOptions = [
    { value: "", label: t("all") },
    { value: "Off-Plan", label: t("off_plan") },
    { value: "Ready", label: t("ready") },
  ];

  const sequenceOptions = [
    { value: "", label: t("all") },
    { value: "Primary", label: t("primary_first_sale") },
    { value: "Secondary", label: t("secondary_resale") },
  ];

  const assetClassOptions = [
    { value: "", label: t("all") },
    { value: "residential", label: t("residential") },
    { value: "commercial", label: t("commercial") },
    { value: "agricultural", label: t("agricultural") },
    { value: "other", label: t("other") },
  ];

  const bedroomOptions = [
    { value: "", label: t("all") },
    { value: "0", label: t("studio") },
    { value: "1", label: "1BR" },
    { value: "2", label: "2BR" },
    { value: "3", label: "3BR" },
    { value: "4", label: "4BR" },
    { value: "5", label: "5BR" },
    { value: "6+", label: "6+BR" },
  ];

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
    const q = smartQuery.toLowerCase().trim();
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
  }, [smartQuery, hierarchy]);

  // Smart search: parse query into filter candidates
  const smartPreview = useMemo(
    () => parseSmartSearch(smartQuery, hierarchy),
    [smartQuery, hierarchy]
  );

  const showSmartPreview =
    searchFocused &&
    smartQuery.length >= 2 &&
    (smartPreview.matchedTerms.length > 0 || suggestions.districts.length > 0 || suggestions.projects.length > 0);

  const handleSmartApply = useCallback(() => {
    const parsed = parseSmartSearch(smartQuery, hierarchy);
    const newFilters = applySmartSearch(filters, parsed);
    onChange(newFilters);
    setSmartQuery("");
    setSearchFocused(false);
  }, [smartQuery, hierarchy, filters, onChange]);

  const buildReportUrl = (f: FilterState) => {
    const params = new URLSearchParams();
    if (f.district) params.set("district", f.district);
    if (f.project) params.set("project", f.project);
    if (f.propertyType) params.set("propertyType", f.propertyType);
    if (f.bedrooms) params.set("bedrooms", f.bedrooms);
    if (f.status) params.set("status", f.status);
    if (f.sequence) params.set("sequence", f.sequence);
    if (f.assetClass) params.set("assetClass", f.assetClass);
    if (f.datePreset && f.datePreset !== "all_time") params.set("datePreset", f.datePreset);
    return `/dashboard/report?${params.toString()}`;
  };

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

  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: string; category: string; label: string; onRemove: () => void }[] = [];

    if (filters.district) {
      chips.push({
        key: "district",
        category: t("district"),
        label: filters.district,
        onRemove: () => update({ district: "", project: "" }),
      });
    }
    if (filters.project) {
      chips.push({
        key: "project",
        category: t("project"),
        label: filters.project,
        onRemove: () => update({ project: "" }),
      });
    }
    if (filters.propertyType) {
      const opt = propertyTypeOptions.find((o) => o.value === filters.propertyType);
      chips.push({
        key: "propertyType",
        category: t("property_type"),
        label: opt?.label || filters.propertyType,
        onRemove: () => update({ propertyType: "" }),
      });
    }
    if (filters.status) {
      chips.push({
        key: "status",
        category: t("status"),
        label: filters.status === "Off-Plan" ? t("off_plan") : t("ready"),
        onRemove: () => update({ status: "" }),
      });
    }
    if (filters.sequence) {
      chips.push({
        key: "sequence",
        category: t("sale_type"),
        label: filters.sequence === "Primary" ? t("primary") : t("secondary"),
        onRemove: () => update({ sequence: "" }),
      });
    }
    if (filters.assetClass) {
      const opt = assetClassOptions.find((o) => o.value === filters.assetClass);
      chips.push({
        key: "assetClass",
        category: t("asset_class"),
        label: opt?.label || filters.assetClass,
        onRemove: () => update({ assetClass: "" }),
      });
    }
    if (filters.bedrooms) {
      const opt = bedroomOptions.find((o) => o.value === filters.bedrooms);
      chips.push({
        key: "bedrooms",
        category: t("bedrooms"),
        label: opt?.label || filters.bedrooms,
        onRemove: () => update({ bedrooms: "" }),
      });
    }
    if (filters.searchQuery) {
      chips.push({
        key: "search",
        category: t("search_transactions"),
        label: `"${filters.searchQuery}"`,
        onRemove: () => update({ searchQuery: "" }),
      });
    }
    if (filters.datePreset !== defaultFilters.datePreset) {
      const preset = datePresets.find((p) => p.value === filters.datePreset);
      chips.push({
        key: "datePreset",
        category: t("time_period"),
        label: preset?.label || filters.datePreset,
        onRemove: () => update({ datePreset: defaultFilters.datePreset, dateFrom: "", dateTo: "" }),
      });
    }
    if (filters.priceMin) {
      chips.push({
        key: "priceMin",
        category: t("price_aed"),
        label: `${t("min")}: ${Number(filters.priceMin).toLocaleString()}`,
        onRemove: () => update({ priceMin: "" }),
      });
    }
    if (filters.priceMax) {
      chips.push({
        key: "priceMax",
        category: t("price_aed"),
        label: `${t("max")}: ${Number(filters.priceMax).toLocaleString()}`,
        onRemove: () => update({ priceMax: "" }),
      });
    }
    if (filters.sizeMin) {
      chips.push({
        key: "sizeMin",
        category: t("size_sqft"),
        label: `${t("min")}: ${Number(filters.sizeMin).toLocaleString()}`,
        onRemove: () => update({ sizeMin: "" }),
      });
    }
    if (filters.sizeMax) {
      chips.push({
        key: "sizeMax",
        category: t("size_sqft"),
        label: `${t("max")}: ${Number(filters.sizeMax).toLocaleString()}`,
        onRemove: () => update({ sizeMax: "" }),
      });
    }
    if (filters.rateMin) {
      chips.push({
        key: "rateMin",
        category: t("rate_aed_sqft"),
        label: `${t("min")}: ${Number(filters.rateMin).toLocaleString()}`,
        onRemove: () => update({ rateMin: "" }),
      });
    }
    if (filters.rateMax) {
      chips.push({
        key: "rateMax",
        category: t("rate_aed_sqft"),
        label: `${t("max")}: ${Number(filters.rateMax).toLocaleString()}`,
        onRemove: () => update({ rateMax: "" }),
      });
    }

    return chips;
  }, [filters, t, propertyTypeOptions, assetClassOptions, bedroomOptions, datePresets, update]);

  const activeFilterCount = activeChips.length;

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
              {t("search_transactions")}
            </h2>
            <p className="text-xs text-muted">
              {transactionCount.toLocaleString()} {t("results")}
              {activeFilterCount > 0 && (
                <span className="ms-1.5 inline-flex items-center rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  {activeFilterCount} {t("filters")}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => onChange(defaultFilters)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            activeFilterCount > 0
              ? "border-negative/40 bg-negative/10 text-negative hover:bg-negative/20"
              : "border-input-border text-muted hover:border-negative hover:text-negative"
          }`}
        >
          <RotateCcw className="h-3 w-3" />
          {t("clear_all")}
        </button>
        <a
          href={buildReportUrl(filters)}
          className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          <FileText className="h-3 w-3" />
          Download PDF Report
        </a>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-card-border bg-accent/5 px-5 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Filter className="h-3 w-3" />
            {t("filters")}:
          </div>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="group inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 py-1 pe-1.5 ps-2.5 text-xs transition-all hover:border-accent/50 hover:bg-accent/15"
            >
              <span className="text-[10px] font-semibold text-muted">{chip.category}:</span>
              <span className="font-medium text-foreground">{chip.label}</span>
              <button
                onClick={chip.onRemove}
                className="flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:bg-negative/20 hover:text-negative"
                title={t("clear_all")}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {activeFilterCount > 1 && (
            <button
              onClick={() => onChange(defaultFilters)}
              className="ms-auto flex items-center gap-1 rounded-full bg-negative/10 px-2.5 py-1 text-[11px] font-semibold text-negative transition-colors hover:bg-negative/20"
            >
              <X className="h-3 w-3" />
              {t("clear_all")}
            </button>
          )}
        </div>
      )}

      {/* Smart Search Box */}
      <div className="border-b border-card-border px-5 py-4">
        <div className="relative" ref={searchRef}>
          <Sparkles className="pointer-events-none absolute start-3 top-3.5 h-4 w-4 text-accent" />
          <input
            type="text"
            placeholder={smartSearchPlaceholder}
            value={smartQuery}
            onChange={(e) => setSmartQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && smartQuery.trim()) {
                handleSmartApply();
              }
            }}
            className="w-full rounded-lg border border-input-border bg-input-bg py-2.5 ps-10 pe-24 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          {smartQuery.trim() && (
            <button
              onClick={handleSmartApply}
              className="absolute end-1.5 top-1.5 flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              <ArrowRight className="h-3 w-3" />
              {t("chat_send")}
            </button>
          )}

          {/* Smart Search Preview Dropdown */}
          {showSmartPreview && (
            <div className="absolute start-0 end-0 top-full z-50 mt-1 rounded-xl border border-card-border bg-card-bg shadow-xl shadow-black/20">
              {/* AI-parsed filters preview */}
              {smartPreview.matchedTerms.length > 0 && (
                <div className="border-b border-card-border px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-accent" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                      {t("smart_search_detected")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {smartPreview.filters.propertyType && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        {t("property_type")}: <span className="text-accent">{smartPreview.filters.propertyType}</span>
                      </span>
                    )}
                    {smartPreview.filters.district && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        {t("district")}: <span className="text-accent">{smartPreview.filters.district}</span>
                      </span>
                    )}
                    {smartPreview.filters.project && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        {t("project")}: <span className="text-accent">{smartPreview.filters.project}</span>
                      </span>
                    )}
                    {smartPreview.filters.status && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        {t("status")}: <span className="text-accent">{smartPreview.filters.status}</span>
                      </span>
                    )}
                    {smartPreview.filters.sequence && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        {t("sale_type")}: <span className="text-accent">{smartPreview.filters.sequence}</span>
                      </span>
                    )}
                    {smartPreview.filters.bedrooms && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        {t("bedrooms")}: <span className="text-accent">{bedroomOptions.find(o => o.value === smartPreview.filters.bedrooms)?.label || smartPreview.filters.bedrooms}</span>
                      </span>
                    )}
                    {smartPreview.filters.assetClass && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        {t("asset_class")}: <span className="text-accent">{smartPreview.filters.assetClass}</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSmartApply}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent/10 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
                  >
                    <ArrowRight className="h-3 w-3" />
                    {t("smart_search_apply")}
                  </button>
                </div>
              )}

              {/* District suggestions */}
              {suggestions.districts.length > 0 && (
                <div className={`px-3 py-2 ${smartPreview.matchedTerms.length > 0 ? "" : "border-b border-card-border"}`}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("districts")}
                  </p>
                  {suggestions.districts.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { selectDistrict(d.name); setSmartQuery(""); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-input-bg"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                        <p className="text-[11px] text-muted">
                          {d.count.toLocaleString()} {t("transactions_label")} &middot; {d.projectCount} {t("projects_label")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Project suggestions */}
              {suggestions.projects.length > 0 && (
                <div className="px-3 py-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("projects")}
                  </p>
                  {suggestions.projects.map((p) => (
                    <button
                      key={`${p.district}-${p.id}`}
                      onClick={() => { selectProject(p.name, p.district); setSmartQuery(""); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-input-bg"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/5">
                        <Building2 className="h-3.5 w-3.5 text-muted" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted">
                          {p.district} &middot; {p.count.toLocaleString()} {t("transactions_label")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No matches hint */}
              {smartPreview.matchedTerms.length === 0 && suggestions.districts.length === 0 && suggestions.projects.length === 0 && smartQuery.length >= 2 && (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-muted">{t("smart_search_hint")}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-[10px] text-muted/70">
          <Sparkles className="me-1 inline h-3 w-3 text-accent/50" />
          {t("smart_search_examples")}
        </p>
      </div>

      {/* Property Type Pills */}
      <div className="border-b border-card-border px-5 py-4">
        <PillGroup
          label={t("property_type")}
          options={propertyTypeOptions}
          value={filters.propertyType}
          onChange={(v) => update({ propertyType: v })}
        />
      </div>

      {/* Status + Sale Type + Asset Class */}
      <div className="grid grid-cols-1 gap-4 border-b border-card-border px-5 py-4 sm:grid-cols-3">
        <PillGroup
          label={t("status")}
          options={statusOptions}
          value={filters.status}
          onChange={(v) => update({ status: v })}
        />
        <PillGroup
          label={t("sale_type")}
          options={sequenceOptions}
          value={filters.sequence}
          onChange={(v) => update({ sequence: v })}
        />
        <PillGroup
          label={t("asset_class")}
          options={assetClassOptions}
          value={filters.assetClass}
          onChange={(v) => update({ assetClass: v })}
        />
      </div>

      {/* Bedrooms */}
      <div className="border-b border-card-border px-5 py-4">
        <PillGroup
          label={t("bedrooms")}
          options={bedroomOptions}
          value={filters.bedrooms}
          onChange={(v) => update({ bedrooms: v })}
        />
      </div>

      {/* Location: District -> Project */}
      <div className="border-b border-card-border px-5 py-4">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t("location")}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={filters.district}
            onChange={(e) => update({ district: e.target.value })}
            className={selectClass}
          >
            <option value="">{t("all_districts")}</option>
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
              {filters.district ? t("all_projects") : t("select_district_first")}
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
          <Calendar className="me-1 inline h-3 w-3" />
          {t("time_period")}
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
              <label className="text-xs text-muted">{t("from")}</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => update({ dateFrom: e.target.value })}
                className={inputClass + " w-40"}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted">{t("to")}</label>
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
          {showRanges ? t("hide_price_filters") : t("show_price_filters")}
        </button>
        {showRanges && (
          <div className="animate-fade-in grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Price Range */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                {t("price_aed")}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={t("min")}
                  value={filters.priceMin}
                  onChange={(e) => update({ priceMin: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder={t("max")}
                  value={filters.priceMax}
                  onChange={(e) => update({ priceMax: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            {/* Size Range */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                {t("size_sqft")}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={t("min")}
                  value={filters.sizeMin}
                  onChange={(e) => update({ sizeMin: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder={t("max")}
                  value={filters.sizeMax}
                  onChange={(e) => update({ sizeMax: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            {/* Rate Range */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                {t("rate_aed_sqft")}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={t("min")}
                  value={filters.rateMin}
                  onChange={(e) => update({ rateMin: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder={t("max")}
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
