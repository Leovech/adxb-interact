"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED } from "@/lib/filters";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useT } from "@/i18n/LanguageContext";

interface ChartsProps {
  data: Transaction[];
}

const COLORS = [
  "#d9a441",
  "#e4b55c",
  "#b8823a",
  "#eec97a",
  "#7fb685",
  "#8c6f3f",
  "#8a8275",
  "#a89f92",
  "#66763a",
  "#c97a6d",
];

const tooltipStyle = {
  contentStyle: {
    background: "#211e1a",
    border: "1px solid #383329",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#ede9e3",
  },
  labelStyle: { color: "#a89f92" },
};

export default function Charts({ data }: ChartsProps) {
  const t = useT();

  // Monthly transaction volume
  const monthlyVolume = useMemo(() => {
    const byMonth: Record<string, number> = {};
    data.forEach((tx) => {
      const m = tx.date.substring(0, 7);
      byMonth[m] = (byMonth[m] || 0) + 1;
    });
    return Object.entries(byMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  // Average rate per sqft trend
  const avgRateTrend = useMemo(() => {
    const byMonth: Record<string, { total: number; count: number }> = {};
    data.forEach((tx) => {
      const m = tx.date.substring(0, 7);
      if (!byMonth[m]) byMonth[m] = { total: 0, count: 0 };
      if (tx.ratePerSqft > 0) {
        byMonth[m].total += tx.ratePerSqft;
        byMonth[m].count++;
      }
    });
    return Object.entries(byMonth)
      .map(([month, { total, count }]) => ({
        month,
        avgRate: count > 0 ? Math.round(total / count) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  // Top 10 districts by transaction count
  const districtBreakdown = useMemo(() => {
    const byDistrict: Record<string, number> = {};
    data.forEach((tx) => {
      byDistrict[tx.district] = (byDistrict[tx.district] || 0) + 1;
    });
    return Object.entries(byDistrict)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  // Property type distribution
  const typeDistribution = useMemo(() => {
    const byType: Record<string, number> = {};
    data.forEach((tx) => {
      byType[tx.propertyType] = (byType[tx.propertyType] || 0) + 1;
    });
    return Object.entries(byType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Off-Plan vs Ready split
  const statusSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((tx) => {
      const label =
        tx.status === "Off-Plan"
          ? t("off_plan")
          : tx.status === "Ready"
            ? t("ready")
            : t("other");
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, t]);

  const formatMonth = (v: string) => {
    const [y, m] = v.split("-");
    return `${m}/${y.slice(2)}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" id="trends">
      {/* Monthly Transaction Volume */}
      <div className="rounded-xl border border-card-border bg-card-bg p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          {t("monthly_volume")}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyVolume}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d9a441" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#d9a441" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#383329" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#a89f92" }}
              tickFormatter={formatMonth}
            />
            <YAxis tick={{ fontSize: 11, fill: "#a89f92" }} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [
                Number(value).toLocaleString(),
                t("transactions_label"),
              ]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#d9a441"
              fill="url(#volumeGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Average Rate per Sqft Trend */}
      <div className="rounded-xl border border-card-border bg-card-bg p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          {t("avg_rate_trend")}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={avgRateTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#383329" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#a89f92" }}
              tickFormatter={formatMonth}
            />
            <YAxis tick={{ fontSize: 11, fill: "#a89f92" }} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [
                `AED ${Number(value).toLocaleString()}`,
                t("avg_sqft"),
              ]}
            />
            <Line
              type="monotone"
              dataKey="avgRate"
              stroke="#e4b55c"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions by District */}
      <div className="rounded-xl border border-card-border bg-card-bg p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          {t("transactions_by_district")}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={districtBreakdown} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#383329" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#a89f92" }} />
            <YAxis
              type="category"
              dataKey="district"
              width={120}
              tick={{ fontSize: 11, fill: "#a89f92" }}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [
                Number(value).toLocaleString(),
                t("transactions_label"),
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {districtBreakdown.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Property Types + Status Split */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-card-border bg-card-bg p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t("property_types")}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
                style={{ fontSize: 10 }}
              >
                {typeDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(value) => [
                  Number(value).toLocaleString(),
                  t("count"),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-card-border bg-card-bg p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t("off_plan_vs_ready")}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusSplit}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
                style={{ fontSize: 10 }}
              >
                {statusSplit.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.name === t("off_plan")
                        ? "#d9a441"
                        : entry.name === t("ready")
                          ? "#7fb685"
                          : "#8a8275"
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(value) => [
                  Number(value).toLocaleString(),
                  t("count"),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
