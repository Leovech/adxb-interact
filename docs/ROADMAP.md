# ADXBInteract — Product Roadmap

Living document. Updated alongside feature work.

## Current state (this release)

The product is now structured as a real investor platform, not a dashboard
with widgets. Information architecture:

```
/                    Dashboard           market exploration + filters
/trends              Trends              project momentum, surging/cooling
/market-analysis     Market Analysis     ranked recommendations + feedback
/mls                 MLS Compare         asking vs ADREC closed-sale deltas
/mls/report          Investor Report     printable one-page brief
/sign-in, /sign-up   Auth                stubbed — drop-in for Auth.js later
/account             Account             profile, preferences, feedback hist
/api/feedback        POST                stores recommendation feedback
/api/analytics/refresh  GET              daily recompute (Vercel cron)
/api/mls/{crawl,status}                  existing MLS agent
/api/revalidate                          existing cron hook
```

### What ships

- **Trends page** — momentum for 10d / 3mo / 6mo / 9mo / 12mo with surging,
  cooling, new-demand highlight strips + ranked table.
- **Market Analysis page** — ranked Buy / Watch / Avoid recommendations with
  explicit opportunity score (0-100), plain-English reasoning anchored in
  numbers, and per-card thumbs-up/down feedback box.
- **Analytics engine** — `lib/analytics/{momentum,supply-demand,recommendations}.ts`.
  Pure functions. Tested. Score weights live in one exported constant so
  tuning is trivial.
- **Auth scaffolding** — `lib/auth/{session,gates}.ts` +
  `components/auth/{AuthProvider,AuthGate,SignInForm,SignUpForm}`. Stub
  backed by localStorage; the call sites are shaped so swapping in Auth.js
  v5 is a one-file change.
- **Feature gates** — single source of truth in `lib/auth/gates.ts`.
  `public / registered / pro` tiers. During demo phase most features are
  `public`; Watchlist, Alerts, Feedback history, Export are `registered`;
  Portfolio Tracker is `pro`.
- **Feedback API** — `POST /api/feedback`. In-memory log today; SQL table
  spec documented in the route file for Phase 2.
- **Daily analytics cron** — `/api/analytics/refresh` runs at 09:30 UTC.
  Computes recommendations, logs summary, revalidates pages.

### What's deferred (structured so Phase 2 is a drop-in)

| Feature | Today | Phase 2 migration |
|---|---|---|
| Auth identity | localStorage stub | Auth.js v5 (NextAuth) + Postgres user table |
| Sessions | localStorage JSON | Server-side JWT via NextAuth |
| Feedback storage | in-memory ring buffer | Postgres table (schema in `/api/feedback/route.ts`) |
| Recommendation snapshots | computed per-request | Vercel KV snapshot written by cron |
| Watchlist / Alerts | UI tiles scaffolded, disabled | Wire to DB + email/push notifier |
| Personalization | user.preferredDistricts seeds filters | Re-rank scores by interest-distance |

## Phase 2 — account system + real auth (est. 3-5 days)

Drop-in replacements keep every existing call site intact.

### Auth.js v5 migration

1. `npm install next-auth@beta @auth/prisma-adapter bcryptjs`
2. Create `src/auth.ts` with NextAuth config (email + password, Google OAuth,
   Apple OAuth). Use Prisma adapter against Vercel Postgres.
3. Rewrite the three functions in `src/lib/auth/session.ts`:
   - `stubSignIn` → call `signIn("credentials", ...)` from `next-auth/react`
   - `stubSignUp` → POST to `/api/auth/signup`, which bcrypt-hashes and
     inserts into the `users` table, then calls NextAuth to issue a session
   - `stubSignOut` → `signOut()` from `next-auth/react`
4. Rewrite `readSession()` to call `auth()` (server) or `useSession()` (client).
5. `AuthProvider` becomes a thin wrapper around `SessionProvider` — no call
   site in any page changes.

### Postgres schema (proposed)

```sql
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text,                         -- nullable for OAuth-only users
  name          text,
  user_type     text NOT NULL CHECK (user_type IN ('investor','broker','agent','developer','other')),
  tier          text NOT NULL DEFAULT 'registered' CHECK (tier IN ('public','registered','pro')),
  interests     text[] NOT NULL DEFAULT '{}',
  preferred_districts       text[] NOT NULL DEFAULT '{}',
  preferred_property_types  text[] NOT NULL DEFAULT '{}',
  preferred_bedrooms        text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recommendation_feedback (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id  text,                            -- grouping for anonymous feedback
  item_key    text NOT NULL,                   -- project|bedrooms
  sentiment   text NOT NULL CHECK (sentiment IN ('up','down')),
  comment     text,
  page        text NOT NULL,                   -- market-analysis, trends, ...
  context     jsonb,                           -- snapshot of verdict/score at feedback time
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON recommendation_feedback (item_key, created_at DESC);
CREATE INDEX ON recommendation_feedback (user_id, created_at DESC);

CREATE TABLE watchlists (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key         text NOT NULL,                   -- project|bedrooms OR a filter hash
  label       text,
  filters     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE TABLE alerts (
  id            bigserial PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          text NOT NULL,                 -- 'distress_new','score_threshold','momentum_surge'
  scope_filters jsonb NOT NULL,                -- what to watch
  channel       text NOT NULL CHECK (channel IN ('email','push','in_app')),
  last_fired_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recommendation_snapshots (
  computed_at   timestamptz NOT NULL,
  payload       jsonb NOT NULL,                -- serialized Recommendation[]
  PRIMARY KEY (computed_at)
);
```

### Route protection via middleware

Add `src/middleware.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = [/^\/account/, /^\/api\/watchlist/, /^\/api\/alerts/];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!PROTECTED.some((rx) => rx.test(path))) return NextResponse.next();
  // Once Auth.js is wired, check the JWT cookie here
  const cookie = req.cookies.get("next-auth.session-token");
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/account/:path*", "/api/watchlist/:path*", "/api/alerts/:path*"] };
```

## Phase 3 — competitor-grade features (prioritized)

Informed by dxbinteract.com (Dubai), Property Monitor, Reidin, Zonda (US). P0
items ship this release; P1/P2/P3 are prioritized by retention impact.

### P0 (shipped)

- **Sales momentum + surging badges** — competitors bury this, we lead with
  it on `/trends`.
- **Supply vs demand** — the single most-asked question from Abu Dhabi
  investors. Shows on Market Analysis as `inventoryMonths` and `tx_per_month`.
- **Opportunity score + narrative** — PM/Reidin charge for this; we
  commoditize it on `/market-analysis`.

### P1 (next 2 weeks)

- **Watchlist** — route + UI tile exist, needs DB + persistence. Simplest
  shape: `watchlists(user_id, key, label, filters_json)`. Card tiles on
  `/account` populate from this. "Save this project" button on `/mls` cards
  and `/market-analysis` cards.
- **Project comparison** — a `/compare?keys=pixel|1,reem-heights|1` page
  showing two project cohorts side by side (existing `InvestorReport`
  sections, rendered twice). Brokers always screenshot two cards adjacent.
- **Saved searches + email alerts** — shape already documented in the
  schema above. Daily cron checks each user's `scope_filters` against the
  new recommendation set, emails diffs.
- **Rental yield heatmap** — overlay on existing `MapView`, keyed by
  district polygon. We already compute `yieldEstimate` in investor report
  — just lift it to a map layer.

### P2 (next 4-6 weeks)

- **Days-on-market estimates** — requires snapshotting MLS listing counts
  over time; daily MLS cron already runs, add historical table.
- **Market alerts panel** — in-app inbox + push subscription.
- **Export CSV/XLSX** — gate behind `registered` tier; reuses existing
  filtered transaction data. Hook to convert-kit-style conversion ("export
  this view → sign up free, get it emailed").
- **Recommendation history** — store served recommendations per user, so
  you can see how past calls aged (was that "Buy — Pixel 1BR" right?).
  Feeds into the feedback → model loop.

### P3 (later)

- **Portfolio tracker** — paid tier. User uploads owned units → dashboard
  shows current value, paper P&L, next-sale window based on liquidity.
- **Developer pipeline** — integrate handover schedules from DMT/MUNI data
  to show upcoming supply.
- **Mortgage calculator overlay** — per-unit affordability, LTV, yield
  after financing.

## Monetization alignment

Feature gates in `lib/auth/gates.ts` are the monetization surface:

| Tier | Price | Unlocks |
|---|---|---|
| `public` | Free | Dashboard, Trends, MLS Compare, single printable Investor Report |
| `registered` | Free (email) | Watchlist, Saved searches, Feedback history, Export |
| `pro` | Paid | Portfolio tracker, Email alerts, unlimited reports, API access |

When a `public` user hits a `registered` feature the `AuthGate` renders an
upsell card instead of the content — already wired in.

## Analytics tuning & feedback loop

The recommendation scoring is a transparent weighted sum
(`SCORE_WEIGHTS` in `recommendations.ts`). The feedback system is designed
to close the loop:

1. User sees recommendation → thumbs-up / down → optional comment.
2. Feedback written to DB with verdict+score snapshot.
3. Weekly analytics pass aggregates sentiment per verdict bucket.
4. If "buy" recommendations trend thumbs-down in a district, the scoring
   function is re-tuned for that district.
5. Eventually: per-user personalization by training a small model on each
   user's feedback history (keep rule-based engine as a fallback /
   transparency layer).

## Known technical debt

- **LanguageProvider + setState-in-effect lint warnings** — predate this
  branch, share pattern across `Header`, `TransactionTable`. Fix all
  together when refactoring to React 19 idioms.
- **MLS listings are modelled, not scraped** — the premise works for the
  demo (and the model is calibrated); real scraping + MLS partnership is
  Phase 2 work.
- **Authentication is a stub** — addressed in this roadmap's Phase 2.
- **Dataset is a static JSON file** — OK while small; migrate to Postgres
  when we want search/filter server-side.
