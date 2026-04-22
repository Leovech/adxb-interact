"use client";

/**
 * Results summary panel for Listings vs Sales.
 *
 * Shows at a glance:
 *  - Overall price extremes (highest / lowest asking)
 *  - Grouped by property type → sorted by bedrooms
 *  - Per-row: bedroom label, listing count, size range (smallest → biggest),
 *    asking median, recent market median, premium/discount badge
 */

import { useMemo } from "react";
import { ListingGroup } from "@/lib/mls-data";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Ruler,
} from "lucide-react";

interface Props {
  groups: ListingGroup[];
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function brLabel(br: number): string {
  if (br === 0) return "Studio";
  if (br >= 6) return "6+ BR";
  return `${br} BR`;
}

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

const TYPE_ORDER = ["Apartment", "Penthouse", "Duplex", "Townhouse", "Villa"];
function typeRank(t: string): number {
  const idx = TYPE_ORDER.indexOf(t);
  return idx >= 0 ? idx : 99;
}

interface TypeGroup {
  propertyType: string;
  rows: BRRow[];
}

interface BRRow {
  bedrooms: number;
  label: string;
  listingCount: number;
  projects: number;
  sizeMin: number;
  sizeMax: number;
  sizeMedian: number;
  askMedian: number;
  askMin: number;
  askMax: number;
  recentMedian: number;
  premiumPct: number;
}

export default function ResultsSummary({ groups }: Props) {
  const { overallHigh, overallLow, typeGroups } = useMemo(() => {
    if (groups.length === 0)
      return { overallHigh: null, overallLow: null, typeGroups: [] };

    // Overall extremes
    let overallHigh = groups[0];
    let overallLow = groups[0];
    for (const g of groups) {
      if (g.askPriceMax > overallHigh.askPriceMax) overallHigh = g;
      if (g.askPriceMin < overallLow.askPriceMin) overallLow = g;
    }

    // Group by propertyType then bedrooms
    const byType = new Map<string, Map<number, ListingGroup[]>>();
    for (const g of groups) {
      let typeMap = byType.get(g.propertyType);
      if (!typeMap) {
        typeMap = new Map();
        byType.set(g.propertyType, typeMap);
      }
      let brList = typeMap.get(g.bedrooms);
      if (!brList) {
        brList = [];
        typeMap.set(g.bedrooms, brList);
      }
      brList.push(g);
    }

    const typeGroups: TypeGroup[] = [];
    for (const [pType, brMap] of byType) {
      const rows: BRRow[] = [];
      for (const [br, cohorts] of brMap) {
        const allListings = cohorts.flatMap((c) => c.listings);
        const sizes = allListings.map((l) => l.sizeSqft);
        const askPrices = allListings.map((l) => l.askingPrice);
        const recentMedians = cohorts.map((c) => c.recentMedianPrice);
        const premiums = cohorts.map((c) => c.premiumPct);

        rows.push({
          bedrooms: br,
          label: brLabel(br),
          listingCount: allListings.length,
          projects: cohorts.length,
          sizeMin: Math.min(...sizes),
          sizeMax: Math.max(...sizes),
          sizeMedian: Math.round(median(sizes)),
          askMedian: Math.round(median(askPrices)),
          askMin: Math.min(...askPrices),
          askMax: Math.max(...askPrices),
          recentMedian: Math.round(median(recentMedians)),
          premiumPct: Math.round(median(premiums) * 10) / 10,
        });
      }
      rows.sort((a, b) => a.bedrooms - b.bedrooms);
      typeGroups.push({ propertyType: pType, rows });
    }
    typeGroups.sort((a, b) => typeRank(a.propertyType) - typeRank(b.propertyType));

    return { overallHigh, overallLow, typeGroups };
  }, [groups]);

  if (groups.length === 0 || !overallHigh || !overallLow) return null;

  return (
    <section className="mb-6 rounded-xl border border-card-border bg-card-bg">
      <div className="flex items-center gap-3 border-b border-card-border px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
          <BarChart3 className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Results Summary</h2>
          <p className="text-xs text-muted">
            {groups.length} project cohort{groups.length === 1 ? "" : "s"} · sorted by type & bedrooms
          </p>
        </div>
      </div>

      {/* Price extremes */}
      <div className="grid grid-cols-1 gap-3 border-b border-card-border px-5 py-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-positive/25 bg-positive/5 p-3">
          <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-positive">Lowest asking</p>
            <p className="text-lg font-bold text-foreground">AED {formatAED(overallLow.askPriceMin)}</p>
            <p className="text-xs text-muted">
              {overallLow.project} · {brLabel(overallLow.bedrooms)} · {overallLow.district}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-accent/25 bg-accent/5 p-3">
          <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Highest asking</p>
            <p className="text-lg font-bold text-foreground">AED {formatAED(overallHigh.askPriceMax)}</p>
            <p className="text-xs text-muted">
              {overallHigh.project} · {brLabel(overallHigh.bedrooms)} · {overallHigh.district}
            </p>
          </div>
        </div>
      </div>

      {/* Type → BR breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-input-bg text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Type</th>
              <th className="px-4 py-2.5 text-left font-semibold">BR</th>
              <th className="px-4 py-2.5 text-right font-semibold">Listings</th>
              <th className="px-4 py-2.5 text-right font-semibold">Projects</th>
              <th className="px-4 py-2.5 text-right font-semibold">
                <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> Smallest</span>
              </th>
              <th className="px-4 py-2.5 text-right font-semibold">
                <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> Biggest</span>
              </th>
              <th className="px-4 py-2.5 text-right font-semibold">Asking median</th>
              <th className="px-4 py-2.5 text-right font-semibold">Ask range</th>
              <th className="px-4 py-2.5 text-right font-semibold">Closed-sale median</th>
              <th className="px-4 py-2.5 text-right font-semibold">vs Market</th>
            </tr>
          </thead>
          <tbody>
            {typeGroups.map((tg) =>
              tg.rows.map((row, i) => (
                <tr
                  key={`${tg.propertyType}|${row.bedrooms}`}
                  className="border-t border-card-border/50 hover:bg-input-bg/50"
                >
                  {/* Show type label only on the first row of each group */}
                  <td className="px-4 py-2">
                    {i === 0 ? (
                      <span className="text-xs font-semibold text-foreground">{tg.propertyType}</span>
                    ) : (
                      <span className="text-xs text-muted/40">″</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs font-semibold text-foreground">{row.label}</td>
                  <td className="px-4 py-2 text-right text-xs text-foreground">{row.listingCount}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted">{row.projects}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted">
                    {row.sizeMin.toLocaleString()} sqft
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-foreground">
                    {row.sizeMax.toLocaleString()} sqft
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-semibold text-foreground">
                    AED {formatAED(row.askMedian)}
                  </td>
                  <td className="px-4 py-2 text-right text-[11px] text-muted">
                    {formatAED(row.askMin)} – {formatAED(row.askMax)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-semibold text-accent">
                    AED {formatAED(row.recentMedian)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <PremiumBadge pct={row.premiumPct} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PremiumBadge({ pct }: { pct: number }) {
  const color =
    pct > 5
      ? "bg-negative/15 text-negative"
      : pct < -2
      ? "bg-positive/15 text-positive"
      : "bg-muted/15 text-muted";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}
