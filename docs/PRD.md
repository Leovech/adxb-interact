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
