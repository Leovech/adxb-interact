"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";
import { FilterState } from "@/lib/filters";
import { BarChart3, TrendingUp, Ruler, MapPin } from "lucide-react";

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
  const sales = data.filter((t) => t.transactionType === "Sale");
  const rentals = data.filter((t) => t.transactionType === "Rental");

  if (data.length === 0) return null;

  const locationLabel = filters.buildingId
    ? data[0]?.building
    : filters.projectId
      ? data[0]?.project
      : filters.areaId
        ? data[0]?.area
        : "All Abu Dhabi";

  const medianSalePrice = median(sales.map((t) => t.price));
  const medianPPSF = median(sales.map((t) => t.pricePerSqft));
  const medianSize = median(sales.map((t) => t.size));
  const medianRent = median(rentals.map((t) => t.price));
  const avgPPSF =
    sales.length > 0
      ? Math.round(sales.reduce((s, t) => s + t.pricePerSqft, 0) / sales.length)
      : 0;

  const stats = [
    {
      label: "Median Sale Price",
      value: medianSalePrice > 0 ? formatAED(medianSalePrice) : "N/A",
      sub: `${formatNumber(sales.length)} sales`,
      icon: BarChart3,
    },
    {
      label: "Median AED/sqft",
      value: medianPPSF > 0 ? `AED ${formatNumber(medianPPSF)}` : "N/A",
      sub: `Avg: AED ${formatNumber(avgPPSF)}`,
      icon: TrendingUp,
    },
    {
      label: "Median Size",
      value: medianSize > 0 ? `${formatNumber(medianSize)} sqft` : "N/A",
      sub: `${formatNumber(data.length)} total transactions`,
      icon: Ruler,
    },
    {
      label: "Median Rent",
      value: medianRent > 0 ? `${formatAED(medianRent)}/yr` : "N/A",
      sub: `${formatNumber(rentals.length)} rentals`,
      icon: MapPin,
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
              <p className="mt-0.5 text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
