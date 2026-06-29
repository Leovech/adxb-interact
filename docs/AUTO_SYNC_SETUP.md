# Daily auto-sync setup

The site can refresh its ADREC data every day from a CSV URL you configure —
no manual upload needed. The Vercel cron at `0 6 * * *` (06:00 UTC = 10:00
Dubai) hits `/api/admin/auto-sync`, which:

1. Fetches the latest CSV from `ADREC_CSV_URL`
2. Hashes it to skip a no-op sync if the file hasn't changed
3. Parses it (rejects if <1000 valid rows, safety floor against bad sources)
4. Commits `public/data/transactions.json` + `public/data/hierarchy.json`
   to the repo via GitHub API
5. Vercel auto-redeploys → fresh data live in ~2 minutes

## Setup

### 1. Configure a CSV source URL

The endpoint needs a URL that returns the **raw CSV bytes** when fetched
server-side (no login redirect, no HTML wrapping). Options:

| Source | How |
|---|---|
| **ADREC API** | Subscribe at https://adrec.gov.ae/en/apisubscription, get an endpoint URL — best long-term |
| **Dropbox** | Upload CSV → Share → "Copy link" → swap `dl=0` for `dl=1` at the end of the URL |
| **Google Drive** | Get share link → use `https://drive.google.com/uc?export=download&id=FILE_ID` |
| **S3 / R2** | Use a presigned URL or a public-read bucket object |
| **GitHub raw** | Push the CSV to a private repo, use a raw.githubusercontent URL + token in the URL |

The URL must be reachable from a Vercel serverless function (Singapore /
Frankfurt egress IPs). Test with `curl <URL>` from your laptop — if it
downloads a CSV, it'll work.

### 2. Add env vars in Vercel

In Vercel → your project → **Settings → Environment Variables**:

| Name | Value | Notes |
|---|---|---|
| `ADREC_CSV_URL` | your direct-download CSV URL | **Required**. Encrypted in Vercel. |
| `GITHUB_TOKEN` | fine-grained PAT (see ADMIN_UPLOAD_SETUP.md) | Required |
| `GITHUB_OWNER` | `Leovech` | Required |
| `GITHUB_REPO` | `adxb-interact` | Required |
| `GITHUB_BRANCH` | `main` | Optional, defaults to main |
| `CRON_SECRET` | any random string | **Recommended** — Vercel cron auto-sends it as Bearer header, blocks public access |
| `ADMIN_PASSWORD` | same one you set for /admin/upload | Lets you trigger sync manually via header |

After saving env vars, **Redeploy** (Deployments → latest → ⋯ → Redeploy)
so the new env reaches the function.

### 3. Test it manually before relying on the cron

You can hit the endpoint by hand to verify your setup:

```bash
# Using your ADMIN_PASSWORD:
curl -H "X-Admin-Password: YOUR_PASSWORD" \
     https://adxb-interact.vercel.app/api/admin/auto-sync

# Or using CRON_SECRET:
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://adxb-interact.vercel.app/api/admin/auto-sync
```

Expected success response:

```json
{
  "ok": true,
  "syncedAt": "2026-06-30T06:00:01.234Z",
  "source": { "url": "https://...", "sizeBytes": 17234567, "fetchedMs": 1234 },
  "parse": {
    "totalRows": 116326,
    "validRows": 116252,
    "skipped": 74,
    "districts": 133,
    "projects": 370,
    "communities": 931
  },
  "commits": {
    "transactions": "https://github.com/Leovech/adxb-interact/commit/abc...",
    "hierarchy": "https://github.com/Leovech/adxb-interact/commit/def..."
  },
  "message": "Auto-sync committed. Vercel will redeploy in ~2 minutes."
}
```

If the CSV hasn't changed:

```json
{
  "ok": true,
  "skipped": { "reason": "Source CSV unchanged since last sync (hash match)" },
  "message": "No update needed — source data unchanged."
}
```

### 4. Watch the cron run

After enabling, check **Vercel → Logs** every morning around 10:00 Dubai
to confirm the cron fired. Each successful run logs `[auto-sync] {...}`
with the stats.

## Safety guarantees

- **Hard floor: 1000 rows.** If the source CSV has <1000 valid rows the
  endpoint aborts. Protects against a misconfigured / truncated source
  wiping out production.
- **Dedup by content hash.** A second cron firing for the same CSV
  returns immediately with `skipped: hash match` — no spurious commits.
- **Auth required.** Either `CRON_SECRET` (Vercel cron Bearer header) or
  `ADMIN_PASSWORD` (manual trigger). If neither is set the endpoint
  returns 500 — fail closed.
- **Every commit is reversible.** Each sync is a normal git commit. If
  it ever publishes bad data, revert through GitHub UI and Vercel
  redeploys.

## When you get ADREC API access

Once ADREC approves your API subscription:

1. Update `ADREC_CSV_URL` with their endpoint URL (or change the
   `auto-sync` endpoint to call their JSON endpoint and reshape into the
   parser's expected columns)
2. Add their `Authorization` header — easiest path is `&token=...` in
   the URL or set a custom env var like `ADREC_API_TOKEN` and read it in
   `auto-sync/route.ts`

Both changes are 5-line edits. The rest of the pipeline stays identical.
