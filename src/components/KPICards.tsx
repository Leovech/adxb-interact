"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";
import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Home,
  ArrowUpRight,
  Building2,
  Landmark,
  Banknote,
} from "lucide-react";

interface KPICardsProps {
  filtered: Transaction[];
  total: Transaction[];
}

type DealSegment = "all" | "sale" | "rental";
type StatusSegment = "all" | "ready" | "offplan";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const dealOptions: { value: DealSegment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sale", label: "Sales" },
  { value: "rental", label: "Rentals" },
];

const statusOptions: { value: StatusSegment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "offplan", label: "Off-Plan" },
];

export default function KPICards({ filtered, total }: KPICardsProps) {
  const [dealSegment, setDealSegment] = useState<DealSegment>("all");
  const [statusSegment, setStatusSegment] = useState<StatusSegment>("all");

  const segmented = useMemo(() => {
    let data = filtered;
    if (dealSegment === "sale") data = data.filter((t) => t.transactionType === "Sale");
    if (dealSegment === "rental") data = data.filter((t) => t.transactionType === "Rental");
    if (statusSegment === "ready") data = data.filter((t) => t.status === "Ready");
    if (statusSegment === "offplan") data = data.filter((t) => t.status === "Off-Plan");
    return data;
  }, [filtered, dealSegment, statusSegment]);

  const sales = segmented.filter((t) => t.transactionType === "Sale");
  const rentals = segmented.filter((t) => t.transactionType === "Rental");
  const cashDeals = segmented.filter((t) => t.paymentMethod === "Cash");
  const mortgageDeals = segmented.filter((t) => t.paymentMethod === "Mortgage");
  const readyDeals = segmented.filter((t) => t.status === "Ready");
  const offplanDeals = segmented.filter((t) => t.status === "Off-Plan");

  const totalValue = segmented.reduce((sum, t) => sum + t.price, 0);
  const medianPrice = median(sales.map((t) => t.price));
  const medianPPSF = median(sales.map((t) => t.pricePerSqft));
  const medianRent = median(rentals.map((t) => t.price));
  const avgSize = segmented.length > 0
    ? Math.round(segmented.reduce((sum, t) => sum + t.size, 0) / segmented.length)
    : 0;

  const segmentLabel =
    dealSegment === "sale"
      ? "Sale"
      : dealSegment === "rental"
      ? "Rental"
      : "";
  const statusLabel =
    statusSegment === "ready"
      ? "Ready"
      : statusSegment === "offplan"
      ? "Off-Plan"
      : "";
  const combinedLabel = [statusLabel, segmentLabel].filter(Boolean).join(" ") || "All";

  const cards = [
    {
      title: "Transactions",
      value: formatNumber(segmented.length),
      subtitle:
        dealSegment === "all"
          ? `${formatNumber(sales.length)} sales, ${formatNumber(rentals.length)} rentals`
          : statusSegment === "all"
          ? `${formatNumber(readyDeals.length)} ready, ${formatNumber(offplanDeals.length)} off-plan`
          : `of ${formatNumber(filtered.length)} total filtered`,
      icon: BarChart3,
    },
    {
      title: "Total Value",
      value: formatAED(totalValue),
      subtitle: `Cash: ${formatNumber(cashDeals.length)} | Mortgage: ${formatNumber(mortgageDeals.length)}`,
      icon: DollarSign,
    },
    {
      title: dealSegment === "rental" ? "Median Rent" : "Median Sale Price",
      value: dealSegment === "rental" ? formatAED(medianRent) : formatAED(medianPrice),
      subtitle:
        dealSegment === "rental"
          ? `${formatNumber(rentals.length)} rentals`
          : `${formatAED(medianPPSF)}/sqft`,
      icon: dealSegment === "rental" ? Banknote : TrendingUp,
    },
    {
      title: "Avg Size",
      value: `${formatNumber(avgSize)} sqft`,
      subtitle:
        statusSegment === "all"
          ? `${formatNumber(readyDeals.length)} ready, ${formatNumber(offplanDeals.length)} off-plan`
          : `${formatNumber(segmented.length)} ${combinedLabel} transactions`,
      icon: Building2,
    },
  ];

  return (
    <div>
      {/* Segment toggles */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-card-border bg-card-bg px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            View:
          </span>
          <div className="flex gap-1">
            {dealOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDealSegment(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  dealSegment === opt.value
                    ? "bg-accent text-background shadow-sm shadow-accent/25"
                    : "bg-input-bg text-muted hover:bg-input-border hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-5 w-px bg-card-border" />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Status:
          </span>
          <div className="flex gap-1">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusSegment(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  statusSegment === opt.value
                    ? "bg-accent text-background shadow-sm shadow-accent/25"
                    : "bg-input-bg text-muted hover:bg-input-border hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {(dealSegment !== "all" || statusSegment !== "all") && (
          <span className="ml-auto text-xs text-accent font-semibold">
            Showing: {combinedLabel}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className={`animate-fade-in stagger-${i + 1} group relative overflow-hidden rounded-xl border border-card-border bg-card-bg p-5 transition-all hover:border-accent/30`}
          >
            <div className="absolute right-3 top-3 rounded-lg bg-accent/10 p-2">
              <card.icon className="h-4 w-4 text-accent" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              {card.title}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {card.value}
            </p>
            <div className="mt-2">
              <span className="text-xs text-muted">{card.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
