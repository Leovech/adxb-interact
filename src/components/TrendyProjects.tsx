"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatNumber } from "@/lib/filters";
import { useState, useMemo } from "react";
import {
  Flame,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

interface TrendyProjectsProps {
  data: Transaction[];
}

type TrendCategory = "sale_ready" | "sale_offplan" | "primary";

const categoryColors: Record<TrendCategory, string> = {
  sale_ready: "#d9a441",
  sale_offplan: "#e4b55c",
  primary: "#7fb685",
};

interface MonthlyProjectRank {
  month: string;
  monthLabel: string;
  projects: {
    project: string;
    district: string;
    count: number;
    rank: number;
  }[];
}

function filterByCategory(
  data: Transaction[],
  category: TrendCategory
): Transaction[] {
  switch (category) {
    case "sale_ready":
      return data.filter((t) => t.status === "Ready");
    case "sale_offplan":
      return data.filter((t) => t.status === "Off-Plan");
    case "primary":
      return data.filter((t) => t.sequence === "Primary");
  }
}

export default function TrendyProjects({ data }: TrendyProjectsProps) {
  const t = useT();
  const [category, setCategory] = useState<TrendCategory>("sale_ready");
  const [showAll, setShowAll] = useState(false);

  const categoryLabels: Record<TrendCategory, string> = {
    sale_ready: t("sale_ready"),
    sale_offplan: t("sale_offplan"),
    primary: t("primary_sales"),
  };

  const monthlyRankings = useMemo(() => {
    const categoryData = filterByCategory(data, category);

    const byMonth: Record<
      string,
      Record<string, { project: string; district: string; count: number }>
    > = {};

    categoryData.forEach((tx) => {
      const m = tx.date.substring(0, 7);
      if (!byMonth[m]) byMonth[m] = {};
      const key = tx.projectId;
      if (!byMonth[m][key]) {
        byMonth[m][key] = {
          project: tx.project,
          district: tx.district,
          count: 0,
        };
      }
      byMonth[m][key].count++;
    });

    const rankings: MonthlyProjectRank[] = Object.entries(byMonth)
      .map(([month, projects]) => {
        const sorted = Object.values(projects)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((p, i) => ({ ...p, rank: i + 1 }));

        const [year, mon] = month.split("-");
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const monthLabel = `${monthNames[parseInt(mon) - 1]} ${year}`;

        return { month, monthLabel, projects: sorted };
      })
      .sort((a, b) => b.month.localeCompare(a.month));

    return rankings;
  }, [data, category]);

  const overallTop = useMemo(() => {
    const categoryData = filterByCategory(data, category);

    const byProject: Record<
      string,
      {
        project: string;
        district: string;
        count: number;
        months: Set<string>;
      }
    > = {};

    categoryData.forEach((tx) => {
      const key = tx.projectId;
      if (!byProject[key]) {
        byProject[key] = {
          project: tx.project,
          district: tx.district,
          count: 0,
          months: new Set(),
        };
      }
      byProject[key].count++;
      byProject[key].months.add(tx.date.substring(0, 7));
    });

    return Object.values(byProject)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        project: p.project,
        district: p.district,
        totalTx: p.count,
        activeMonths: p.months.size,
      }));
  }, [data, category]);

  const displayedMonths = showAll
    ? monthlyRankings
    : monthlyRankings.slice(0, 6);

  if (data.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-card-border bg-card-bg"
      id="trendy"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Flame className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("trendy_projects")}
            </h2>
            <p className="text-xs text-muted">
              {t("trendy_subtitle")}
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5">
          {(Object.keys(categoryLabels) as TrendCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setShowAll(false);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                category === cat
                  ? "bg-accent text-background shadow-sm shadow-accent/25"
                  : "bg-input-bg text-muted hover:bg-input-border hover:text-foreground"
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">
        {/* Overall Leaderboard */}
        <div className="border-b border-card-border p-5 lg:border-b-0 lg:border-e">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Award className="h-3.5 w-3.5" />
            {t("overall_top")} ({categoryLabels[category]})
          </h3>
          <div className="space-y-2">
            {overallTop.map((p) => (
              <div
                key={p.project}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-input-bg"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    p.rank <= 3
                      ? "bg-accent/20 text-accent"
                      : "bg-input-bg text-muted"
                  }`}
                >
                  {p.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {p.project}
                  </p>
                  <p className="truncate text-[10px] text-muted">
                    {p.district}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xs font-semibold text-accent">
                    {formatNumber(p.totalTx)}
                  </p>
                  <p className="text-[10px] text-muted">
                    {p.activeMonths}{" "}
                    {p.activeMonths === 1 ? t("month_label") : t("months_label")}
                  </p>
                </div>
              </div>
            ))}
            {overallTop.length === 0 && (
              <p className="py-4 text-center text-xs text-muted">
                {t("no_transactions_category")}
              </p>
            )}
          </div>
        </div>

        {/* Monthly Timeline */}
        <div className="col-span-2 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <TrendingUp className="h-3.5 w-3.5" />
            {t("monthly_breakdown")}
          </h3>

          <div className="space-y-3">
            {displayedMonths.map((month) => (
              <div
                key={month.month}
                className="rounded-lg border border-card-border bg-background/30 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-accent">
                    {month.monthLabel}
                  </span>
                  <span className="text-[10px] text-muted">
                    {t("top_projects", month.projects.length.toString())}
                  </span>
                </div>

                <div className="space-y-1">
                  {month.projects.map((proj) => {
                    const maxCount = month.projects[0]?.count || 1;
                    const barWidth = (proj.count / maxCount) * 100;

                    return (
                      <div
                        key={`${month.month}-${proj.project}`}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                            proj.rank === 1
                              ? "bg-accent/20 text-accent"
                              : "text-muted"
                          }`}
                        >
                          {proj.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-foreground">
                              {proj.project}
                              <span className="ms-1 text-[10px] text-muted">
                                ({proj.district})
                              </span>
                            </span>
                            <span
                              className="shrink-0 text-xs font-semibold"
                              style={{ color: categoryColors[category] }}
                            >
                              {proj.count}
                            </span>
                          </div>
                          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-input-bg">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: categoryColors[category],
                                opacity: 0.6 + 0.4 * (barWidth / 100),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {monthlyRankings.length === 0 && (
              <p className="py-8 text-center text-xs text-muted">
                {t("no_transactions_period")}
              </p>
            )}
          </div>

          {/* Show More/Less */}
          {monthlyRankings.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-card-border py-2 text-xs font-medium text-accent transition-colors hover:bg-input-bg"
            >
              {showAll ? (
                <>
                  {t("show_less")} <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  {t("show_all_months", monthlyRankings.length.toString())}{" "}
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
