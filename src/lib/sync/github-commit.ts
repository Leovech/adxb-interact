/**
 * Helpers for committing data files to the GitHub repo via the Contents
 * API. Used by both the manual /admin/upload flow and the daily auto-sync
 * cron.
 *
 * Env vars required by callers:
 *   GITHUB_TOKEN  — fine-grained PAT with Contents:R+W on the target repo
 *   GITHUB_OWNER  — e.g. "Leovech"
 *   GITHUB_REPO   — e.g. "adxb-interact"
 *   GITHUB_BRANCH — defaults to "main"
 */

export interface GhConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export function readGhConfig(): GhConfig | { error: string } {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const missing: string[] = [];
  if (!token) missing.push("GITHUB_TOKEN");
  if (!owner) missing.push("GITHUB_OWNER");
  if (!repo) missing.push("GITHUB_REPO");
  if (missing.length > 0) {
    return { error: `Missing env vars: ${missing.join(", ")}` };
  }
  return { token: token!, owner: owner!, repo: repo!, branch };
}

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

export async function getCurrentSha(
  cfg: GhConfig, path: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`;
  const r = await fetch(url, { headers: GH_HEADERS(cfg.token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path} failed: ${r.status}`);
  const json = await r.json();
  return json.sha as string;
}

export async function commitFile(
  cfg: GhConfig,
  path: string,
  contentBase64: string,
  message: string,
  sha: string | null
): Promise<{ sha: string; html_url: string }> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const body: Record<string, unknown> = {
    message,
    content: contentBase64,
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: "PUT",
    headers: { ...GH_HEADERS(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) {
    throw new Error(`GitHub PUT ${path} failed: ${r.status} ${json.message ?? ""}`);
  }
  return { sha: json.commit.sha, html_url: json.commit.html_url };
}

export function toBase64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

/**
 * Commit transactions.json + hierarchy.json in a single high-level call.
 * Returns the URLs of the two commits on success.
 */
export async function commitDataFiles(
  cfg: GhConfig,
  transactionsJson: string,
  hierarchyJson: string,
  commitPrefix: string
): Promise<{ transactions: string; hierarchy: string }> {
  const txPath = "public/data/transactions.json";
  const hierPath = "public/data/hierarchy.json";

  const [txSha, hierSha] = await Promise.all([
    getCurrentSha(cfg, txPath),
    getCurrentSha(cfg, hierPath),
  ]);

  const txCommit = await commitFile(
    cfg, txPath, toBase64(transactionsJson),
    `${commitPrefix} — transactions.json`, txSha
  );
  const hierCommit = await commitFile(
    cfg, hierPath, toBase64(hierarchyJson),
    `${commitPrefix} — hierarchy.json`, hierSha
  );

  return {
    transactions: txCommit.html_url,
    hierarchy: hierCommit.html_url,
  };
}
