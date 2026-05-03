# Web upload setup — `/admin/upload`

The admin upload page lets you drag-drop a fresh ADREC CSV in the browser
and the server parses it, commits the JSON to the repo, and Vercel
auto-redeploys (~2 min). No CLI needed after setup.

## One-time setup (Vercel env vars)

Go to Vercel → your project → **Settings → Environment Variables** and
add these 4 (5 if you want a non-main branch):

| Name | Value | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | any strong secret | The password you'll type into the upload page |
| `GITHUB_TOKEN` | a fine-grained Personal Access Token | Needs **Contents: Read & write** on `Leovech/adxb-interact` only |
| `GITHUB_OWNER` | `Leovech` | |
| `GITHUB_REPO` | `adxb-interact` | |
| `GITHUB_BRANCH` | `main` | Optional, defaults to `main` |

### Creating the GitHub PAT

1. Go to https://github.com/settings/personal-access-tokens
2. Click **Generate new token** → **Fine-grained token**
3. Name: `adxb-interact-admin-upload`
4. Expiration: 1 year (renew yearly)
5. Repository access: **Only select repositories** → pick `Leovech/adxb-interact`
6. Repository permissions:
   - **Contents**: Read and write
7. Generate, copy the token (`github_pat_...`), paste it into Vercel.

### After saving env vars

Vercel needs a redeploy for env vars to take effect:
- Go to your latest deployment
- Click ⋯ → Redeploy
- Or push any commit (e.g. a doc change)

## Using the upload page

1. Sign in to the site (any account works)
2. Visit `/admin/upload`
3. Type the `ADMIN_PASSWORD`
4. Drag your CSV onto the drop zone (or click to browse)
5. Click "Upload & deploy"
6. You'll see commit links and stats on success
7. ~2 minutes later, production reflects the new data

## What the endpoint does

`POST /api/admin/import-csv` — multipart form: `file` (CSV) + `password`.

1. Verifies password against `ADMIN_PASSWORD`
2. Parses CSV using the same logic as `scripts/process-csv.mjs`
3. Sanity-checks: must have ≥100 valid rows, otherwise aborts (refuses to
   corrupt production with a malformed file)
4. Commits `public/data/transactions.json` and `public/data/hierarchy.json`
   to the repo via GitHub Contents API
5. Returns commit URLs + stats

## Safety notes

- The endpoint refuses uploads with <100 valid rows so a broken CSV can't
  blank out production.
- The server-side password check protects the endpoint, but if you suspect
  the password leaked, just rotate `ADMIN_PASSWORD` in Vercel.
- The GitHub PAT is fine-grained to a single repo — if it ever leaks, the
  attacker can only modify this one repo, not your whole GitHub account.
- Each upload creates a regular git commit you can revert via GitHub UI.

## CLI still works

The web upload doesn't replace the CLI — both work. CLI flow is documented
in `docs/UPDATE_DATA.md`.
