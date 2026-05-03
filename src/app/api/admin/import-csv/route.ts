import { NextResponse } from "next/server";
import { processCsvText } from "@/lib/csv-import";

/**
 * POST /api/admin/import-csv
 *
 * Body: multipart form-data with a `file` field (the CSV) and a `password`
 * field (admin password).
 *
 * Flow:
 *   1. Verify admin password against ADMIN_PASSWORD env var.
 *   2. Parse the CSV using the shared lib.
 *   3. Commit transactions.json + hierarchy.json to the repo via GitHub
 *      Contents API. Vercel auto-redeploys on push (~2 min).
 *
 * Required env vars:
 *   ADMIN_PASSWORD     — shared secret for the upload form
 *   GITHUB_TOKEN       — fine-grained PAT with `Contents: read+write` on
 *                        the target repo
 *   GITHUB_OWNER       — e.g. "Leovech"
 *   GITHUB_REPO        — e.g. "adxb-interact"
 *   GITHUB_BRANCH      — e.g. "main"
 *
 * Returns 200 with stats on success, 4xx with error message otherwise.
 */

interface GhPutResponse {
  commit?: { sha: string; html_url: string };
  message?: string;
}

async function getCurrentSha(
  owner: string, repo: string, path: string, branch: string, token: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const r = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path} failed: ${r.status}`);
  const json = await r.json();
  return json.sha as string;
}

async function commitFile(
  owner: string, repo: string, path: string, branch: string, token: string,
  contentBase64: string, message: string, sha: string | null
): Promise<GhPutResponse> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const body: Record<string, unknown> = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`GitHub PUT ${path} failed: ${r.status} ${json.message ?? ""}`);
  return json as GhPutResponse;
}

function toBase64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

export async function POST(request: Request) {
  // -------------------- Env-var checks --------------------
  const adminPwd = process.env.ADMIN_PASSWORD;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghOwner = process.env.GITHUB_OWNER;
  const ghRepo = process.env.GITHUB_REPO;
  const ghBranch = process.env.GITHUB_BRANCH || "main";

  const missing: string[] = [];
  if (!adminPwd) missing.push("ADMIN_PASSWORD");
  if (!ghToken) missing.push("GITHUB_TOKEN");
  if (!ghOwner) missing.push("GITHUB_OWNER");
  if (!ghRepo) missing.push("GITHUB_REPO");
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Server not configured. Missing env vars: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  // -------------------- Parse multipart --------------------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const password = formData.get("password");
  if (password !== adminPwd) {
    return NextResponse.json({ error: "Wrong admin password" }, { status: 401 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing `file` field" }, { status: 400 });
  }

  // Client may send the CSV gzipped to bypass Vercel's 4.5MB body limit.
  // Decompress here using the Web Streams DecompressionStream (Node 18+).
  const compressed = formData.get("compressed");
  let csvText: string;
  try {
    if (compressed === "gzip") {
      const decompStream = file.stream().pipeThrough(new DecompressionStream("gzip"));
      csvText = await new Response(decompStream).text();
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

  // -------------------- Parse CSV --------------------
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

  // -------------------- Commit to GitHub --------------------
  const txJson = JSON.stringify(result.transactions);
  const hierJson = JSON.stringify(result.hierarchy);
  const ts = new Date().toISOString();
  const commitMsg = `Update ADREC data: ${result.stats.validRows} tx, ${result.stats.districts} districts (web upload ${ts.slice(0, 10)})`;

  try {
    const txSha = await getCurrentSha(ghOwner!, ghRepo!, "public/data/transactions.json", ghBranch, ghToken!);
    const hierSha = await getCurrentSha(ghOwner!, ghRepo!, "public/data/hierarchy.json", ghBranch, ghToken!);

    const txCommit = await commitFile(
      ghOwner!, ghRepo!, "public/data/transactions.json", ghBranch, ghToken!,
      toBase64(txJson),
      commitMsg + " — transactions.json",
      txSha
    );

    const hierCommit = await commitFile(
      ghOwner!, ghRepo!, "public/data/hierarchy.json", ghBranch, ghToken!,
      toBase64(hierJson),
      commitMsg + " — hierarchy.json",
      hierSha
    );

    return NextResponse.json({
      ok: true,
      stats: result.stats,
      commits: {
        transactions: txCommit.commit?.html_url,
        hierarchy: hierCommit.commit?.html_url,
      },
      message: "Files committed. Vercel will redeploy in ~2 minutes.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GitHub commit failed", stats: result.stats },
      { status: 502 }
    );
  }
}

// Allow up to 60s for parsing + GitHub commits on a large CSV
export const maxDuration = 60;
