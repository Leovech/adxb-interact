"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";
import { useState, useMemo } from "react";
import { BarChart3, DollarSign, TrendingUp, Building2 } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

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

export default function KPICards({ filtered, total }: KPICardsProps) {
  const t = useT();
  const [seqSegment, setSeqSegment] = useState<SequenceSegment>("all");
  const [statusSegment, setStatusSegment] = useState<StatusSegment>("all");

  const sequenceOptions: { value: SequenceSegment; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "primary", label: t("primary") },
    { value: "secondary", label: t("secondary") },
  ];

  const statusOptions: { value: StatusSegment; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "ready", label: t("ready") },
    { value: "offplan", label: t("off_plan") },
  ];

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

  const totalValue = segmented.reduce((sum, tx) => sum + tx.price, 0);
  const medianPrice = median(segmented.map((tx) => tx.price));
  const medianRate = median(
    segmented.filter((tx) => tx.ratePerSqft > 0).map((tx) => tx.ratePerSqft)
  );
  const avgSize =
    segmented.length > 0
      ? Math.round(
          segmented.reduce((sum, tx) => sum + tx.sizeSqft, 0) / segmented.length
        )
      : 0;

  const seqLabel =
    seqSegment === "primary"
      ? t("primary")
      : seqSegment === "secondary"
      ? t("secondary")
      : "";
  const statusLabel =
    statusSegment === "ready"
      ? t("ready")
      : statusSegment === "offplan"
      ? t("off_plan")
      : "";
  const combinedLabel =
    [statusLabel, seqLabel].filter(Boolean).join(" ") || t("all");

  const cards = [
    {
      title: t("total_transactions"),
      value: formatNumber(segmented.length),
      subtitle:
        seqSegment === "all"
          ? `${formatNumber(primaryDeals.length)} ${t("primary_label")}, ${formatNumber(secondaryDeals.length)} ${t("secondary_label")}`
          : statusSegment === "all"
          ? `${formatNumber(readyDeals.length)} ${t("ready_label")}, ${formatNumber(offplanDeals.length)} ${t("off_plan_label")}`
          : t("of_total_filtered", formatNumber(filtered.length)),
      icon: BarChart3,
    },
    {
      title: t("total_value"),
      value: formatAED(totalValue),
      subtitle: `${t("off_plan_label")}: ${formatAED(offplanDeals.reduce((s, tx) => s + tx.price, 0))} | ${t("ready_label")}: ${formatAED(readyDeals.reduce((s, tx) => s + tx.price, 0))}`,
      icon: DollarSign,
    },
    {
      title: t("median_price"),
      value: formatAED(medianPrice),
      subtitle: `${t("median_aed_sqft")}: ${medianRate > 0 ? formatNumber(medianRate) : "N/A"}`,
      icon: TrendingUp,
    },
    {
      title: t("avg_size"),
      value: `${formatNumber(avgSize)} sqft`,
      subtitle:
        statusSegment === "all"
          ? `${formatNumber(offplanDeals.length)} ${t("off_plan_label")}, ${formatNumber(readyDeals.length)} ${t("ready_label")}`
          : `${formatNumber(segmented.length)} ${combinedLabel} ${t("transactions_label")}`,
      icon: Building2,
    },
  ];

  return (
    <div>
      {/* Segment toggles */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-card-border bg-card-bg px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t("view")}
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
            {t("status")}:
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
          <span className="ms-auto text-xs font-semibold text-accent">
            {t("showing")} {combinedLabel}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className={`animate-fade-in stagger-${i + 1} hover-lift group relative overflow-hidden rounded-xl border border-card-border bg-card-bg p-5 hover:border-accent/40`}
          >
            {/* accent wash on hover */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 transition-colors duration-300 group-hover:from-accent/[0.04] group-hover:to-transparent" />
            <div className="absolute end-3 top-3 rounded-lg bg-accent/10 p-2 transition-colors group-hover:bg-accent/20">
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
