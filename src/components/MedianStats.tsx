"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber, FilterState } from "@/lib/filters";
import { BarChart3, TrendingUp, Ruler, Repeat } from "lucide-react";

interface MedianStatsProps {
  data: Transaction[];
  filters: FilterState;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function MedianStats({ data, filters }: MedianStatsProps) {
  if (data.length === 0) return null;

  const locationLabel = filters.project
    ? filters.project
    : filters.district
    ? filters.district
    : "All Abu Dhabi";

  const medianSalePrice = median(data.map((t) => t.price));
  const ratesWithValue = data.filter((t) => t.ratePerSqft > 0);
  const medianRate = median(ratesWithValue.map((t) => t.ratePerSqft));
  const avgRate =
    ratesWithValue.length > 0
      ? Math.round(
          ratesWithValue.reduce((s, t) => s + t.ratePerSqft, 0) /
            ratesWithValue.length
        )
      : 0;
  const sizesWithValue = data.filter((t) => t.sizeSqft > 0);
  const medianSize = median(sizesWithValue.map((t) => t.sizeSqft));

  const primaryCount = data.filter((t) => t.sequence === "Primary").length;
  const primaryPct =
    data.length > 0 ? Math.round((primaryCount / data.length) * 100) : 0;
  const secondaryPct = data.length > 0 ? 100 - primaryPct : 0;

  const stats = [
    {
      label: "Median Sale Price",
      value: medianSalePrice > 0 ? formatAED(medianSalePrice) : "N/A",
      sub: `${formatNumber(data.length)} transactions`,
      icon: BarChart3,
    },
    {
      label: "Median AED/sqft",
      value: medianRate > 0 ? `AED ${formatNumber(medianRate)}` : "N/A",
      sub: `Avg: AED ${formatNumber(avgRate)}`,
      icon: TrendingUp,
    },
    {
      label: "Median Size",
      value: medianSize > 0 ? `${formatNumber(medianSize)} sqft` : "N/A",
      sub: `${formatNumber(data.length)} total transactions`,
      icon: Ruler,
    },
    {
      label: "Primary vs Secondary",
      value: `${primaryPct}% Primary`,
      sub: `${formatNumber(primaryCount)} first sales, ${secondaryPct}% resale`,
      icon: Repeat,
    },
  ];

  return (
    <div className="rounded-xl border border-card-border bg-card-bg">
      <div className="border-b border-card-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Market Stats: <span className="text-accent">{locationLabel}</span>
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-px bg-card-border lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-start gap-3 bg-card-bg px-5 py-4"
          >
            <div className="mt-0.5 rounded-lg bg-accent/10 p-2">
              <s.icon className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {s.label}
              </p>
              <p className="mt-0.5 text-lg font-bold text-foreground">
                {s.value}
              </p>
              <p className="text-xs text-muted">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
