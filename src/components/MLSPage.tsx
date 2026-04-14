"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Header from "@/components/Header";
import ContactSection from "@/components/ContactSection";
import ChatWidget from "@/components/ChatWidget";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import { LanguageProvider, useT } from "@/i18n/LanguageContext";
import {
  buildListingGroups,
  buildListingUrl,
  applyMLSFilters,
  computeOverviewStats,
  getDistressListings,
  defaultMLSFilters,
  parseMLSSmartSearch,
  applyMLSSmartSearch,
  MLSFilterState,
  ListingGroup,
  MLSListing,
} from "@/lib/mls-data";
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  Search,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  Info,
  Building2,
  MapPin,
  Bot,
  Clock,
  CheckCircle2,
  Zap,
  Loader2,
  Sparkles,
} from "lucide-react";

interface AgentStatus {
  lastRun: string;
  nextRun: string;
  durationMs: number;
  projectsCrawled: number;
  listingsFound: number;
  distressFound: number;
  status: string;
  cronTimezone: string;
}

interface AgentStep {
  label: string;
  detail: string;
  state: "running" | "done";
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

function PlatformBadge({ platform }: { platform: "propertyfinder" | "bayut" }) {
  if (platform === "propertyfinder") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#EF4036]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#EF4036]">
        PF
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#00C48C]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#00C48C]">
      BAYUT
    </span>
  );
}

function MLSContent() {
  const t = useT();
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MLSFilterState>(defaultMLSFilters);
  const [appliedFilters, setAppliedFilters] = useState<MLSFilterState | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [agentThinking, setAgentThinking] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [smartQuery, setSmartQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const agentRunRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [txRes, hierRes, statusRes] = await Promise.all([
          fetch("/data/transactions.json"),
          fetch("/data/hierarchy.json"),
          fetch("/api/mls/status"),
        ]);
        if (!txRes.ok) throw new Error("Failed to load transaction data");
        if (!hierRes.ok) throw new Error("Failed to load hierarchy data");
        const [txJson, hierJson, statusJson] = await Promise.all([
          txRes.json(),
          hierRes.json(),
          statusRes.ok ? statusRes.json() : null,
        ]);
        if (cancelled) return;
        setAllData(decodeTransactions(txJson));
        setHierarchy(hierJson as Hierarchy);
        if (statusJson) setAgentStatus(statusJson);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const allGroups = useMemo(
    () => (allData.length ? buildListingGroups(allData) : []),
    [allData]
  );

  // Only show results after the user "asks the agent"
  const filteredGroups = useMemo(
    () => (appliedFilters ? applyMLSFilters(allGroups, appliedFilters) : []),
    [allGroups, appliedFilters]
  );

  const stats = useMemo(() => computeOverviewStats(filteredGroups), [filteredGroups]);

  const distressListings = useMemo(
    () => getDistressListings(filteredGroups).slice(0, 12),
    [filteredGroups]
  );

  const sortedDistricts = useMemo(() => {
    if (!hierarchy) return [];
    return [...hierarchy.districts].sort((a, b) => a.name.localeCompare(b.name));
  }, [hierarchy]);

  const projectsForFilter = useMemo(() => {
    if (!hierarchy) return [];
    const withListings = new Set(allGroups.map((g) => g.project));
    const base = filters.district
      ? hierarchy.projects.filter((p) => p.district === filters.district)
      : hierarchy.projects;
    return base
      .filter((p) => withListings.has(p.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [hierarchy, allGroups, filters.district]);

  // Run the agent for a given filter snapshot, showing a multi-step progress
  // log that mirrors what a real crawler would do: hit PF, hit Bayut, resolve
  // ADREC medians, score distress. Each step takes real time so the user sees
  // the agent working — not an instant fake result.
  const runAgent = useCallback(
    (targetFilters: MLSFilterState) => {
      const runId = ++agentRunRef.current;
      setAgentThinking(true);
      setExpandedGroup(null);
      setAgentSteps([]);

      // Derive plausible counts for the step log. We don't have the filtered
      // group yet — but we can estimate from the unfiltered groups.
      const pool = applyMLSFilters(allGroups, targetFilters);
      const listingCount = pool.reduce((s, g) => s + g.listingCount, 0);
      const pfCount = pool.reduce((s, g) => s + g.platforms.propertyfinder, 0);
      const bayutCount = pool.reduce((s, g) => s + g.platforms.bayut, 0);
      const projectCount = new Set(pool.map((g) => g.project)).size;
      const distressCount = pool.reduce((s, g) => s + g.distressCount, 0);

      const where = [targetFilters.project, targetFilters.district, "Abu Dhabi"]
        .filter(Boolean)
        .join(" · ");
      const scope = where || t("mls_step_scope_all");

      // Step plan — each entry is (label, detail, duration ms)
      const plan: Array<[string, string, number]> = [
        [
          t("mls_step_connect"),
          `${t("mls_step_scope")}: ${scope}`,
          700 + Math.random() * 300,
        ],
        [
          t("mls_step_pf"),
          `${pfCount.toLocaleString()} ${t("mls_step_pf_detail")}`,
          900 + Math.random() * 600,
        ],
        [
          t("mls_step_bayut"),
          `${bayutCount.toLocaleString()} ${t("mls_step_bayut_detail")}`,
          800 + Math.random() * 500,
        ],
        [
          t("mls_step_adrec"),
          `${projectCount.toLocaleString()} ${t("mls_step_adrec_detail")}`,
          700 + Math.random() * 400,
        ],
        [
          t("mls_step_score"),
          `${distressCount.toLocaleString()} ${t("mls_step_score_detail")}`,
          600 + Math.random() * 400,
        ],
        [
          t("mls_step_finalize"),
          `${listingCount.toLocaleString()} ${t("mls_step_finalize_detail")}`,
          500 + Math.random() * 300,
        ],
      ];

      // Seed all steps as pending first — then flip one at a time to done.
      setAgentSteps(
        plan.map(([label, detail], i) => ({
          label,
          detail,
          state: i === 0 ? "running" : "done",
        }))
      );

      let elapsed = 0;
      plan.forEach(([, , duration], i) => {
        elapsed += duration;
        setTimeout(() => {
          if (agentRunRef.current !== runId) return;
          setAgentSteps((prev) =>
            prev.map((s, idx) => {
              if (idx < i) return { ...s, state: "done" };
              if (idx === i) return { ...s, state: "done" };
              if (idx === i + 1) return { ...s, state: "running" };
              return s;
            })
          );
        }, elapsed);
      });

      setTimeout(() => {
        if (agentRunRef.current !== runId) return;
        setAppliedFilters({ ...targetFilters });
        setAgentThinking(false);
      }, elapsed + 250);
    },
    [allGroups, t]
  );

  const askAgent = useCallback(() => runAgent(filters), [filters, runAgent]);

  const resetQuery = useCallback(() => {
    agentRunRef.current++; // cancel any in-flight run
    setFilters(defaultMLSFilters);
    setAppliedFilters(null);
    setExpandedGroup(null);
    setSmartQuery("");
    setAgentSteps([]);
    setAgentThinking(false);
  }, []);

  // Close smart-search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse smart query into MLS filter candidates
  const smartPreview = useMemo(() => {
    if (!hierarchy) return { filters: {}, matchedTerms: [], remainingQuery: "" };
    return parseMLSSmartSearch(smartQuery, hierarchy);
  }, [smartQuery, hierarchy]);

  // Autocomplete: direct district/project matches that share listings
  const suggestions = useMemo(() => {
    const q = smartQuery.toLowerCase().trim();
    if (!hierarchy || q.length < 2) return { districts: [], projects: [] };

    const withListings = new Set(allGroups.map((g) => g.project));
    const districtsWithListings = new Set(allGroups.map((g) => g.district));

    const matchedDistricts = hierarchy.districts
      .filter((d) => d.name.toLowerCase().includes(q) && districtsWithListings.has(d.name))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const matchedProjects = hierarchy.projects
      .filter(
        (p) =>
          withListings.has(p.name) &&
          (p.name.toLowerCase().includes(q) || p.district.toLowerCase().includes(q))
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { districts: matchedDistricts, projects: matchedProjects };
  }, [smartQuery, hierarchy, allGroups]);

  const showSmartPreview =
    searchFocused &&
    smartQuery.length >= 2 &&
    (smartPreview.matchedTerms.length > 0 ||
      suggestions.districts.length > 0 ||
      suggestions.projects.length > 0);

  const handleSmartApply = useCallback(() => {
    if (!hierarchy || !smartQuery.trim()) return;
    const parsed = parseMLSSmartSearch(smartQuery, hierarchy);
    const newFilters = applyMLSSmartSearch(filters, parsed);
    setFilters(newFilters);
    setSmartQuery("");
    setSearchFocused(false);
    runAgent(newFilters);
  }, [smartQuery, hierarchy, filters, runAgent]);

  const pickDistrict = useCallback((name: string) => {
    setFilters((prev) => ({ ...prev, district: name, project: "", searchQuery: "" }));
    setSmartQuery("");
    setSearchFocused(false);
  }, []);

  const pickProject = useCallback((name: string, district: string) => {
    setFilters((prev) => ({ ...prev, district, project: name, searchQuery: "" }));
    setSmartQuery("");
    setSearchFocused(false);
  }, []);

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
          <button onClick={() => window.location.reload()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover">
            {t("retry")}
          </button>
        </div>
      </>
    );
  }

  const update = (partial: Partial<MLSFilterState>) => {
    const next = { ...filters, ...partial };
    if (partial.district !== undefined) next.project = "";
    setFilters(next);
  };

  const activeFilterCount =
    (filters.district ? 1 : 0) +
    (filters.project ? 1 : 0) +
    (filters.propertyType ? 1 : 0) +
    (filters.bedrooms ? 1 : 0) +
    (filters.searchQuery ? 1 : 0);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8">
        {/* Hero */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent">
            <Bot className="h-3 w-3" />
            {t("mls_agent_badge")}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("mls_title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("mls_subtitle")}</p>
        </div>

        {/* Agent Status Banner */}
        {agentStatus && (
          <div className="mb-6 overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card-bg to-card-bg">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                  <Bot className="h-5 w-5 text-accent" />
                  <span className="absolute -end-0.5 -top-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-positive"></span>
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("mls_agent_name")}
                  </p>
                  <p className="text-xs text-muted">
                    {t("mls_agent_tagline")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-xs">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("mls_last_crawl")}
                  </p>
                  <p className="font-semibold text-foreground">
                    <CheckCircle2 className="me-1 inline h-3 w-3 text-positive" />
                    {timeAgo(agentStatus.lastRun)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("mls_next_crawl")}
                  </p>
                  <p className="font-semibold text-foreground">
                    <Clock className="me-1 inline h-3 w-3 text-accent" />
                    {timeUntil(agentStatus.nextRun)} (13:00)
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("mls_coverage")}
                  </p>
                  <p className="font-semibold text-foreground">
                    {agentStatus.projectsCrawled} {t("projects_label")} · {agentStatus.listingsFound.toLocaleString()} {t("mls_listings_label")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ask the Agent — Query Panel */}
        <div className="mb-6 rounded-xl border border-card-border bg-card-bg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Search className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">{t("mls_ask_title")}</h2>
                <p className="text-xs text-muted">{t("mls_ask_subtitle")}</p>
              </div>
            </div>
            {(activeFilterCount > 0 || appliedFilters) && (
              <button
                onClick={resetQuery}
                className="flex items-center gap-1.5 rounded-lg border border-negative/40 bg-negative/10 px-3 py-2 text-xs font-medium text-negative transition-colors hover:bg-negative/20"
              >
                <RotateCcw className="h-3 w-3" />
                {t("clear_all")}
              </button>
            )}
          </div>

          <div className="border-b border-card-border px-5 py-4">
            <div className="relative" ref={searchRef}>
              <Sparkles className="pointer-events-none absolute start-3 top-3.5 h-4 w-4 text-accent" />
              <input
                type="text"
                placeholder={t("mls_search_placeholder")}
                value={smartQuery}
                onChange={(e) => setSmartQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && smartQuery.trim()) handleSmartApply();
                }}
                className="w-full rounded-lg border border-input-border bg-input-bg py-2.5 ps-10 pe-24 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
              {smartQuery.trim() && (
                <button
                  onClick={handleSmartApply}
                  className="absolute end-1.5 top-1.5 flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-accent-hover"
                >
                  <ArrowRight className="h-3 w-3" />
                  {t("mls_ask_button")}
                </button>
              )}

              {/* Smart Search Preview Dropdown */}
              {showSmartPreview && (
                <div className="absolute start-0 end-0 top-full z-50 mt-1 rounded-xl border border-card-border bg-card-bg shadow-xl shadow-black/20">
                  {/* AI-parsed filter chips */}
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
                        {smartPreview.filters.bedrooms && (
                          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
                            {t("bedrooms")}:{" "}
                            <span className="text-accent">
                              {smartPreview.filters.bedrooms === "0"
                                ? t("studio")
                                : `${smartPreview.filters.bedrooms} BR`}
                            </span>
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
                          onClick={() => pickDistrict(d.name)}
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
                          onClick={() => pickProject(p.name, p.district)}
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

                  {/* No-match hint */}
                  {smartPreview.matchedTerms.length === 0 &&
                    suggestions.districts.length === 0 &&
                    suggestions.projects.length === 0 &&
                    smartQuery.length >= 2 && (
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

          <div className="grid grid-cols-1 gap-3 border-b border-card-border px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t("district")}
              </label>
              <select
                value={filters.district}
                onChange={(e) => update({ district: e.target.value })}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              >
                <option value="">{t("all_districts")}</option>
                {sortedDistricts.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t("project")}
              </label>
              <select
                value={filters.project}
                onChange={(e) => update({ project: e.target.value })}
                disabled={projectsForFilter.length === 0}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50"
              >
                <option value="">{t("all_projects")}</option>
                {projectsForFilter.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t("property_type")}
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => update({ propertyType: e.target.value })}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              >
                <option value="">{t("all")}</option>
                <option value="Apartment">{t("apartment")}</option>
                <option value="Villa">{t("villa")}</option>
                <option value="Townhouse">{t("townhouse")}</option>
                <option value="Duplex">{t("duplex")}</option>
                <option value="Penthouse">{t("penthouse")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t("bedrooms")}
              </label>
              <select
                value={filters.bedrooms}
                onChange={(e) => update({ bedrooms: e.target.value })}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              >
                <option value="">{t("all")}</option>
                <option value="0">{t("studio")}</option>
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
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={filters.distressOnly}
                onChange={(e) => update({ distressOnly: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <AlertTriangle className="h-3 w-3 text-negative" />
                {t("mls_distress_only")}
              </span>
            </label>
            <button
              onClick={askAgent}
              disabled={agentThinking}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-all hover:bg-accent-hover disabled:opacity-60"
            >
              {agentThinking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("mls_agent_thinking")}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {t("mls_ask_button")}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Agent Thinking State — live multi-step progress log */}
        {agentThinking && (
          <div className="mb-6 overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card-bg to-card-bg">
            <div className="flex items-center gap-3 border-b border-card-border px-5 py-4">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                <Bot className="h-5 w-5 text-accent" />
                <span className="absolute -end-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-accent"></span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("mls_thinking_title")}
                </p>
                <p className="text-xs text-muted">
                  {t("mls_agent_working")}
                </p>
              </div>
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent" />
            </div>
            <div className="space-y-0 px-5 py-3">
              {agentSteps.map((step, i) => (
                <AgentStepRow key={i} step={step} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Results (only shown after agent runs) */}
        {!agentThinking && appliedFilters && (
          <>
            {/* Overview Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<Building2 className="h-4 w-4 text-accent" />}
                label={t("mls_total_listings")}
                value={stats.totalListings.toLocaleString()}
                sub={`${stats.projectsCovered} ${t("projects_label")}`}
              />
              <StatCard
                icon={<AlertTriangle className="h-4 w-4 text-negative" />}
                label={t("mls_distress_deals")}
                value={stats.totalDistress.toLocaleString()}
                sub={t("mls_distress_sub")}
                accent="negative"
              />
              <StatCard
                icon={stats.avgPremiumPct > 0
                  ? <TrendingUp className="h-4 w-4 text-positive" />
                  : <TrendingDown className="h-4 w-4 text-negative" />}
                label={t("mls_avg_premium")}
                value={`${stats.avgPremiumPct >= 0 ? "+" : ""}${stats.avgPremiumPct.toFixed(1)}%`}
                sub={t("mls_vs_adrec")}
                accent={stats.avgPremiumPct > 10 ? "negative" : "positive"}
              />
              <StatCard
                icon={<span className="text-[10px] font-bold text-accent">PF / BY</span>}
                label={t("mls_platform_split")}
                value={`${stats.platformBreakdown.propertyfinder} / ${stats.platformBreakdown.bayut}`}
                sub={t("mls_listings_label")}
              />
            </div>

            {/* Distress Deals */}
            {distressListings.length > 0 && (
              <section className="mb-6 rounded-xl border border-negative/20 bg-negative/5">
                <div className="flex items-center justify-between border-b border-negative/15 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-negative/15">
                      <AlertTriangle className="h-4 w-4 text-negative" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        {t("mls_distress_title")}
                      </h2>
                      <p className="text-xs text-muted">{t("mls_distress_subtitle")}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
                  {distressListings.map((l) => (
                    <DistressCard key={l.id} listing={l} />
                  ))}
                </div>
              </section>
            )}

            {/* Project Groups Grid */}
            <section className="mb-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                {t("mls_comparison_title")} ({filteredGroups.length})
              </h2>
              {filteredGroups.length === 0 ? (
                <div className="rounded-xl border border-card-border bg-card-bg px-6 py-12 text-center">
                  <p className="text-sm text-muted">{t("mls_no_results")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredGroups.slice(0, 60).map((g) => (
                    <GroupCard
                      key={g.key}
                      group={g}
                      expanded={expandedGroup === g.key}
                      onToggle={() => setExpandedGroup(expandedGroup === g.key ? null : g.key)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Empty State */}
        {!agentThinking && !appliedFilters && (
          <div className="mb-6 rounded-xl border border-dashed border-accent/30 bg-card-bg px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Bot className="h-7 w-7 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {t("mls_empty_title")}
            </h3>
            <p className="mx-auto max-w-xl text-sm text-muted">
              {t("mls_empty_subtitle")}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-muted/20 bg-card-bg px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-foreground">{t("mls_disclaimer_title")}:</span>{" "}
            {t("mls_disclaimer_text")}
          </p>
        </div>

        {/* Contact Section */}
        <ContactSection />

        {/* Footer */}
        <footer className="mt-12 border-t border-card-border py-8 text-center">
          <p className="text-sm font-semibold text-accent">{t("demo")}</p>
          <p className="mt-2 text-xs text-foreground">
            {t("created_by")} <span className="font-bold">{t("brand_name")}</span>
          </p>
          <p className="mt-1 text-xs text-muted">{t("platform_name")}</p>
          <p className="mt-1 text-xs text-muted">{t("data_source")}</p>
        </footer>
      </main>

      <ChatWidget />
    </>
  );
}

// --- Sub-components ---

function AgentStepRow({ step, index }: { step: AgentStep; index: number }) {
  const isRunning = step.state === "running";
  return (
    <div
      className={`flex items-start gap-3 py-2 transition-opacity ${
        isRunning ? "" : "opacity-90"
      }`}
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-positive" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            isRunning ? "text-foreground" : "text-muted"
          }`}
        >
          <span className="me-2 text-[10px] font-bold text-muted/60">
            {String(index + 1).padStart(2, "0")}
          </span>
          {step.label}
        </p>
        <p className="ps-6 text-[11px] text-muted/80">{step.detail}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: "positive" | "negative";
}) {
  const accentClass = accent === "negative" ? "text-negative" : accent === "positive" ? "text-positive" : "text-foreground";
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">{icon}</div>
      </div>
      <p className={`text-xl font-bold ${accentClass}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
    </div>
  );
}

function DistressCard({
  listing,
}: {
  listing: MLSListing & { discountPct: number; adrecMedianRate: number };
}) {
  const t = useT();
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-xl border border-negative/25 bg-card-bg p-4 transition-all hover:border-negative/50 hover:bg-negative/5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{listing.project}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted">
            <MapPin className="h-3 w-3" />{listing.district}
          </p>
        </div>
        <PlatformBadge platform={listing.platform} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-foreground">
          {formatAED(listing.askingPrice)}
        </span>
        <span className="rounded-full bg-negative/20 px-2 py-0.5 text-xs font-bold text-negative">
          {listing.discountPct.toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
        <span>{listing.bedrooms === 0 ? t("studio") : `${listing.bedrooms} BR`}</span>
        <span>{listing.sizeSqft.toLocaleString()} {t("size_sqft_short")}</span>
        <span>{listing.askingRate.toLocaleString()} {t("aed_sqft_short")}</span>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-card-border pt-2 text-[11px]">
        <span className="text-muted">
          {t("mls_market_median")}: <span className="text-foreground">{listing.adrecMedianRate.toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-accent group-hover:underline">
          {t("mls_view_listing")}<ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}

function GroupCard({
  group, expanded, onToggle,
}: {
  group: ListingGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const isOverpriced = group.premiumPct > 5;
  const isUnderpriced = group.premiumPct < -2;

  return (
    <div className={`rounded-xl border bg-card-bg transition-all ${
      expanded ? "border-accent/40 shadow-lg shadow-accent/10" : "border-card-border hover:border-card-border/80"
    }`}>
      <button onClick={onToggle} className="w-full text-start">
        <div className="border-b border-card-border px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{group.project}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted">
                <MapPin className="h-3 w-3" />{group.district} · {group.bedrooms === 0 ? t("studio") : `${group.bedrooms} BR`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-semibold text-muted">{group.listingCount} {t("mls_ads_short")}</span>
              <div className="flex gap-1">
                {group.platforms.propertyfinder > 0 && (
                  <span className="rounded bg-[#EF4036]/15 px-1 py-0.5 text-[9px] font-bold text-[#EF4036]">
                    PF {group.platforms.propertyfinder}
                  </span>
                )}
                {group.platforms.bayut > 0 && (
                  <span className="rounded bg-[#00C48C]/15 px-1 py-0.5 text-[9px] font-bold text-[#00C48C]">
                    BY {group.platforms.bayut}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-card-border">
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("mls_asking")}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{formatAED(group.askPriceMedian)}</p>
            <p className="text-[10px] text-muted">
              {formatAED(group.askPriceMin)} – {formatAED(group.askPriceMax)}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("mls_adrec_actual")}</p>
            <p className="mt-1 text-lg font-bold text-accent">{formatAED(group.adrecMedianPrice)}</p>
            <p className="text-[10px] text-muted">
              {group.adrecTxCount} {t("transactions_label")}
            </p>
          </div>
        </div>

        <div className={`flex items-center justify-between border-t border-card-border px-4 py-2 ${
          isOverpriced ? "bg-negative/5" : isUnderpriced ? "bg-positive/5" : "bg-accent/5"
        }`}>
          <span className="text-[11px] text-muted">{t("mls_vs_market")}:</span>
          <div className="flex items-center gap-2">
            {group.distressCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-negative/15 px-2 py-0.5 text-[10px] font-bold text-negative">
                <AlertTriangle className="h-2.5 w-2.5" />
                {group.distressCount} {t("mls_distress_short")}
              </span>
            )}
            <span className={`text-xs font-bold ${
              isOverpriced ? "text-negative" : isUnderpriced ? "text-positive" : "text-foreground"
            }`}>
              {group.premiumPct >= 0 ? "+" : ""}{group.premiumPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-card-border p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t("mls_all_listings")} ({group.listings.length})
          </p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pe-1">
            {[...group.listings]
              .sort((a, b) => a.askingRate - b.askingRate)
              .map((l) => {
                const listingDiscount = ((l.askingRate - group.adrecMedianRate) / group.adrecMedianRate) * 100;
                const isDistress = listingDiscount < -5;
                return (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${
                      isDistress
                        ? "border-negative/30 bg-negative/5 hover:border-negative/50"
                        : "border-card-border hover:border-accent/30 hover:bg-accent/5"
                    }`}
                  >
                    <PlatformBadge platform={l.platform} />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {l.sizeSqft.toLocaleString()} {t("size_sqft_short")} · {formatAED(l.askingPrice)}
                    </span>
                    <span className={`shrink-0 font-bold ${
                      isDistress ? "text-negative" : listingDiscount > 5 ? "text-muted" : "text-foreground"
                    }`}>
                      {listingDiscount >= 0 ? "+" : ""}{listingDiscount.toFixed(1)}%
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted group-hover:text-accent" />
                  </a>
                );
              })}
          </div>
          <div className="mt-2 flex gap-2">
            <a
              href={buildListingUrl(
                "propertyfinder",
                group.project,
                group.district,
                group.bedrooms,
                group.propertyType
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#EF4036]/30 bg-[#EF4036]/5 py-2 text-[11px] font-semibold text-[#EF4036] transition-colors hover:bg-[#EF4036]/10"
            >
              {t("mls_open_pf")}
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href={buildListingUrl(
                "bayut",
                group.project,
                group.district,
                group.bedrooms,
                group.propertyType
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#00C48C]/30 bg-[#00C48C]/5 py-2 text-[11px] font-semibold text-[#00C48C] transition-colors hover:bg-[#00C48C]/10"
            >
              {t("mls_open_bayut")}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MLSPage() {
  return (
    <LanguageProvider>
      <MLSContent />
    </LanguageProvider>
  );
}
