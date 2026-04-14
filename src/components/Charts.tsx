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
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface ChartsProps {
  data: Transaction[];
}

const COLORS = [
  "#c4a04e",  // brass
  "#d4b46a",  // light brass
  "#a08535",  // dark brass
  "#e3c882",  // pale gold
  "#7cb87a",  // sage green
  "#8b7340",  // antique brass
  "#788182",  // cool gray
  "#b0aca7",  // warm gray
  "#5c6d2e",  // olive
  "#c95d4a",  // terracotta
];

const tooltipStyle = {
  contentStyle: {
    background: "#222d30",
    border: "1px solid #374144",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#f1decb",
  },
  labelStyle: { color: "#b0aca7" },
};

export default function Charts({ data }: ChartsProps) {
  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const byMonth: Record<
      string,
      { month: string; count: number; value: number; avgPPSF: number; prices: number[] }
    > = {};
    data.forEach((tx) => {
      const m = tx.date.substring(0, 7); // YYYY-MM
      if (!byMonth[m]) {
        byMonth[m] = { month: m, count: 0, value: 0, avgPPSF: 0, prices: [] };
      }
      byMonth[m].count++;
      byMonth[m].value += tx.price;
      if (tx.transactionType !== "Rental") {
        byMonth[m].prices.push(tx.pricePerSqft);
      }
    });
    return Object.values(byMonth)
      .map((m) => ({
        month: m.month,
        count: m.count,
        value: m.value,
        avgPPSF:
          m.prices.length > 0
            ? Math.round(m.prices.reduce((a, b) => a + b, 0) / m.prices.length)
            : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  // Area breakdown
  const areaBreakdown = useMemo(() => {
    const byArea: Record<string, { area: string; count: number; value: number }> = {};
    data.forEach((tx) => {
      if (!byArea[tx.area]) {
        byArea[tx.area] = { area: tx.area, count: 0, value: 0 };
      }
      byArea[tx.area].count++;
      byArea[tx.area].value += tx.price;
    });
    return Object.values(byArea).sort((a, b) => b.count - a.count);
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

  // Transaction type split
  const txTypeSplit = useMemo(() => {
    const byType: Record<string, number> = {};
    data.forEach((tx) => {
      byType[tx.transactionType] = (byType[tx.transactionType] || 0) + 1;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" id="trends">
      {/* Monthly Transaction Volume */}
      <div className="rounded-xl border border-card-border bg-card-bg p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Monthly Transaction Volume
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c4a04e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#c4a04e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374144" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#b0aca7" }}
              tickFormatter={(v) => {
                const [y, m] = v.split("-");
                return `${m}/${y.slice(2)}`;
              }}
            />
            <YAxis tick={{ fontSize: 11, fill: "#b0aca7" }} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [Number(value).toLocaleString(), "Transactions"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#c4a04e"
              fill="url(#volumeGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Average Price per Sqft Trend */}
      <div className="rounded-xl border border-card-border bg-card-bg p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Avg Price per Sqft (AED)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374144" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#b0aca7" }}
              tickFormatter={(v) => {
                const [y, m] = v.split("-");
                return `${m}/${y.slice(2)}`;
              }}
            />
            <YAxis tick={{ fontSize: 11, fill: "#b0aca7" }} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [
                `AED ${Number(value).toLocaleString()}`,
                "Avg/sqft",
              ]}
            />
            <Line
              type="monotone"
              dataKey="avgPPSF"
              stroke="#d4b46a"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Area Breakdown */}
      <div className="rounded-xl border border-card-border bg-card-bg p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Transactions by Area
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={areaBreakdown.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374144" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#b0aca7" }} />
            <YAxis
              type="category"
              dataKey="area"
              width={120}
              tick={{ fontSize: 11, fill: "#b0aca7" }}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [Number(value).toLocaleString(), "Transactions"]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {areaBreakdown.slice(0, 10).map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Property Type & Transaction Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-card-border bg-card-bg p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Property Types
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
                formatter={(value) => [Number(value).toLocaleString(), "Count"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-card-border bg-card-bg p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Deal Types
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={txTypeSplit}
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
                {txTypeSplit.map((entry, i) => (
                  <Cell key={i} fill={entry.name === "Sale" ? "#c4a04e" : "#788182"} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(value) => [Number(value).toLocaleString(), "Count"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
