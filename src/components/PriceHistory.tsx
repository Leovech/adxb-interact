"use client";

import { Transaction, getRepeatSaleUnits } from "@/data/abu-dhabi";
import { formatAED } from "@/lib/filters";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, History, ChevronDown, ChevronUp } from "lucide-react";

interface PriceHistoryProps {
  data: Transaction[];
}

export default function PriceHistory({ data }: PriceHistoryProps) {
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const repeatUnits = useMemo(() => getRepeatSaleUnits(data), [data]);

  if (repeatUnits.length === 0) {
    return null;
  }

  const displayed = showAll ? repeatUnits : repeatUnits.slice(0, 10);

  return (
    <div className="rounded-xl border border-card-border bg-card-bg">
      <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <History className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Price History - Repeat Sales
            </h2>
            <p className="text-xs text-muted">
              {repeatUnits.length} units with multiple transactions - see how prices
              changed
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-card-border">
        {displayed.map((unit) => {
          const isExpanded = expandedUnit === unit.key;
          const first = unit.history[0];
          const last = unit.history[unit.history.length - 1];
          const positive = unit.priceChange >= 0;

          return (
            <div key={unit.key}>
              {/* Summary row */}
              <button
                onClick={() =>
                  setExpandedUnit(isExpanded ? null : unit.key)
                }
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-input-bg/30"
              >
                {/* Change badge */}
                <div
                  className={`flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg ${
                    positive ? "bg-positive/10" : "bg-negative/10"
                  }`}
                >
                  {positive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-positive" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-negative" />
                  )}
                  <span
                    className={`text-xs font-bold ${
                      positive ? "text-positive" : "text-negative"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {unit.priceChange}%
                  </span>
                </div>

                {/* Unit info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {unit.building}{" "}
                    <span className="text-muted">- Unit {unit.history[0].unitNumber}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {unit.area} &bull; {unit.project} &bull;{" "}
                    {unit.history.length} transactions
                  </p>
                </div>

                {/* Price range */}
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-muted">
                    {first.date} &rarr; {last.date}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatAED(first.price)} &rarr; {formatAED(last.price)}
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

              {/* Expanded history */}
              {isExpanded && (
                <div className="animate-fade-in bg-input-bg/20 px-5 py-3">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        <th className="pb-2 text-left">#</th>
                        <th className="pb-2 text-left">Date</th>
                        <th className="pb-2 text-right">Price</th>
                        <th className="pb-2 text-right">AED/sqft</th>
                        <th className="pb-2 text-right">Size</th>
                        <th className="pb-2 text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unit.history.map((tx, idx) => {
                        const prev = idx > 0 ? unit.history[idx - 1] : null;
                        const pctChange = prev
                          ? ((tx.price - prev.price) / prev.price) * 100
                          : null;
                        return (
                          <tr
                            key={tx.id}
                            className="border-t border-card-border/50 text-sm"
                          >
                            <td className="py-2 text-muted">{idx + 1}</td>
                            <td className="py-2 text-foreground">{tx.date}</td>
                            <td className="py-2 text-right font-semibold text-foreground">
                              {formatAED(tx.price)}
                            </td>
                            <td className="py-2 text-right text-muted">
                              {tx.pricePerSqft.toLocaleString()}
                            </td>
                            <td className="py-2 text-right text-muted">
                              {tx.size.toLocaleString()} sqft
                            </td>
                            <td className="py-2 text-right">
                              {pctChange !== null ? (
                                <span
                                  className={`text-xs font-bold ${
                                    pctChange >= 0
                                      ? "text-positive"
                                      : "text-negative"
                                  }`}
                                >
                                  {pctChange >= 0 ? "+" : ""}
                                  {pctChange.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {repeatUnits.length > 10 && (
        <div className="border-t border-card-border px-5 py-3 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-accent hover:underline"
          >
            {showAll
              ? "Show Less"
              : `Show All ${repeatUnits.length} Units`}
          </button>
        </div>
      )}
    </div>
  );
}
