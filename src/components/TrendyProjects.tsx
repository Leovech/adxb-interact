"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatNumber } from "@/lib/filters";
import { useState, useMemo } from "react";
import { Flame, TrendingUp, Building2, ChevronDown, ChevronUp, Award } from "lucide-react";

interface TrendyProjectsProps {
  data: Transaction[];
}

type TrendCategory = "sale_ready" | "sale_offplan" | "rental";

const categoryLabels: Record<TrendCategory, string> = {
  sale_ready: "Sale - Ready",
  sale_offplan: "Sale - Off-Plan",
  rental: "Rentals",
};

const categoryColors: Record<TrendCategory, string> = {
  sale_ready: "#c4a04e",
  sale_offplan: "#d4b46a",
  rental: "#788182",
};

interface MonthlyProjectRank {
  month: string;       // YYYY-MM
  monthLabel: string;  // Jan 2026
  projects: {
    project: string;
    area: string;
    count: number;
    rank: number;
  }[];
}

export default function TrendyProjects({ data }: TrendyProjectsProps) {
  const [category, setCategory] = useState<TrendCategory>("sale_ready");
  const [showAll, setShowAll] = useState(false);

  const monthlyRankings = useMemo(() => {
    // Filter data by category
    let categoryData: Transaction[];
    switch (category) {
      case "sale_ready":
        categoryData = data.filter(
          (t) => t.transactionType === "Sale" && t.status === "Ready"
        );
        break;
      case "sale_offplan":
        categoryData = data.filter(
          (t) => t.transactionType === "Sale" && t.status === "Off-Plan"
        );
        break;
      case "rental":
        categoryData = data.filter((t) => t.transactionType === "Rental");
        break;
    }

    // Group by month, then by project
    const byMonth: Record<string, Record<string, { project: string; area: string; count: number }>> = {};

    categoryData.forEach((tx) => {
      const m = tx.date.substring(0, 7); // YYYY-MM
      if (!byMonth[m]) byMonth[m] = {};
      const key = tx.projectId;
      if (!byMonth[m][key]) {
        byMonth[m][key] = { project: tx.project, area: tx.area, count: 0 };
      }
      byMonth[m][key].count++;
    });

    // Convert to sorted rankings
    const rankings: MonthlyProjectRank[] = Object.entries(byMonth)
      .map(([month, projects]) => {
        const sorted = Object.values(projects)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((p, i) => ({ ...p, rank: i + 1 }));

        const [year, mon] = month.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = `${monthNames[parseInt(mon) - 1]} ${year}`;

        return { month, monthLabel, projects: sorted };
      })
      .sort((a, b) => b.month.localeCompare(a.month)); // newest first

    return rankings;
  }, [data, category]);

  // Overall top projects across all months
  const overallTop = useMemo(() => {
    let categoryData: Transaction[];
    switch (category) {
      case "sale_ready":
        categoryData = data.filter(
          (t) => t.transactionType === "Sale" && t.status === "Ready"
        );
        break;
      case "sale_offplan":
        categoryData = data.filter(
          (t) => t.transactionType === "Sale" && t.status === "Off-Plan"
        );
        break;
      case "rental":
        categoryData = data.filter((t) => t.transactionType === "Rental");
        break;
    }

    const byProject: Record<string, { project: string; area: string; count: number; months: Set<string> }> = {};
    categoryData.forEach((tx) => {
      const key = tx.projectId;
      if (!byProject[key]) {
        byProject[key] = { project: tx.project, area: tx.area, count: 0, months: new Set() };
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
        area: p.area,
        totalTx: p.count,
        activeMonths: p.months.size,
      }));
  }, [data, category]);

  const displayedMonths = showAll ? monthlyRankings : monthlyRankings.slice(0, 6);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card-bg" id="trendy">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Flame className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Trendy Projects
            </h2>
            <p className="text-xs text-muted">
              Most active projects by transaction volume per month
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5">
          {(Object.keys(categoryLabels) as TrendCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
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
        <div className="border-b border-card-border p-5 lg:border-b-0 lg:border-r">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Award className="h-3.5 w-3.5" />
            Overall Top Projects ({categoryLabels[category]})
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
                  <p className="truncate text-[10px] text-muted">{p.area}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-accent">
                    {formatNumber(p.totalTx)}
                  </p>
                  <p className="text-[10px] text-muted">
                    {p.activeMonths} {p.activeMonths === 1 ? "month" : "months"}
                  </p>
                </div>
              </div>
            ))}
            {overallTop.length === 0 && (
              <p className="py-4 text-center text-xs text-muted">
                No transactions in this category
              </p>
            )}
          </div>
        </div>

        {/* Monthly Timeline */}
        <div className="col-span-2 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <TrendingUp className="h-3.5 w-3.5" />
            Monthly Breakdown
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
                    Top {month.projects.length} projects
                  </span>
                </div>

                <div className="space-y-1">
                  {month.projects.map((proj) => {
                    const maxCount = month.projects[0]?.count || 1;
                    const barWidth = (proj.count / maxCount) * 100;

                    return (
                      <div key={`${month.month}-${proj.project}`} className="flex items-center gap-2">
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
                              <span className="ml-1 text-[10px] text-muted">
                                ({proj.area})
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold" style={{ color: categoryColors[category] }}>
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
                No transactions in this category for the selected period
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
                  Show Less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show All {monthlyRankings.length} Months{" "}
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
