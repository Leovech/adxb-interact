"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import SparkAreaChart from "@/components/ui/SparkAreaChart";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Transaction, Hierarchy, decodeTransactions } from "@/data/abu-dhabi";
import { buildComparison, CompareEntityType } from "@/lib/analytics/compare";
import { lookupServiceCharge, computeNetYieldPct, ServiceChargeData } from "@/lib/service-charge";
import { formatNumber } from "@/lib/filters";
import { Search, X, Share2, Check, GitCompareArrows } from "lucide-react";

const MAX_ENTITIES = 3;

interface Entity {
  type: CompareEntityType;
  name: string;
  id: string;
}

function parseAreasParam(raw: string, hierarchy: Hierarchy | null): Entity[] {
  if (!raw || !hierarchy) return [];
  const out: Entity[] = [];
  for (const token of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [maybeType, maybeId] = token.includes(":") ? token.split(":") : [null, token];
    const type = maybeType === "project" ? "project" : maybeType === "district" ? "district" : null;

    if (type === "district" || type === null) {
      const d = hierarchy.districts.find((x) => x.id === maybeId);
      if (d) {
        out.push({ type: "district", name: d.name, id: d.id });
        continue;
      }
    }
    if (type === "project" || type === null) {
      const p = hierarchy.projects.find((x) => x.id === maybeId);
      if (p) out.push({ type: "project", name: p.name, id: p.id });
    }
  }
  return out.slice(0, MAX_ENTITIES);
}

function buildAreasParam(entities: Entity[]): string {
  return entities.map((e) => `${e.type}:${e.id}`).join(",");
}

export default function CompareView({ initialAreas }: { initialAreas: string }) {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [txRes, hierRes, scRes] = await Promise.all([
          fetch("/data/transactions.json", { cache: "no-cache" }),
          fetch("/data/hierarchy.json", { cache: "no-cache" }),
          fetch("/data/service-charges.json", { cache: "no-cache" }),
        ]);
        if (!txRes.ok || !hierRes.ok || !scRes.ok) throw new Error("Failed to load market data");
        const [txJson, hierJson, scJson] = await Promise.all([txRes.json(), hierRes.json(), scRes.json()]);
        if (cancelled) return;
        setAllData(decodeTransactions(txJson));
        setHierarchy(hierJson as Hierarchy);
        setServiceCharges(scJson as ServiceChargeData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed the picker from ?areas= once hierarchy is available.
  useEffect(() => {
    if (seeded || !hierarchy) return;
    const parsed = parseAreasParam(initialAreas, hierarchy);
    if (parsed.length) setEntities(parsed);
    setSeeded(true);
  }, [hierarchy, initialAreas, seeded]);

  const suggestions = useMemo(() => {
    if (!hierarchy || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const selectedIds = new Set(entities.map((e) => e.id));
    const districts = hierarchy.districts
      .filter((d) => d.name.toLowerCase().includes(q) && !selectedIds.has(d.id))
      .slice(0, 5)
      .map((d) => ({ type: "district" as const, name: d.name, id: d.id }));
    const projects = hierarchy.projects
      .filter((p) => p.name.toLowerCase().includes(q) && !selectedIds.has(p.id))
      .slice(0, 5)
      .map((p) => ({ type: "project" as const, name: p.name, id: p.id }));
    return [...districts, ...projects].slice(0, 8);
  }, [hierarchy, query, entities]);

  const stats = useMemo(() => {
    if (!allData.length || !entities.length) return [];
    return buildComparison(
      allData,
      entities.map((e) => ({ type: e.type, name: e.name }))
    );
  }, [allData, entities]);

  const addEntity = (e: Entity) => {
    if (entities.length >= MAX_ENTITIES) return;
    if (entities.some((x) => x.id === e.id)) return;
    setEntities([...entities, e]);
    setQuery("");
  };

  const removeEntity = (id: string) => setEntities(entities.filter((e) => e.id !== id));

  const shareUrl = () => {
    const param = buildAreasParam(entities);
    const url = `${window.location.origin}/compare${param ? `?areas=${encodeURIComponent(param)}` : ""}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
    window.history.replaceState(null, "", param ? `/compare?areas=${encodeURIComponent(param)}` : "/compare");
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 lg:px-8">
          <SkeletonPage cards={3} />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
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
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            <GitCompareArrows className="h-6 w-6 text-accent" />
            Compare areas & projects
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pick up to {MAX_ENTITIES} districts or projects and see price, momentum and modelled
            yield side by side.
          </p>
        </div>

        {/* Picker */}
        <div className="relative mb-4 max-w-md">
          <div className="flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                entities.length >= MAX_ENTITIES
                  ? `Maximum ${MAX_ENTITIES} selected`
                  : "Search a district or project…"
              }
              disabled={entities.length >= MAX_ENTITIES}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-card-border bg-card-bg shadow-xl shadow-black/20">
              {suggestions.map((s) => (
                <button
                  key={`${s.type}-${s.id}`}
                  onClick={() => addEntity(s)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-input-bg"
                >
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">{s.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sticky compare bar */}
        {entities.length > 0 && (
          <div className="sticky top-[calc(4rem+1px)] z-30 mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-card-border bg-card-bg/95 p-3 backdrop-blur-md">
            {entities.map((e) => (
              <span
                key={e.id}
                className="flex items-center gap-1.5 rounded-full bg-accent/10 py-1 pe-1.5 ps-3 text-xs font-semibold text-accent"
              >
                {e.name}
                <button
                  onClick={() => removeEntity(e.id)}
                  aria-label={`Remove ${e.name}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={shareUrl}
              className="ms-auto flex items-center gap-1.5 rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Link copied" : "Share comparison"}
            </button>
          </div>
        )}

        {entities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-card-border p-10 text-center">
            <GitCompareArrows className="mx-auto mb-3 h-8 w-8 text-muted" />
            <p className="text-sm font-medium text-foreground">Nothing selected yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              Search for a district or project above to start comparing — try &ldquo;Al Reem
              Island&rdquo; or &ldquo;Yas Island&rdquo;.
            </p>
          </div>
        )}

        {entities.length > 0 && stats.length === 0 && (
          <div className="rounded-2xl border border-dashed border-card-border p-10 text-center">
            <p className="text-sm font-medium text-foreground">Not enough transaction history</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              None of the selected areas have enough recent ADREC sales to compare yet. Try a
              different district or project.
            </p>
          </div>
        )}

        {stats.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => {
              const sc = serviceCharges ? lookupServiceCharge(serviceCharges, s.district) : null;
              const netYieldPct = sc
                ? computeNetYieldPct(s.grossYieldPct, s.medianRateSqft * 1000, 1000, sc.aedSqftYr)
                : null;
              return (
                <div key={s.name} className="flex flex-col rounded-2xl border border-card-border bg-card-bg p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                        {s.type}
                      </p>
                      <h3 className="text-base font-bold text-foreground">{s.name}</h3>
                    </div>
                    <MomentumChip badge={s.momentumBadge} />
                  </div>

                  <Row label="Median AED/sqft" value={`${formatNumber(s.medianRateSqft)}`} />
                  <Row
                    label="QoQ change"
                    value={s.qoqChangePct === null ? "—" : `${s.qoqChangePct > 0 ? "+" : ""}${s.qoqChangePct.toFixed(1)}%`}
                    tone={s.qoqChangePct === null ? "muted" : s.qoqChangePct >= 0 ? "positive" : "negative"}
                  />
                  <Row
                    label="YoY change"
                    value={s.yoyChangePct === null ? "—" : `${s.yoyChangePct > 0 ? "+" : ""}${s.yoyChangePct.toFixed(1)}%`}
                    tone={s.yoyChangePct === null ? "muted" : s.yoyChangePct >= 0 ? "positive" : "negative"}
                  />
                  <Row label="Tx volume (12mo)" value={formatNumber(s.txVolume12mo)} />
                  <Row label="Modelled gross yield" value={`${s.grossYieldPct.toFixed(1)}%`} />
                  <Row
                    label="Modelled net yield"
                    value={netYieldPct === null ? "—" : `${netYieldPct.toFixed(1)}%`}
                    hint={sc ? `after ${sc.aedSqftYr} AED/sqft/yr service charge${sc.isDefault ? " (default estimate)" : ""}` : undefined}
                  />

                  <div className="mt-3">
                    {s.trend.length >= 2 ? (
                      <SparkAreaChart
                        data={s.trend}
                        height={120}
                        showFooter={false}
                        formatValue={(n) => `${Math.round(n).toLocaleString()} AED`}
                      />
                    ) : (
                      <p className="rounded-lg border border-card-border bg-background/30 px-3 py-6 text-center text-xs text-muted">
                        Not enough quarterly history to plot a trend
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-muted">
          Net yield uses the indicative service-charge layer (see Market Analysis) — actual
          charges vary by building.
        </p>
      </main>
    </>
  );
}

function Row({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "muted";
  hint?: string;
}) {
  const toneCls =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : tone === "muted" ? "text-muted" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-card-border/60 py-1.5 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-right text-sm font-semibold ${toneCls}`}>
        {value}
        {hint && <span className="block text-[10px] font-normal text-muted">{hint}</span>}
      </span>
    </div>
  );
}

function MomentumChip({ badge }: { badge: "surging" | "cooling" | "steady" }) {
  const styles = {
    surging: { label: "Surging", cls: "bg-positive/15 text-positive" },
    cooling: { label: "Cooling", cls: "bg-negative/15 text-negative" },
    steady: { label: "Steady", cls: "bg-muted/15 text-muted" },
  } as const;
  const s = styles[badge];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${s.cls}`}>{s.label}</span>;
}
