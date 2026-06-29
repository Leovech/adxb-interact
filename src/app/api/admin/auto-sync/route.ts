import { NextResponse } from "next/server";
import { processCsvText } from "@/lib/csv-import";
import { commitDataFiles, readGhConfig } from "@/lib/sync/github-commit";

/**
 * GET /api/admin/auto-sync
 *
 * Daily auto-update. Reads the CSV from a configured source URL,
 * processes it, and commits the regenerated JSON to the repo.
 *
 * Triggered by Vercel cron (see vercel.json — runs at 09:00 UTC daily,
 * which is 13:00 Dubai). Can also be hit manually for testing using the
 * X-Admin-Password header (no body required).
 *
 * Required env vars:
 *   ADREC_CSV_URL   — direct-download URL of the latest ADREC CSV
 *                     (Dropbox / Google Drive / S3 / ADREC API endpoint
 *                     once you have credentials). Must return the raw CSV
 *                     bytes when fetched server-side.
 *   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO  — as for /admin/upload
 *   GITHUB_BRANCH   — optional, defaults to "main"
 *   CRON_SECRET     — optional, if set Vercel must send Bearer header
 *   ADMIN_PASSWORD  — optional, lets the admin trigger sync manually
 *                     via X-Admin-Password header
 *
 * Returns 200 with sync summary on success, 4xx/5xx with details on
 * failure. Idempotent — if the source CSV hasn't changed, no commit
 * happens (we compare row counts + a content hash).
 */

interface SyncSummary {
  ok: boolean;
  syncedAt: string;
  source: { url: string; sizeBytes: number; fetchedMs: number };
  parse: {
    totalRows: number;
    validRows: number;
    skipped: number;
    districts: number;
    projects: number;
    communities: number;
  };
  commits?: { transactions: string; hierarchy: string };
  skipped?: { reason: string };
  message: string;
}

/** Simple FNV-1a hash so we can detect unchanged source CSVs cheaply. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// Cache the last successful sync hash in module scope. This survives within
// a warm Lambda but not across cold starts — that's fine, a cold-start sync
// will just re-commit unchanged data once, and GitHub will return the same
// SHA so it's a no-op anyway. For stronger dedup, persist to a KV store.
let lastSyncedHash: string | null = null;

function authOk(request: Request): { ok: true } | { ok: false; reason: string; status: number } {
  const cronSecret = process.env.CRON_SECRET;
  const adminPwd = process.env.ADMIN_PASSWORD;

  if (cronSecret) {
    const header = request.headers.get("authorization");
    if (header === `Bearer ${cronSecret}`) return { ok: true };
  }
  if (adminPwd) {
    const pwd = request.headers.get("x-admin-password");
    if (pwd === adminPwd) return { ok: true };
  }
  // If neither secret is configured, deny by default — safer than
  // accidentally exposing a public endpoint that hammers GitHub.
  if (!cronSecret && !adminPwd) {
    return { ok: false, reason: "Auth not configured", status: 500 };
  }
  return { ok: false, reason: "Unauthorized", status: 401 };
}

export async function GET(request: Request) {
  const auth = authOk(request);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const sourceUrl = process.env.ADREC_CSV_URL;
  if (!sourceUrl) {
    return NextResponse.json(
      {
        error:
          "ADREC_CSV_URL env var not set. Configure a direct-download CSV " +
          "URL (Dropbox/Google Drive/ADREC API endpoint) in Vercel before " +
          "enabling auto-sync.",
      },
      { status: 500 }
    );
  }
  const gh = readGhConfig();
  if ("error" in gh) {
    return NextResponse.json({ error: `Server not configured. ${gh.error}` }, { status: 500 });
  }

  // ---- Fetch CSV from configured URL ----
  const t0 = Date.now();
  let csvText: string;
  try {
    const r = await fetch(sourceUrl, { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Source URL returned ${r.status}: ${r.statusText}` },
        { status: 502 }
      );
    }
    csvText = await r.text();
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch source CSV: ${e instanceof Error ? e.message : "network error"}` },
      { status: 502 }
    );
  }
  const fetchedMs = Date.now() - t0;

  if (csvText.length < 1000) {
    return NextResponse.json(
      { error: `Source CSV suspiciously small (${csvText.length} bytes). Aborting.` },
      { status: 502 }
    );
  }

  // ---- Skip if unchanged since last successful sync ----
  const hash = fnv1a(csvText);
  if (lastSyncedHash === hash) {
    const summary: SyncSummary = {
      ok: true,
      syncedAt: new Date().toISOString(),
      source: { url: sourceUrl, sizeBytes: csvText.length, fetchedMs },
      parse: { totalRows: 0, validRows: 0, skipped: 0, districts: 0, projects: 0, communities: 0 },
      skipped: { reason: "Source CSV unchanged since last sync (hash match)" },
      message: "No update needed — source data unchanged.",
    };
    return NextResponse.json(summary);
  }

  // ---- Parse ----
  let result;
  try {
    result = processCsvText(csvText);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "CSV parse failed" },
      { status: 400 }
    );
  }

  if (result.stats.validRows < 1000) {
    // Higher floor for auto-sync than manual upload — we never want a
    // misconfigured source URL to wipe out production.
    return NextResponse.json(
      {
        error:
          `Suspiciously few valid rows (${result.stats.validRows}). ` +
          `Aborting to avoid corrupting production. Check ADREC_CSV_URL.`,
        stats: result.stats,
      },
      { status: 400 }
    );
  }

  // ---- Commit ----
  const ts = new Date().toISOString().slice(0, 10);
  const commitPrefix = `Auto-sync ADREC: ${result.stats.validRows} tx, ${result.stats.districts} districts (${ts})`;

  try {
    const urls = await commitDataFiles(
      gh,
      JSON.stringify(result.transactions),
      JSON.stringify(result.hierarchy),
      commitPrefix
    );

    lastSyncedHash = hash;

    const summary: SyncSummary = {
      ok: true,
      syncedAt: new Date().toISOString(),
      source: { url: sourceUrl, sizeBytes: csvText.length, fetchedMs },
      parse: {
        totalRows: result.stats.totalRows,
        validRows: result.stats.validRows,
        skipped: result.stats.skipped,
        districts: result.stats.districts,
        projects: result.stats.projects,
        communities: result.stats.communities,
      },
      commits: urls,
      message: "Auto-sync committed. Vercel will redeploy in ~2 minutes.",
    };
    console.log("[auto-sync]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GitHub commit failed", stats: result.stats },
      { status: 502 }
    );
  }
}

// Allow up to 60s for the full fetch+parse+commit cycle on a large CSV
export const maxDuration = 60;
