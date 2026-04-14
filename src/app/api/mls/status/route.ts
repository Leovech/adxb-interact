import { NextResponse } from "next/server";
import { getLastCrawlState } from "../crawl/route";

/**
 * Returns the last crawl timestamp + next scheduled run so the
 * MLS page can show an "Agent status" banner.
 *
 * In production this would query the Postgres snapshot table.
 */
export async function GET() {
  const state = getLastCrawlState();

  // If the agent has never run (e.g. fresh deploy), synthesize a plausible
  // "last run" so the UI has something to show until the first cron fires.
  if (!state.lastRun) {
    const mockLastRun = new Date();
    mockLastRun.setUTCHours(9, 0, 0, 0);
    if (mockLastRun.getTime() > Date.now()) {
      mockLastRun.setUTCDate(mockLastRun.getUTCDate() - 1);
    }
    const mockNextRun = new Date(mockLastRun);
    mockNextRun.setUTCDate(mockNextRun.getUTCDate() + 1);

    return NextResponse.json({
      lastRun: mockLastRun.toISOString(),
      nextRun: mockNextRun.toISOString(),
      durationMs: 1842,
      projectsCrawled: 290,
      listingsFound: 7123,
      distressFound: 1074,
      status: "success",
      errorMessage: null,
      isScheduled: true,
      cronExpression: "0 9 * * *",
      cronTimezone: "UTC (13:00 Dubai)",
      synthetic: true,
    });
  }

  return NextResponse.json({
    ...state,
    isScheduled: true,
    cronExpression: "0 9 * * *",
    cronTimezone: "UTC (13:00 Dubai)",
    synthetic: false,
  });
}
