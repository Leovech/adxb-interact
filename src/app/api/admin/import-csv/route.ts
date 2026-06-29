import { NextResponse } from "next/server";
import { processCsvText } from "@/lib/csv-import";
import { commitDataFiles, readGhConfig } from "@/lib/sync/github-commit";

/**
 * POST /api/admin/import-csv
 *
 * Manual upload from the /admin/upload page. Accepts a CSV (optionally
 * gzipped) + admin password, parses it, and commits the JSON to GitHub.
 *
 * Required env vars:
 *   ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 *   GITHUB_BRANCH (optional, defaults to "main")
 */
export async function POST(request: Request) {
  const adminPwd = process.env.ADMIN_PASSWORD;
  if (!adminPwd) {
    return NextResponse.json(
      { error: "Server not configured. Missing env var: ADMIN_PASSWORD" },
      { status: 500 }
    );
  }
  const gh = readGhConfig();
  if ("error" in gh) {
    return NextResponse.json({ error: `Server not configured. ${gh.error}` }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  if (formData.get("password") !== adminPwd) {
    return NextResponse.json({ error: "Wrong admin password" }, { status: 401 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing `file` field" }, { status: 400 });
  }

  // Client may send the CSV gzipped to bypass Vercel's 4.5MB body limit.
  const compressed = formData.get("compressed");
  let csvText: string;
  try {
    if (compressed === "gzip") {
      const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
      csvText = await new Response(stream).text();
    } else {
      csvText = await file.text();
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read file: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 }
    );
  }

  if (csvText.length < 100) {
    return NextResponse.json({ error: "CSV is too small / empty" }, { status: 400 });
  }

  let result;
  try {
    result = processCsvText(csvText);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "CSV parse failed" },
      { status: 400 }
    );
  }

  if (result.stats.validRows < 100) {
    return NextResponse.json(
      {
        error: `Suspiciously few rows (${result.stats.validRows}). Aborting to avoid corrupting production. Check the CSV format.`,
        stats: result.stats,
      },
      { status: 400 }
    );
  }

  const ts = new Date().toISOString().slice(0, 10);
  const commitPrefix = `Update ADREC data: ${result.stats.validRows} tx, ${result.stats.districts} districts (web upload ${ts})`;

  try {
    const urls = await commitDataFiles(
      gh,
      JSON.stringify(result.transactions),
      JSON.stringify(result.hierarchy),
      commitPrefix
    );
    return NextResponse.json({
      ok: true,
      stats: result.stats,
      commits: urls,
      message: "Files committed. Vercel will redeploy in ~2 minutes.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GitHub commit failed", stats: result.stats },
      { status: 502 }
    );
  }
}

export const maxDuration = 60;
