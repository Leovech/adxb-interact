# ADXBInteract — Product Requirements Document

> Prepared for automated test generation (TestSprite). Every feature below
> lists concrete, testable acceptance criteria and edge cases.

---

## 1. Product overview

**ADXBInteract** is an Abu Dhabi real-estate market intelligence and investor
decision-support web application. It turns ADREC (Abu Dhabi Real Estate Centre)
closed-sale transaction data plus modelled live-listing data into dashboards,
trend analytics, AI-ranked recommendations, printable investor reports, and a
personal property portfolio tracker.

- **Status:** Demo / MVP (publicly viewable).
- **Production URL:** https://adxb-interact.vercel.app
- **Primary users:** property investors, real-estate brokers, agents, developers.
- **Business goal:** help users make data-driven buy/hold/sell decisions and
  convert them into registered (later paid) accounts.

### Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts + custom SVG components |
| Maps | MapLibre GL |
| Auth | Stubbed (localStorage), Auth.js-ready |
| Data | Static JSON (`/public/data/transactions.json`, `hierarchy.json`) |
| Hosting | Vercel |
| i18n | Custom context — English, Arabic (RTL), Russian |

### Data source

All analytics derive from `public/data/transactions.json` — a compact,
lookup-encoded array of ADREC closed sales (~116,000 rows). Each transaction
has: date, asset class, property type, size (sqft/sqm), bedrooms, district,
community, project, price, rate per sqft, status (Off-Plan/Ready/Court), and
sequence (Primary/Secondary). Client pages fetch this file with
`cache: "no-cache"` so updates propagate immediately.

---

## 2. Site map / routes

| Route | Type | Auth required | Purpose |
|---|---|---|---|
| `/` | Public | No | Marketing landing page |
| `/dashboard` | Public | No | Transaction dashboard with filters |
| `/trends` | Public | No | Project momentum & trend analytics |
| `/market-analysis` | Public | No | AI-ranked Buy/Watch/Avoid recommendations |
| `/mls` | Public | No | "Listings vs Sales" — asking vs actual comparison |
| `/mls/report` | Public | No | Printable one-page investor report |
| `/report` | Public | No | Printable transaction/search report with offer comparison |
| `/sign-in` | Public | No | Sign in |
| `/sign-up` | Public | No | Register + onboarding |
| `/account` | Protected | Yes | Profile, preferences, property portfolio |
| `/admin/upload` | Semi-protected | Password | CSV data upload + auto-sync trigger |
| `/api/*` | API | Varies | Backend endpoints (see §9) |

Global chrome: a sticky **Header** on every page with a demo banner, logo
(links to `/`), nav (Dashboard, Trends, Market Analysis, Listings vs Sales),
language switcher (EN/AR/RU), theme toggle (dark/light), and auth state
(Sign in / Sign up buttons, or the user's name linking to `/account`).

---

## 3. Landing page (`/`)

**Goal:** communicate value and route visitors into the app.

### Sections
1. **Hero** — headline, subheadline, two CTAs ("Explore the dashboard" → `/dashboard`, "AI recommendations" → `/market-analysis`), animated stat ticker (transactions, districts, projects, platforms).
2. **Market pulse chart** — interactive SVG area chart of median rate/sqft; hovering shows a tooltip with the value at that point.
3. **Feature grid** — 6 cards (Dashboard, Trends, AI market analysis, Listings vs Sales, Investor reports, Account), each links to its page.
4. **How it works** — 3 steps.
5. **Highlight band** — two promo cards linking to `/mls` and `/market-analysis`.
6. **Final CTA** — "Open the dashboard" + "Create free account".
7. **Contact section** and **footer**.

### Acceptance criteria
- AC1: Visiting `/` renders the hero headline and both hero CTA buttons.
- AC2: The stat ticker numbers animate up to their final values when scrolled into view.
- AC3: Clicking "Explore the dashboard" navigates to `/dashboard`.
- AC4: Clicking "AI recommendations" navigates to `/market-analysis`.
- AC5: Hovering over the market-pulse chart shows a tooltip with a month label and an AED value.
- AC6: Each of the 6 feature cards navigates to its stated route when clicked.
- AC7: The header logo navigates back to `/`.

---

## 4. Dashboard (`/dashboard`)

**Goal:** free-form exploration of ADREC transactions.

### Components
- **Page guide** — collapsible "how to use" panel, dismissible (persists dismissal in localStorage), re-openable via a small chip.
- **FilterPanel** with:
  - Smart search box (natural-language, e.g. "villa yas island 3 bedroom ready") with an autocomplete dropdown of matching districts/projects and a parsed-filter preview.
  - District dropdown, Project dropdown (depends on district), Property type pills, Status pills, Sale-type pills, Asset-class pills, Bedroom pills.
  - Range filters (price min/max, size min/max, rate min/max) behind a "ranges" toggle.
  - Date-preset selector (all time, today, 7d, 30d, 90d, this week/month/quarter/year, last month/quarter/year, YTD, custom).
  - Active-filter chips with individual remove buttons; a "Clear all" reset.
- **KPI cards** (4): Total transactions, Total value, Median price, Avg size. Each has segment toggles (All/Primary/Secondary and All/Ready/Off-Plan) that re-compute the numbers.
- **Median stats**, **Charts** (monthly volume, avg rate trend, type distribution), a **Trends CTA** card linking to `/trends`, **Price history**, **Map view** (MapLibre), **Transaction table** (sortable, paginated).
- **Download report** flow (opens `/report` with the current filters, optionally an offer).

### Acceptance criteria
- AC1: On load, the dashboard shows KPI cards populated with non-zero numbers for the full dataset.
- AC2: Selecting a district reduces the transaction count and repopulates the project dropdown with only that district's projects.
- AC3: Selecting a project further filters the data; KPIs, charts, and table all update.
- AC4: Typing "2 bedroom apartment reem" in smart search and applying it sets bedrooms=2, propertyType=Apartment, district=Al Reem Island (merges with, does not wipe, other active filters).
- AC5: The smart-search matches diacritic/case variants (e.g. "sa'adiyat", "SAADIYAT", "Saadiyat") to the same district.
- AC6: "Clear all" resets every filter and restores the full-dataset counts.
- AC7: KPI segment toggles (Primary/Secondary, Ready/Off-Plan) change the displayed values.
- AC8: The transaction table can be sorted by column and paginated.
- AC9: Changing a date preset filters transactions to that window.
- AC10: The map renders and displays transaction points/areas.
- AC11: Each dashboard section fades/reveals in as it scrolls into view.

---

## 5. Trends (`/trends`)

**Goal:** show which projects have momentum.

### Behavior
- Time-window toggle: **10 days, 3 months, 6 months, 9 months, 12 months**. The ranked table re-sorts by transaction count in the selected window.
- Filters: district, property type, bedrooms.
- Four highlight strips (cards):
  - **Surging** — 30-day activity ≥ 2× the prior-90-day pace.
  - **Most active (90 days)** — highest absolute 90-day volume.
  - **New demand** — first transaction within the last 12 months.
  - **Cooling** — 3-month pace ≤ half the 12-month baseline.
- **Ranked table** — per cohort (project + bedrooms): counts for each window, median price, 3-month momentum ratio, and badges (Most Active, Surging, Accelerating, Cooling, New Demand, High Liquidity).
- Each card/row links to the investor report for that project + bedroom config.

### Acceptance criteria
- AC1: The page loads and renders the ranked table with at least one row for the full dataset.
- AC2: Switching the time window re-sorts the ranked table (top row can change).
- AC3: Applying a district filter restricts all strips and the table to that district.
- AC4: A cohort with a strong recent burst appears in the "Surging" strip with a "Surging" badge.
- AC5: Clicking a momentum card navigates to `/mls/report?project=<name>&bedrooms=<n>`.
- AC6: Momentum ratio pills are color-coded (green ≥ 1.3, red ≤ 0.6, neutral otherwise).

---

## 6. Market Analysis (`/market-analysis`)

**Goal:** ranked, explainable Buy/Watch/Avoid recommendations.

### Logic
- For each (project, bedrooms) cohort with enough data, compute an **Opportunity Score (0–100)** = 30% price discount vs area + 25% demand momentum + 20% supply tightness + 15% raw momentum + 10% unit-type spread.
- **Verdict:** buy / watch / avoid (derived from score + tags; thin-liquidity cohorts cannot score "buy" unless the score is ≥ 65).
- **Tags:** Undervalued, High demand, Tight supply, Oversupplied, Premium unit type, Distress inventory, Thin liquidity.
- **Reasoning bullets** in plain English, anchored in real numbers, including a negotiation line ("Expect sellers to list around X–Y; negotiate toward Z, the closed-sale median").
- **Signals sidebar:** closed-sale median, area closed median, discount %, tx/month, active listings, inventory months, 3-month momentum.

### Controls
- Filters: district, property type, bedrooms.
- Verdict tabs: Buy / Watch / Avoid / All (each shows a count).
- Per-card **FeedbackBox**: thumbs up / thumbs down + optional comment; persists to localStorage and POSTs to `/api/feedback`.
- Logged-in users' saved preferences pre-seed the filters.

### Acceptance criteria
- AC1: The page loads and shows recommendation cards sorted by opportunity score (descending).
- AC2: Each card shows a verdict badge (Buy/Watch/Avoid), an opportunity score 0–100, and at least one reasoning bullet.
- AC3: Switching to the "Watch" or "Avoid" tab shows only cards of that verdict (or an empty state).
- AC4: Applying a district filter restricts the recommendations to that district.
- AC5: Clicking thumbs-up on a card visually marks it selected and reveals a comment field.
- AC6: Submitting feedback persists so that re-loading the page restores the selected sentiment for that card.
- AC7: "Investor report" on a card navigates to `/mls/report` for that cohort.
- AC8: The opportunity score is between 0 and 100 for every card.

---

## 7. Listings vs Sales (`/mls`)

**Goal:** compare asking prices (Property Finder / Bayut, modelled) against actual ADREC closed sales, and surface below-market deals.

### Behavior
- **Agent search panel** — smart search + dropdowns (district, project, property type, bedrooms). A "Ask the Agent" button runs a simulated multi-step crawl animation, then shows results.
- **Platform filter pills:** All (PF + Bayut) / Property Finder / Bayut — scopes listings and re-aggregates the per-group medians accordingly.
- **Distress-only** toggle.
- **Sample-listings banner** — clearly states asking prices are modelled, not scraped, and to verify on PF/Bayut.
- **Results summary** — price extremes (lowest/highest asking with project) and a type→bedroom breakdown table (smallest/biggest layout, asking median, closed-sale median, premium %). Sorted by property type then bedrooms.
- **Overview stat cards** (total listings, distress deals, avg premium, platform split).
- **Distress deals** grid — listings ≥ 5% below the recent market rate, each linking to a real PF/Bayut search.
- **Project group cards** — three columns (Asking / Recent Nmo market / 24-month median), platform badges, distress count, premium %. Expandable to show individual listings, deep-links, and an "Investor Report" button. Paginated ("Load 60 more").

### Acceptance criteria
- AC1: Before running the agent, the page shows an empty/prompt state.
- AC2: Clicking "Ask the Agent" runs the progress animation and then displays result cards.
- AC3: Selecting "Property Finder" platform filter shows only PF listings and re-computes each card's medians and platform split (Bayut count = 0).
- AC4: The "Distress only" toggle restricts cards to those with ≥ 1 distress listing.
- AC5: The results summary shows a lowest-asking and highest-asking figure with the corresponding project name.
- AC6: The type→bedroom breakdown table is sorted by property type, then ascending bedrooms.
- AC7: Expanding a group card reveals individual listings and "Open on Property Finder"/"Open on Bayut" links.
- AC8: A Property Finder deep-link URL contains the project name, district, and "Abu Dhabi", and the bedroom filter params.
- AC9: "Investor Report" on an expanded card navigates to `/mls/report?project=<name>&bedrooms=<n>`.
- AC10: When more than 60 cohorts match, a "Load more" control appears and reveals additional cards when clicked; a "Showing X of N" count is displayed.

---

## 8. Reports

### 8a. Investor report (`/mls/report?project=<name>&bedrooms=<n>`)
- One-page brief: verdict banner (Buy/Watch/Avoid), key stats (asking median, recent market median, premium, modelled yield), recent-vs-24-month drift, liquidity, inventory, 12-month price-trend chart, best-deals table, yield model, print-to-PDF.
- Print stylesheet hides header/toolbar and forces a light layout.

**Acceptance criteria**
- AC1: `/mls/report?project=Pixel&bedrooms=1` renders a report titled with the project.
- AC2: A verdict (Buy/Watch/Avoid) and an opportunity/summary is shown.
- AC3: Clicking "Print / Save as PDF" triggers the browser print dialog.
- AC4: An unknown project shows a "no report data" state with a back link.

### 8b. Transaction/search report (`/report?...filters&offerPrice=&offerSize=`)
- Reflects the exact dashboard search filters. Sections: filter summary, KPI row, price trend, cumulative transaction chart, monthly volume, latest transactions table.
- **Offer comparison** (when `offerPrice` provided): verdict text, offer vs median/lowest/highest, rate comparison, percentile, visual distribution bar.

**Acceptance criteria**
- AC1: Opening `/report?project=Pixel&bedrooms=1` shows a report scoped to Pixel 1BR only (not the whole market).
- AC2: Passing `offerPrice` and `offerSize` renders the "Your offer vs market" section with a percentile and a verdict sentence.
- AC3: A filter that matches no transactions shows a "No transactions found" state.
- AC4: The cumulative-transactions chart and monthly-volume chart both render.

---

## 9. Authentication & account

### Sign up (`/sign-up`)
Fields: name (optional), user type (Investor/Broker/Agent/Developer/Other), email (required), password (required, ≥ 6 chars), investment-interest chips (optional, multi-select). On success → redirect to `/account?welcome=1`.

### Sign in (`/sign-in`)
Fields: email, password. **Demo mode: any valid-format email + any non-empty password succeeds.** On success → redirect to `/account`.

### Account (`/account`) — protected
- Redirects unauthenticated users to `/sign-in`.
- **My properties** (portfolio) section — see §10.
- **Profile** — edit name and user type.
- **Investment interests** — toggle chips.
- **Preferred filters** — districts, property types, bedrooms (comma-separated).
- **Save changes** — persists to localStorage; shows a "Saved" confirmation.
- **Sign out** — clears session, returns to unauthenticated state.
- Scaffolded (disabled) tiles: Watchlist, Alerts, Feedback history.

### Acceptance criteria
- AC1: Visiting `/account` while signed out redirects to `/sign-in`.
- AC2: Signing up with a valid email and a 6+ char password creates a session and lands on `/account` with a welcome message.
- AC3: Signing up with a password shorter than 6 chars shows a validation error and does not create a session.
- AC4: Signing up with an email lacking "@" shows a validation error.
- AC5: After signing in, the header shows the user's name/email linking to `/account` and hides the Sign in/Sign up buttons.
- AC6: Editing interests and clicking "Save changes" shows "Saved" and the values persist across a reload.
- AC7: "Sign out" returns the header to the signed-out state and blocks `/account` (redirect to `/sign-in`).
- AC8: The auth session persists across page reloads (localStorage) until sign-out or expiry.

---

## 10. Property portfolio tracker (in `/account`)

**Goal:** logged-in users add units they own; the app estimates current market value and paper gain/loss.

### Behavior
- **Add property** form: district (dropdown), project (autocomplete from the district's projects), property type, bedrooms, size (sqft), purchase price (AED), purchase date, notes. District + project + size + price are required to save.
- **Valuation:** estimated current value = size × recent median rate/sqft, using the most-specific available comparable: project+bedrooms → district+bedrooms → district average (last 12 months). Shows the basis label.
- **Per-property card:** paid, estimated-now, gain %, valuation basis, purchase date, notes, and a link to the investor report.
- **Portfolio summary:** property count, total invested, total estimated value, total gain/loss (AED and %).
- **Edit** and **delete** each property.
- Persisted per-user in localStorage.

### Acceptance criteria
- AC1: With no properties, an empty state with an "Add your first property" button is shown.
- AC2: The "Save" button is disabled until district, project, size, and price are all filled.
- AC3: Adding a property for a project that exists in the dataset shows a non-empty "Est. now" value and a gain/loss percentage.
- AC4: The portfolio summary totals equal the sum of the individual properties' invested and estimated values.
- AC5: Editing a property updates its card without creating a duplicate.
- AC6: Deleting a property removes it and updates the summary.
- AC7: Properties persist across a page reload for the same signed-in user.
- AC8: A property whose project has no recent comparable sales shows "—" for estimate and the "No recent comparable sales" basis, and is not counted in the valued total.

---

## 11. Admin data upload (`/admin/upload`)

**Goal:** update the site's dataset without the CLI.

### Behavior
- Admin password field (checked against `ADMIN_PASSWORD` server env).
- Drag-and-drop or click-to-browse CSV upload (max ~4 MB after gzip; client compresses with gzip before sending).
- On submit → server parses the CSV, validates (≥ 100 valid rows), and commits `transactions.json` + `hierarchy.json` to the GitHub repo → Vercel redeploys.
- Success shows parse stats (valid rows, districts, projects, communities) and commit links.
- **Daily auto-sync** panel with a "Run auto-sync now" button (uses admin password) that hits `/api/admin/auto-sync`.

### Acceptance criteria
- AC1: The page renders the password field and the drag-drop zone.
- AC2: Submitting without env vars configured returns a clear "Server not configured. Missing env vars: …" message.
- AC3: Submitting with a wrong password returns a 401 "Wrong admin password".
- AC4: Uploading a non-CSV file is rejected with "Only .csv files are supported".
- AC5: A successful upload displays parse stats and does not crash on non-JSON server responses (413/504 show a readable error).

---

## 12. API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/admin/import-csv` | `ADMIN_PASSWORD` field | Parse uploaded CSV, commit JSON to repo |
| GET | `/api/admin/auto-sync` | `CRON_SECRET` bearer or `X-Admin-Password` | Fetch CSV from `ADREC_CSV_URL`, parse, commit |
| POST | `/api/feedback` | None | Store recommendation feedback (`item_key`, `sentiment`, `comment`) |
| GET | `/api/mls/status` | None | Last MLS crawl status for the banner |
| GET | `/api/mls/crawl` | `CRON_SECRET` (if set) | Update crawl timestamp (cron) |
| GET | `/api/revalidate` | `CRON_SECRET` (if set) | Revalidate cached pages |
| GET | `/api/analytics/refresh` | `CRON_SECRET` (if set) | Recompute analytics, revalidate |

### Acceptance criteria
- AC1: `POST /api/feedback` with `{item_key, sentiment:"up"}` returns 200 `{ ok: true }`.
- AC2: `POST /api/feedback` with a missing `item_key` returns 400.
- AC3: `POST /api/feedback` with `sentiment` not in {up,down} returns 400.
- AC4: `GET /api/mls/status` returns JSON with `lastRun`, `nextRun`, and coverage counts.
- AC5: `GET /api/admin/auto-sync` without auth configured returns an error (does not run).

---

## 13. Cross-cutting features

### Internationalization
- Languages: English (default), Arabic, Russian. Switching to Arabic flips the layout to RTL (`dir="rtl"`) and mirrors UI. Selection persists in localStorage.
- **AC:** Switching to Arabic sets the document direction to RTL and translates nav labels; the choice survives a reload.

### Theme
- Dark (default) and light. Toggle in the header; persists in localStorage.
- **AC:** Toggling the theme switches the palette and persists across reloads.

### Responsiveness
- All pages are responsive; the header collapses to a mobile menu below the `md` breakpoint.
- **AC:** On a narrow viewport the desktop nav is hidden and a hamburger menu opens the nav + auth links.

### Motion / accessibility
- Entrance animations and hover-lift throughout; respects `prefers-reduced-motion` (animations disabled).
- **AC:** With reduced-motion enabled, content is visible without relying on animation.

---

## 14. Non-functional requirements

- **Performance:** initial dashboard interactive within a few seconds on the ~116k-row dataset; data file fetched once with `no-cache`.
- **Reliability:** a malformed data fetch shows an error state with a retry, never a blank page.
- **Data freshness:** client pages always fetch the latest `transactions.json`; a daily cron can refresh it from a configured source.
- **Security:** admin upload gated by password + fine-grained GitHub token (server-side only); no secrets exposed to the client.
- **Safety:** data-import endpoints reject suspiciously small datasets (< 100 rows manual, < 1000 rows auto-sync) to avoid corrupting production.

---

## 15. Key user flows (end-to-end, for scenario tests)

1. **Explore → report:** Land on `/` → click "Explore the dashboard" → filter to a district + 2 BR → click "Download PDF Report" → enter an offer → generate report → see offer-vs-market comparison.
2. **Find a deal:** Go to Listings vs Sales → run the agent for a project → toggle "Distress only" → open a group card → click through to Property Finder.
3. **Get a recommendation:** Go to Market Analysis → filter to a district → open the top Buy card → read reasoning → give thumbs-up with a comment → open its investor report.
4. **Track a property:** Sign up → land on `/account` → add a property you own → see its estimated value and gain/loss → edit the purchase price → confirm the summary updates.
5. **Momentum scan:** Go to Trends → switch window to "Last 3 months" → note the top surging project → open its investor report.
6. **Update data (admin):** Go to `/admin/upload` → enter password → drop a CSV → submit → see parse stats and commit links.

---

## 16. Known constraints (for test expectations)

- Authentication is a **demo stub** — sign-in accepts any valid-format email + any non-empty password; accounts and portfolios live in **localStorage** (per browser), not a server database.
- Live listing (PF/Bayut) prices are **modelled from ADREC medians**, not scraped; deep-links open real search pages for manual verification.
- Property valuations are **modelled estimates**, not appraisals.
- Watchlist, Alerts, and Feedback-history tiles on `/account` are **scaffolded/disabled** placeholders.
- Cron jobs are limited to 2 (Vercel plan constraint).

---

# Appendix A — API reference for testing

Base URL (production): `https://adxb-interact.vercel.app`

All endpoints return JSON. Auth-protected endpoints are stubbed for the demo —
see each entry. Env-dependent endpoints (`import-csv`, `auto-sync`) will return
a `500` "Server not configured" JSON body when their env vars are unset, which
is the expected state on the public demo unless the owner has configured them.

Conventions:
- Content-Type for JSON request bodies: `application/json`.
- Timestamps are ISO-8601 UTC strings.
- Unless noted, GET endpoints need no auth.

---

## A.1 Static data endpoints (read-only)

These back every client page. Good for data-integrity tests.

### GET `/data/transactions.json`
- **Auth:** none. **Params:** none.
- **200** body shape (compact, lookup-encoded):
  ```json
  {
    "l": { "di": ["Al Reem Island", "..."], "pn": ["Pixel", "..."],
           "co": ["..."], "ac": ["residential"], "pt": ["Apartment", "..."] },
    "r": [ ["2026-06-24", 0, 0, 4812, 3, 5, 12, 44, 16107777, 3347, 0, 0, 447.06], "..." ]
  }
  ```
  Each `r` row = `[date, acIdx, ptIdx, sizeSqft, bedrooms, diIdx, coIdx, pnIdx, price, rateSqft, statusCode, seqCode, sizeSqm]`.
- **Tests:** `l.di`, `l.pn`, `l.pt` are non-empty arrays; `r.length` > 100000; every row has 13 elements; `price` (index 8) > 0.

### GET `/data/hierarchy.json`
- **Auth:** none.
- **200** body:
  ```json
  {
    "districts": [ { "id": "al-reem-island", "name": "Al Reem Island", "count": 26026, "projectCount": 80 } ],
    "projects":  [ { "id": "pixel", "name": "Pixel", "district": "Al Reem Island", "community": "RS4", "count": 726 } ]
  }
  ```
- **Tests:** `districts` and `projects` non-empty; every project's `district` exists in `districts[].name`; counts are positive integers.

---

## A.2 POST `/api/feedback`

Store a recommendation thumbs-up/down. Used by the Market Analysis feedback box.

- **Auth:** none.
- **Request headers:** `Content-Type: application/json`
- **Request body:**
  ```json
  {
    "item_key": "Pixel|1",          // required, string  (project|bedrooms)
    "sentiment": "up",              // required, "up" | "down"
    "comment": "asking too high",   // optional, string
    "page": "market-analysis",      // optional, string
    "user_id": "usr_abc123",        // optional, string
    "context": { "verdict": "buy", "score": 96 }  // optional, object
  }
  ```
- **200 success:**
  ```json
  { "ok": true, "received_at": "2026-07-02T10:00:00.000Z" }
  ```
- **Errors:**
  | Condition | Status | Body |
  |---|---|---|
  | Body not valid JSON | 400 | `{ "error": "Invalid JSON" }` |
  | `item_key` missing/not string | 400 | `{ "error": "item_key required" }` |
  | `sentiment` not "up"/"down" | 400 | `{ "error": "sentiment must be 'up' or 'down'" }` |

- **Test cases:**
  - T1: valid `up` → 200, `ok:true`, `received_at` is ISO date.
  - T2: valid `down` with `comment` → 200.
  - T3: missing `item_key` → 400.
  - T4: `sentiment:"maybe"` → 400.
  - T5: empty/non-JSON body → 400.

### GET `/api/feedback`  (health/QA)
- **200:** `{ "ok": true, "count": <int>, "latest": [ ...last 5 entries... ] }`
- **Note:** storage is in-memory per serverless instance; a POST then GET may hit a different instance and not reflect the write. Treat GET as a health check, not a durable read.

---

## A.3 GET `/api/mls/status`

Last MLS crawl status for the "Agent status" banner on `/mls`.

- **Auth:** none. **Params:** none.
- **200** body:
  ```json
  {
    "lastRun": "2026-07-02T09:00:00.000Z",
    "nextRun": "2026-07-03T09:00:00.000Z",
    "durationMs": 4217,
    "projectsCrawled": 312,
    "listingsFound": 8742,
    "distressFound": 437,
    "status": "success",
    "errorMessage": null,
    "isScheduled": true,
    "cronExpression": "0 9 * * *",
    "cronTimezone": "UTC (13:00 Dubai)",
    "synthetic": true
  }
  ```
- **Tests:** always 200; `lastRun` and `nextRun` are ISO dates with `nextRun` > `lastRun`; `status` ∈ {idle, running, success, error}; numeric counts ≥ 0.

---

## A.4 GET `/api/mls/crawl`  (cron)

Updates the crawl timestamp. Scheduled daily at 09:00 UTC.

- **Auth:** if `CRON_SECRET` env is set, requires header `Authorization: Bearer <CRON_SECRET>`. If unset, open.
- **200 success:** `{ "ok": true, "lastRun": "...", "nextRun": "...", "durationMs": <int>, "projectsCrawled": 312, "listingsFound": 8742, "distressFound": 437, "status": "success", "errorMessage": null }`
- **401** when `CRON_SECRET` set and header missing/wrong: `{ "error": "Unauthorized" }`
- **Note:** the handler sleeps ~1.2–2.0s (simulated crawl) before responding.
- **Tests:**
  - T1: with correct Bearer (or no secret configured) → 200, `ok:true`, `status:"success"`.
  - T2: with `CRON_SECRET` configured and wrong/no header → 401.

---

## A.5 GET `/api/revalidate`  (cron)

Revalidates cached pages after a data refresh.

- **Auth:** header `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set; else open.
- **200:** `{ "revalidated": true, "paths": ["/", "/mls", "/mls/report"], "timestamp": "...", "message": "Data refresh triggered successfully" }`
- **401** when secret set and header wrong: `{ "error": "Unauthorized" }`
- **500** on failure: `{ "error": "Revalidation failed", "reason": "<msg>" }`

---

## A.6 GET `/api/analytics/refresh`  (cron)

Recomputes momentum + supply/demand + recommendations, then revalidates.

- **Auth:** `Authorization: Bearer <CRON_SECRET>` when set; else open.
- **200:**
  ```json
  {
    "ok": true,
    "computedAt": "2026-07-02T09:30:00.000Z",
    "durationMs": 1234,
    "projectsAnalyzed": 1011,
    "recommendations": { "total": 50, "buy": 50, "watch": 0, "avoid": 0 },
    "top": [ { "key": "Mayyas at the Bay|0", "opportunityScore": 96, "verdict": "buy", "...": "..." } ],
    "paths": ["/market-analysis", "/trends", "/"]
  }
  ```
- **401** when secret set and header wrong: `{ "error": "Unauthorized" }`
- **500** on internal error: `{ "ok": false, "error": "<msg>" }`
- **Tests:** with valid/no-secret → 200, `ok:true`, `projectsAnalyzed` > 0, `recommendations.total` ≥ 1, `top` is an array, every `top[].opportunityScore` in 0..100.

---

## A.7 POST `/api/admin/import-csv`

Manual CSV upload (from `/admin/upload`). Parses + commits data to the repo.

- **Auth:** `password` form field must equal `ADMIN_PASSWORD` env.
- **Request:** `multipart/form-data`
  | Field | Required | Notes |
  |---|---|---|
  | `file` | yes | the CSV (may be gzip-compressed, see `compressed`) |
  | `password` | yes | admin password |
  | `compressed` | no | `"gzip"` if the file body is gzip-compressed |
  | `originalSize` | no | original byte size (informational) |
- **200 success:**
  ```json
  {
    "ok": true,
    "stats": { "totalRows": 116326, "validRows": 116252, "skipped": 74,
               "districts": 133, "projects": 370, "communities": 931,
               "fileSizeBytes": 6712345 },
    "commits": { "transactions": "https://github.com/.../commit/abc",
                 "hierarchy": "https://github.com/.../commit/def" },
    "message": "Files committed. Vercel will redeploy in ~2 minutes."
  }
  ```
- **Errors:**
  | Condition | Status | Body |
  |---|---|---|
  | `ADMIN_PASSWORD` env unset | 500 | `{ "error": "Server not configured. Missing env var: ADMIN_PASSWORD" }` |
  | GitHub env vars unset | 500 | `{ "error": "Server not configured. Missing env vars: GITHUB_TOKEN, ..." }` |
  | Bad multipart body | 400 | `{ "error": "Invalid multipart body" }` |
  | Wrong password | 401 | `{ "error": "Wrong admin password" }` |
  | Missing `file` | 400 | `{ "error": "Missing \`file\` field" }` |
  | File unreadable/decompress fail | 400 | `{ "error": "Failed to read file: ..." }` |
  | CSV < 100 bytes | 400 | `{ "error": "CSV is too small / empty" }` |
  | CSV parse throws | 400 | `{ "error": "<parse message>" }` |
  | < 100 valid rows | 400 | `{ "error": "Suspiciously few rows (N). Aborting...", "stats": {...} }` |
  | GitHub commit fails | 502 | `{ "error": "GitHub PUT ... failed: ...", "stats": {...} }` |
- **Body limit:** Vercel caps the request body (~4.5 MB); larger uploads should be gzip-compressed client-side. A too-large body returns a non-JSON `413` from the platform (tests should handle a non-JSON error here).
- **Test cases (safe on demo — env is unset):**
  - T1: POST with any password and no env → 500 "Server not configured".
  - (If env configured) T2: wrong password → 401; T3: missing file → 400; T4: tiny CSV → 400.

---

## A.8 GET `/api/admin/auto-sync`  (cron + manual)

Daily data refresh: fetch CSV from `ADREC_CSV_URL`, parse, commit.

- **Auth (either works):**
  - `Authorization: Bearer <CRON_SECRET>`  (used by Vercel cron), or
  - `X-Admin-Password: <ADMIN_PASSWORD>`  (manual trigger from the admin UI).
- **200 success:**
  ```json
  {
    "ok": true,
    "syncedAt": "2026-07-02T06:00:01.000Z",
    "source": { "url": "https://.../file.csv", "sizeBytes": 17234567, "fetchedMs": 1234 },
    "parse": { "totalRows": 116326, "validRows": 116252, "skipped": 74,
               "districts": 133, "projects": 370, "communities": 931 },
    "commits": { "transactions": "https://github.com/.../commit/abc",
                 "hierarchy": "https://github.com/.../commit/def" },
    "message": "Auto-sync committed. Vercel will redeploy in ~2 minutes."
  }
  ```
- **200 no-op** (source unchanged since last sync):
  ```json
  { "ok": true, "syncedAt": "...", "source": {...},
    "parse": { "totalRows": 0, "validRows": 0, "...": 0 },
    "skipped": { "reason": "Source CSV unchanged since last sync (hash match)" },
    "message": "No update needed — source data unchanged." }
  ```
- **Errors:**
  | Condition | Status | Body |
  |---|---|---|
  | No `CRON_SECRET` and no `ADMIN_PASSWORD` configured | 500 | `{ "error": "Auth not configured" }` |
  | Auth configured but header wrong | 401 | `{ "error": "Unauthorized" }` |
  | `ADREC_CSV_URL` unset | 500 | `{ "error": "ADREC_CSV_URL env var not set. ..." }` |
  | GitHub env vars unset | 500 | `{ "error": "Server not configured. Missing env vars: ..." }` |
  | Source URL non-200 | 502 | `{ "error": "Source URL returned <code>: ..." }` |
  | Source fetch throws | 502 | `{ "error": "Failed to fetch source CSV: ..." }` |
  | Source CSV < 1000 bytes | 502 | `{ "error": "Source CSV suspiciously small (N bytes). Aborting." }` |
  | Parse throws | 400 | `{ "error": "<parse message>" }` |
  | < 1000 valid rows | 400 | `{ "error": "Suspiciously few valid rows (N). Aborting...", "stats": {...} }` |
  | GitHub commit fails | 502 | `{ "error": "GitHub PUT ... failed", "stats": {...} }` |
- **Test cases (safe on demo):**
  - T1: GET with no auth headers and nothing configured → 500 (fail-closed).
  - T2: GET with wrong `X-Admin-Password` (auth configured) → 401.

---

## A.9 Auth model (for API-adjacent UI tests)

There is **no server auth API** in the demo — sign-in/up/session are handled
client-side in the browser via `localStorage` (keys: `adxb-session-v1`,
`adxb-portfolio-<userId>`, `adxb-recommendation-feedback`, `adxb-lang`,
`adxb-theme`, `adxb-guide-*`). API tests should not expect `/api/auth/*`
endpoints. To test authenticated UI, drive the sign-in form or seed
`localStorage` directly.

- Session shape (localStorage `adxb-session-v1`):
  ```json
  { "user": { "id": "usr_x", "email": "you@example.com", "userType": "investor",
              "interests": [], "preferredDistricts": [], "preferredPropertyTypes": [],
              "preferredBedrooms": [], "tier": "registered", "createdAt": "..." },
    "token": "tok_x", "expiresAt": "2026-08-01T00:00:00.000Z" }
  ```

---

## A.10 Summary matrix

| Method | Path | Auth | Success | Notable errors |
|---|---|---|---|---|
| GET | `/data/transactions.json` | none | 200 JSON | — |
| GET | `/data/hierarchy.json` | none | 200 JSON | — |
| POST | `/api/feedback` | none | 200 `{ok}` | 400 |
| GET | `/api/feedback` | none | 200 `{ok,count}` | — |
| GET | `/api/mls/status` | none | 200 status | — |
| GET | `/api/mls/crawl` | Bearer CRON_SECRET* | 200 `{ok}` | 401 |
| GET | `/api/revalidate` | Bearer CRON_SECRET* | 200 | 401, 500 |
| GET | `/api/analytics/refresh` | Bearer CRON_SECRET* | 200 | 401, 500 |
| POST | `/api/admin/import-csv` | `password` field | 200 `{ok,stats}` | 400, 401, 500, 502 |
| GET | `/api/admin/auto-sync` | Bearer or X-Admin-Password | 200 `{ok}` | 401, 400, 500, 502 |

\* Auth enforced only when `CRON_SECRET` is set in the environment; otherwise the endpoint is open.
