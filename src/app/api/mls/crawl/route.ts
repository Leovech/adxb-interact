import { NextResponse } from "next/server";

/**
 * MLS Agent — Daily Crawler
 *
 * Triggered by Vercel Cron at 09:00 UTC = 13:00 Dubai time (see vercel.json).
 * The agent fetches fresh listing snapshots from Property Finder and Bayut
 * for all tracked Abu Dhabi projects, compares them to ADREC medians,
 * and stores the snapshot for the next 24 hours.
 *
 * ──────────────── Production architecture ────────────────
 * 1. Subscribe to Property Finder's B2B API (Reidin) OR use Playwright
 *    with rate-limited requests (~1 req / 5s, rotating user agents).
 * 2. Store each snapshot in Vercel Postgres / Supabase:
 *      CREATE TABLE mls_snapshot (
 *        crawled_at timestamptz,
 *        platform text,        -- 'propertyfinder' | 'bayut'
 *        project text, district text, bedrooms int,
 *        size_sqft int, asking_price bigint, asking_rate int,
 *        url text, listing_id text UNIQUE
 *      );
 * 3. On each run:
 *      - Fetch top 200 Abu Dhabi projects from PF + Bayut
 *      - Upsert listings (keyed by platform+listing_id)
 *      - Mark stale listings as removed
 *      - Recompute ADREC comparison (distress detection)
 *      - Notify ChatWidget subscribers of new distress deals
 * 4. The page reads the latest snapshot — no scraping on page load.
 *
 * ──────────────── Current stub ────────────────
 * This route updates the last-crawl timestamp and counts. Real scraping
 * is commented out until an MLS subscription is acquired.
 */

let lastCrawlState = {
  lastRun: null as string | null,
  nextRun: null as string | null,
  durationMs: 0,
  projectsCrawled: 0,
  listingsFound: 0,
  distressFound: 0,
  status: "idle" as "idle" | "running" | "success" | "error",
  errorMessage: null as string | null,
};

export function getLastCrawlState() {
  return lastCrawlState;
}

function nextCronRun(): string {
  // Next 09:00 UTC (13:00 Dubai)
  const now = new Date();
  const next = new Date();
  next.setUTCHours(9, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (in production)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  lastCrawlState.status = "running";

  try {
    // ──── Production: replace with real PF/Bayut fetch ────
    //
    // const pfListings = await crawlPropertyFinder({
    //   emirate: "abu-dhabi",
    //   topProjects: 200,
    //   rateLimit: { requestsPerSecond: 0.2 },
    // });
    // const bayutListings = await crawlBayut({ ... });
    // await db.mls_snapshot.upsertMany([...pfListings, ...bayutListings]);
    //
    // const adrecMedians = await db.query("SELECT project, bedrooms, median_rate FROM adrec_summary");
    // const distress = detectDistress(allListings, adrecMedians);
    //
    // ──── Current: record crawl metadata only ────

    const mockDuration = 1200 + Math.random() * 800;
    await new Promise((r) => setTimeout(r, mockDuration));

    lastCrawlState = {
      lastRun: new Date().toISOString(),
      nextRun: nextCronRun(),
      durationMs: Date.now() - started,
      // Stable reference numbers matching the sample data generator
      projectsCrawled: 290,
      listingsFound: 7123,
      distressFound: 1074,
      status: "success",
      errorMessage: null,
    };

    return NextResponse.json({
      ok: true,
      ...lastCrawlState,
    });
  } catch (error) {
    lastCrawlState.status = "error";
    lastCrawlState.errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    lastCrawlState.lastRun = new Date().toISOString();
    return NextResponse.json({ ok: false, ...lastCrawlState }, { status: 500 });
  }
}
