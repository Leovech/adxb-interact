"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";
import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Building2,
} from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

interface PriceHistoryProps {
  data: Transaction[];
}

interface QuarterData {
  label: string;
  sortKey: string;
  count: number;
  avgPrice: number;
  avgRate: number;
  changePct: number | null;
}

interface ProjectTrend {
  projectId: string;
  project: string;
  district: string;
  totalCount: number;
  latestAvgRate: number;
  quarters: QuarterData[];
  trendPositive: boolean;
}

function getQuarterLabel(date: string): { label: string; sortKey: string } {
  const d = new Date(date);
  const year = d.getFullYear();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return { label: `Q${q} ${year}`, sortKey: `${year}-Q${q}` };
}

export default function PriceHistory({ data }: PriceHistoryProps) {
  const t = useT();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const projectTrends = useMemo(() => {
    if (data.length === 0) return [];

    // Group transactions by project
    const projectMap: Record<
      string,
      {
        project: string;
        district: string;
        transactions: Transaction[];
      }
    > = {};

    data.forEach((tx) => {
      if (!tx.project || !tx.ratePerSqft || tx.ratePerSqft <= 0) return;
      const key = tx.projectId || tx.project;
      if (!projectMap[key]) {
        projectMap[key] = {
          project: tx.project,
          district: tx.district,
          transactions: [],
        };
      }
      projectMap[key].transactions.push(tx);
    });

    // Build trend data for each project
    const trends: ProjectTrend[] = [];

    Object.entries(projectMap).forEach(([projectId, info]) => {
      if (info.transactions.length < 3) return;

      // Group by quarter
      const quarterMap: Record<
        string,
        { label: string; sortKey: string; prices: number[]; rates: number[] }
      > = {};

      info.transactions.forEach((tx) => {
        const { label, sortKey } = getQuarterLabel(tx.date);
        if (!quarterMap[sortKey]) {
          quarterMap[sortKey] = { label, sortKey, prices: [], rates: [] };
        }
        quarterMap[sortKey].prices.push(tx.price);
        quarterMap[sortKey].rates.push(tx.ratePerSqft);
      });

      const sortedQuarters = Object.values(quarterMap).sort((a, b) =>
        a.sortKey.localeCompare(b.sortKey)
      );

      if (sortedQuarters.length < 2) return;

      // Calculate quarterly averages with change %
      const quarters: QuarterData[] = sortedQuarters.map((q, idx) => {
        const avgPrice = Math.round(
          q.prices.reduce((a, b) => a + b, 0) / q.prices.length
        );
        const avgRate = Math.round(
          q.rates.reduce((a, b) => a + b, 0) / q.rates.length
        );

        let changePct: number | null = null;
        if (idx > 0) {
          const prevRates = sortedQuarters[idx - 1].rates;
          const prevAvgRate = Math.round(
            prevRates.reduce((a, b) => a + b, 0) / prevRates.length
          );
          if (prevAvgRate > 0) {
            changePct =
              Math.round(((avgRate - prevAvgRate) / prevAvgRate) * 1000) / 10;
          }
        }

        return {
          label: q.label,
          sortKey: q.sortKey,
          count: q.prices.length,
          avgPrice,
          avgRate,
          changePct,
        };
      });

      const firstRate = quarters[0].avgRate;
      const lastRate = quarters[quarters.length - 1].avgRate;

      trends.push({
        projectId,
        project: info.project,
        district: info.district,
        totalCount: info.transactions.length,
        latestAvgRate: lastRate,
        quarters,
        trendPositive: lastRate >= firstRate,
      });
    });

    // Sort by transaction count descending
    trends.sort((a, b) => b.totalCount - a.totalCount);
    return trends;
  }, [data]);

  if (projectTrends.length === 0) {
    return null;
  }

  const displayed = showAll ? projectTrends : projectTrends.slice(0, 10);

  return (
    <div className="rounded-xl border border-card-border bg-card-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("price_trends")}
            </h2>
            <p className="text-xs text-muted">
              {t("price_trends_subtitle")}
              {" "}&bull;{" "}
              {formatNumber(projectTrends.length)} {t("projects_tracked")}
            </p>
          </div>
        </div>
      </div>

      {/* Project rows */}
      <div className="divide-y divide-card-border">
        {displayed.map((trend) => {
          const isExpanded = expandedProject === trend.projectId;

          return (
            <div key={trend.projectId}>
              {/* Summary row */}
              <button
                onClick={() =>
                  setExpandedProject(isExpanded ? null : trend.projectId)
                }
                className="flex w-full items-center gap-4 px-5 py-3.5 text-start transition-colors hover:bg-input-bg/30"
              >
                {/* Trend badge */}
                <div
                  className={`flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg ${
                    trend.trendPositive ? "bg-positive/10" : "bg-negative/10"
                  }`}
                >
                  {trend.trendPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-positive" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-negative" />
                  )}
                  <span
                    className={`mt-0.5 text-[10px] font-bold ${
                      trend.trendPositive ? "text-positive" : "text-negative"
                    }`}
                  >
                    {trend.trendPositive ? t("up") : t("down")}
                  </span>
                </div>

                {/* Project info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <p className="truncate text-sm font-medium text-foreground">
                      {trend.project}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {trend.district} &bull; {formatNumber(trend.totalCount)}{" "}
                    {t("transactions_label")} &bull; {trend.quarters.length} {t("quarters_label")}
                  </p>
                </div>

                {/* Latest rate */}
                <div className="hidden text-end sm:block">
                  <p className="text-xs text-muted">{t("latest_avg_rate")}</p>
                  <p className="text-sm font-semibold text-foreground">
                    AED {formatNumber(trend.latestAvgRate)}/sqft
                  </p>
                </div>

                {/* Expand icon */}
                <div className="shrink-0 text-muted">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expanded quarterly table */}
              {isExpanded && (
                <div className="animate-fade-in bg-input-bg/20 px-5 py-3">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          <th className="pb-2 text-start">{t("quarter")}</th>
                          <th className="pb-2 text-end">{t("transactions_label")}</th>
                          <th className="pb-2 text-end">{t("avg_price")}</th>
                          <th className="pb-2 text-end">{t("avg_rate_sqft")}</th>
                          <th className="pb-2 text-end">{t("change")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trend.quarters.map((q) => (
                          <tr
                            key={q.sortKey}
                            className="border-t border-card-border/50 text-sm"
                          >
                            <td className="py-2 font-medium text-foreground">
                              {q.label}
                            </td>
                            <td className="py-2 text-end text-muted">
                              {formatNumber(q.count)}
                            </td>
                            <td className="py-2 text-end font-semibold text-foreground">
                              {formatAED(q.avgPrice)}
                            </td>
                            <td className="py-2 text-end text-muted">
                              AED {formatNumber(q.avgRate)}
                            </td>
                            <td className="py-2 text-end">
                              {q.changePct !== null ? (
                                <span
                                  className={`text-xs font-bold ${
                                    q.changePct >= 0
                                      ? "text-positive"
                                      : "text-negative"
                                  }`}
                                >
                                  {q.changePct >= 0 ? "+" : ""}
                                  {q.changePct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {projectTrends.length > 10 && (
        <div className="border-t border-card-border px-5 py-3 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-accent hover:underline"
          >
            {showAll
              ? t("show_less")
              : t("show_all_projects", formatNumber(projectTrends.length))}
          </button>
        </div>
      )}
    </div>
  );
}
