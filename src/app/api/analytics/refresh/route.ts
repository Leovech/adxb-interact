import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import { decodeTransactions, Transaction } from "@/data/abu-dhabi";
import { buildListingGroups } from "@/lib/mls-data";
import { buildCohortSignals } from "@/lib/analytics/supply-demand";
import { buildProjectMomentum } from "@/lib/analytics/momentum";
import {
  buildRecommendations,
  Recommendation,
} from "@/lib/analytics/recommendations";

/**
 * GET /api/analytics/refresh — daily analytics recomputation.
 *
 * Triggered by Vercel cron (see vercel.json). Recomputes:
 *   - project momentum
 *   - cohort signals (supply + demand + price vs area)
 *   - ranked recommendations
 * and revalidates the pages that depend on them so the next request
 * renders fresh content.
 *
 * Today this does NOT persist a snapshot — the pages recompute on each
 * request because the dataset is small. Phase 2 migration path:
 *
 *   1. Write the computed Recommendation[] to Vercel KV (or a snapshot
 *      table) keyed by date/hour.
 *   2. /market-analysis reads from the snapshot instead of recomputing.
 *   3. This endpoint becomes truly "write once, read many" → more
 *      consistent across concurrent readers, cheaper CPU per request.
 */

function loadTransactions(): Transaction[] {
  // Server-side read from the shipped JSON. Switch to DB once we have one.
  const p = path.join(process.cwd(), "public", "data", "transactions.json");
  const raw = fs.readFileSync(p, "utf8");
  return decodeTransactions(JSON.parse(raw));
}

interface RefreshSummary {
  ok: true;
  computedAt: string;
  durationMs: number;
  projectsAnalyzed: number;
  recommendations: {
    total: number;
    buy: number;
    watch: number;
    avoid: number;
  };
  top: Recommendation[];
  paths: string[];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const tx = loadTransactions();
    const listingGroups = buildListingGroups(tx);
    const signals = buildCohortSignals(tx, listingGroups);
    const momentum = buildProjectMomentum(tx);

    const momentumByKey = new Map();
    for (const m of momentum) momentumByKey.set(`${m.project}|${m.bedrooms}`, m);
    const distressByKey = new Map<string, number>();
    for (const g of listingGroups) distressByKey.set(g.key, g.distressCount);

    const recs = buildRecommendations(signals, momentumByKey, {
      distressCountByKey: distressByKey,
      limit: 50,
    });

    // Revalidate pages that surface the recs so next render is fresh
    const paths = ["/market-analysis", "/trends", "/"];
    for (const p of paths) revalidatePath(p);

    const summary: RefreshSummary = {
      ok: true,
      computedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      projectsAnalyzed: signals.length,
      recommendations: {
        total: recs.length,
        buy: recs.filter((r) => r.verdict === "buy").length,
        watch: recs.filter((r) => r.verdict === "watch").length,
        avoid: recs.filter((r) => r.verdict === "avoid").length,
      },
      top: recs.slice(0, 10),
      paths,
    };

    console.log("[analytics.refresh]", {
      durationMs: summary.durationMs,
      recs: summary.recommendations,
    });

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
