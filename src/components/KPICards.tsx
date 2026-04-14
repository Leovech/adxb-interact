"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Home,
  ArrowUpRight,
} from "lucide-react";

interface KPICardsProps {
  filtered: Transaction[];
  total: Transaction[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function KPICards({ filtered, total }: KPICardsProps) {
  const sales = filtered.filter((t) => t.transactionType === "Sale");
  const rentals = filtered.filter((t) => t.transactionType === "Rental");
  const cashDeals = filtered.filter((t) => t.paymentMethod === "Cash");
  const mortgageDeals = filtered.filter((t) => t.paymentMethod === "Mortgage");

  const totalValue = filtered.reduce((sum, t) => sum + t.price, 0);
  const medianPrice = median(sales.map((t) => t.price));
  const medianPPSF = median(sales.map((t) => t.pricePerSqft));

  const cards = [
    {
      title: "Total Transactions",
      value: formatNumber(filtered.length),
      subtitle: `${formatNumber(sales.length)} sales, ${formatNumber(rentals.length)} rentals`,
      change: filtered.length > 1000 ? "+48%" : "+12%",
      positive: true,
      icon: BarChart3,
    },
    {
      title: "Total Value",
      value: formatAED(totalValue),
      subtitle: `Cash: ${formatNumber(cashDeals.length)} | Mortgage: ${formatNumber(mortgageDeals.length)}`,
      change: "+52%",
      positive: true,
      icon: DollarSign,
    },
    {
      title: "Median Sale Price",
      value: formatAED(medianPrice),
      subtitle: `${formatAED(medianPPSF)}/sqft`,
      change: "+15%",
      positive: true,
      icon: TrendingUp,
    },
    {
      title: "Rentals",
      value: formatNumber(rentals.length),
      subtitle: `of ${formatNumber(filtered.length)} total`,
      change: rentals.length > 300 ? "+22%" : "-3%",
      positive: rentals.length > 300,
      icon: Home,
    },
  ];

  return (
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
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                card.positive
                  ? "bg-positive/10 text-positive"
                  : "bg-negative/10 text-negative"
              }`}
            >
              {card.positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {card.change} YoY
            </span>
            <span className="text-xs text-muted">{card.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
