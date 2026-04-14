"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";
import { useState, useMemo } from "react";
import { BarChart3, DollarSign, TrendingUp, Building2 } from "lucide-react";

interface KPICardsProps {
  filtered: Transaction[];
  total: Transaction[];
}

type SequenceSegment = "all" | "primary" | "secondary";
type StatusSegment = "all" | "ready" | "offplan";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const sequenceOptions: { value: SequenceSegment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
];

const statusOptions: { value: StatusSegment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "offplan", label: "Off-Plan" },
];

export default function KPICards({ filtered, total }: KPICardsProps) {
  const [seqSegment, setSeqSegment] = useState<SequenceSegment>("all");
  const [statusSegment, setStatusSegment] = useState<StatusSegment>("all");

  const segmented = useMemo(() => {
    let data = filtered;
    if (seqSegment === "primary")
      data = data.filter((t) => t.sequence === "Primary");
    if (seqSegment === "secondary")
      data = data.filter((t) => t.sequence === "Secondary");
    if (statusSegment === "ready")
      data = data.filter((t) => t.status === "Ready");
    if (statusSegment === "offplan")
      data = data.filter((t) => t.status === "Off-Plan");
    return data;
  }, [filtered, seqSegment, statusSegment]);

  const primaryDeals = segmented.filter((t) => t.sequence === "Primary");
  const secondaryDeals = segmented.filter((t) => t.sequence === "Secondary");
  const readyDeals = segmented.filter((t) => t.status === "Ready");
  const offplanDeals = segmented.filter((t) => t.status === "Off-Plan");

  const totalValue = segmented.reduce((sum, t) => sum + t.price, 0);
  const medianPrice = median(segmented.map((t) => t.price));
  const medianRate = median(
    segmented.filter((t) => t.ratePerSqft > 0).map((t) => t.ratePerSqft)
  );
  const avgSize =
    segmented.length > 0
      ? Math.round(
          segmented.reduce((sum, t) => sum + t.sizeSqft, 0) / segmented.length
        )
      : 0;

  const seqLabel =
    seqSegment === "primary"
      ? "Primary"
      : seqSegment === "secondary"
      ? "Secondary"
      : "";
  const statusLabel =
    statusSegment === "ready"
      ? "Ready"
      : statusSegment === "offplan"
      ? "Off-Plan"
      : "";
  const combinedLabel =
    [statusLabel, seqLabel].filter(Boolean).join(" ") || "All";

  const cards = [
    {
      title: "Total Transactions",
      value: formatNumber(segmented.length),
      subtitle:
        seqSegment === "all"
          ? `${formatNumber(primaryDeals.length)} primary, ${formatNumber(secondaryDeals.length)} secondary`
          : statusSegment === "all"
          ? `${formatNumber(readyDeals.length)} ready, ${formatNumber(offplanDeals.length)} off-plan`
          : `of ${formatNumber(filtered.length)} total filtered`,
      icon: BarChart3,
    },
    {
      title: "Total Value",
      value: formatAED(totalValue),
      subtitle: `Off-plan: ${formatAED(offplanDeals.reduce((s, t) => s + t.price, 0))} | Ready: ${formatAED(readyDeals.reduce((s, t) => s + t.price, 0))}`,
      icon: DollarSign,
    },
    {
      title: "Median Price",
      value: formatAED(medianPrice),
      subtitle: `Median rate: ${medianRate > 0 ? formatNumber(medianRate) : "N/A"} AED/sqft`,
      icon: TrendingUp,
    },
    {
      title: "Avg Size",
      value: `${formatNumber(avgSize)} sqft`,
      subtitle:
        statusSegment === "all"
          ? `${formatNumber(offplanDeals.length)} off-plan, ${formatNumber(readyDeals.length)} ready`
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
            {sequenceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeqSegment(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  seqSegment === opt.value
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
        {(seqSegment !== "all" || statusSegment !== "all") && (
          <span className="ml-auto text-xs font-semibold text-accent">
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
