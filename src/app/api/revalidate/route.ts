import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Cron-driven revalidation (every 2h via vercel.json).
 *
 * Re-renders every data-driven page so a freshly-processed transactions.json
 * is picked up across the entire app, not just the homepage. Previously only
 * `/` was revalidated, which left `/mls` and `/mls/report` stale for up to
 * 24h after a data refresh.
 *
 * When a real ADREC API subscription is added, fetch + persist the data HERE
 * before calling revalidatePath, so cron flushes write-then-read in one shot.
 */
const PATHS_TO_REVALIDATE = ["/", "/mls", "/mls/report"] as const;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // TODO: Fetch fresh data from ADREC API here
    // const response = await fetch('https://adrec-api-endpoint/transactions');
    // const data = await response.json();
    // await saveToDatabase(data);

    for (const path of PATHS_TO_REVALIDATE) {
      revalidatePath(path);
    }

    return NextResponse.json({
      revalidated: true,
      paths: PATHS_TO_REVALIDATE,
      timestamp: new Date().toISOString(),
      message: "Data refresh triggered successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Revalidation failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
