# How to update transaction data

The site reads from two static JSON files committed to the repo:
- `public/data/transactions.json` — all ADREC transactions (compact format)
- `public/data/hierarchy.json` — districts + projects index

When you have a new CSV from ADREC, do this:

## Quick steps

```bash
# 1. Pull the latest main
git checkout main
git pull origin main

# 2. Run the import script with your CSV path
npm run import-csv -- /path/to/your/new-file.csv

# 3. Commit the regenerated JSON
git add public/data/transactions.json public/data/hierarchy.json
git commit -m "Update ADREC transaction data"

# 4. Push — Vercel auto-deploys in ~2 min
git push origin main
```

The script will print summary stats (row count, file size) so you can sanity-check.

## CSV format expected

The script handles ADREC's standard export. Required columns (case-insensitive):
- Transaction date
- Property type
- Size (sqft)
- Rooms / Layout (e.g. "2 Bedroom", "Studio")
- District
- Project / Tower
- Transaction value (AED)
- Rate per sqft (AED)
- Status (Off-Plan / Ready / etc.)
- Sequence (Primary / Secondary)

Look at `scripts/process-csv.mjs` for the exact field mapping if your CSV
has different column headers.

## Future: web upload

A self-service admin upload (drag CSV in browser → instant deploy) is on
the roadmap. For now the CLI flow above is the way.
