import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// This endpoint is called every 2 hours by the Vercel cron job.
// When connected to a real data source (ADREC API), add the fetch logic here.
//
// Current flow:
// 1. Cron triggers this endpoint every 2 hours
// 2. This revalidates the homepage, forcing Next.js to regenerate with fresh data
// 3. When you add a real data source, fetch it here before revalidating
//
// To connect real ADREC data in the future:
// - Subscribe to ADREC API at https://adrec.gov.ae/en/apisubscription
// - Fetch transactions from their API
// - Store in a database (e.g., Vercel Postgres, Supabase)
// - The page will read from the DB instead of mock data

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (in production)
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

    // Revalidate the homepage to pick up new data
    revalidatePath("/");

    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
      message: "Data refresh triggered successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Revalidation failed" },
      { status: 500 }
    );
  }
}
