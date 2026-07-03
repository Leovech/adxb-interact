"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Transaction, decodeTransactions } from "@/data/abu-dhabi";
import { buildCompareStats } from "@/lib/analytics/compare";
import { useWatchlist } from "@/lib/watchlist";
import { Star, X, Compass, ArrowUpRight } from "lucide-react";

export default function WatchlistView() {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { items, remove } = useWatchlist();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/data/transactions.json", { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to load market data");
        const json = await res.json();
        if (!cancelled) setAllData(decodeTransactions(json));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!allData.length) return [];
    return items
      .map((item) => {
        const stats = buildCompareStats(allData, item.type, item.name);
        const currentRate = stats?.medianRateSqft ?? item.savedRateSqft;
        const changePct =
          item.savedRateSqft > 0 ? ((currentRate - item.savedRateSqft) / item.savedRateSqft) * 100 : 0;
        return { item, stats, currentRate, changePct };
      })
      .sort((a, b) => new Date(b.item.savedAt).getTime() - new Date(a.item.savedAt).getTime());
  }, [items, allData]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 lg:px-8">
          <SkeletonPage cards={3} />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="rounded-xl border border-negative/30 bg-negative/10 px-6 py-4">
            <p className="text-sm font-medium text-negative">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            <Star className="h-6 w-6 fill-accent text-accent" />
            Watchlist
          </h1>
          <p className="mt-1 text-sm text-muted">
            Districts and projects you&apos;ve starred, with price movement since you saved them.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border p-12 text-center">
            <Compass className="mx-auto mb-3 h-8 w-8 text-muted" />
            <p className="text-sm font-medium text-foreground">Your watchlist is empty</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              Tap the star on any district or project in the Dashboard, Trends, Market Analysis or
              Listings vs Sales to track it here.
            </p>
            <a
              href="/dashboard"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover"
            >
              Explore the dashboard <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ item, stats, currentRate, changePct }) => (
              <div key={item.id} className="relative flex flex-col rounded-2xl border border-card-border bg-card-bg p-5">
                <button
                  onClick={() => remove(item.id)}
                  aria-label={`Remove ${item.name} from watchlist`}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-input-bg hover:text-negative"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">{item.type}</p>
                <h3 className="mt-0.5 pe-6 text-base font-bold text-foreground">{item.name}</h3>
                {item.district && item.type === "project" && (
                  <p className="text-xs text-muted">{item.district}</p>
                )}

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-foreground">
                    {Math.round(currentRate).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted">AED/sqft</span>
                </div>
                <p className={`mt-0.5 text-xs font-semibold ${changePct >= 0 ? "text-positive" : "text-negative"}`}>
                  {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}% since saved
                </p>

                {stats && (
                  <span
                    className={`mt-3 w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      stats.momentumBadge === "surging"
                        ? "bg-positive/15 text-positive"
                        : stats.momentumBadge === "cooling"
                          ? "bg-negative/15 text-negative"
                          : "bg-muted/15 text-muted"
                    }`}
                  >
                    {stats.momentumBadge === "surging" ? "Surging" : stats.momentumBadge === "cooling" ? "Cooling" : "Steady"}
                  </span>
                )}

                <p className="mt-3 text-[10px] text-muted">
                  Saved {new Date(item.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>

                <a
                  href={item.type === "district" ? `/dashboard?district=${encodeURIComponent(item.name)}` : `/dashboard?project=${encodeURIComponent(item.name)}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                >
                  Open in dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
