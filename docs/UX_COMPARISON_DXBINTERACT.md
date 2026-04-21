# ADXBInteract vs dxbinteract.com — UX comparison

A pragmatic, side-by-side look at where our Abu Dhabi product wins, where the
Dubai-focused dxbinteract.com still beats us, and the concrete next moves.

> Note on methodology: dxbinteract.com blocks unauthenticated headless fetches,
> so the comparison below relies on prior public knowledge of the site
> (transactions explorer, project pages, rental yield map, market reports). If
> any item below is out of date, treat it as a hypothesis to verify in-browser.

---

## TL;DR

| Area                       | dxbinteract.com                                 | adxb-interact (us)                                  | Winner |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------- | ------ |
| Geographic coverage        | Dubai only                                      | Abu Dhabi only                                      | tie    |
| Transaction depth          | DLD-fed, ~10y back, ~daily refresh              | ADREC-derived, last 24 mo (rolling)                 | dxb    |
| Map exploration            | Heatmap + parcel polygons                       | Point cluster MapLibre                              | dxb    |
| Project pages              | Permalink page per project, sales + rentals     | Inline drilldown only, no permalinks                | dxb    |
| Rental yield               | First-class metric, mapped                      | Not yet computed                                    | dxb    |
| Live MLS / asking prices   | None — closed sales only                        | PF + Bayut deltas vs ADREC, distress flags          | **us** |
| Smart natural-lang search  | Basic faceted filters                           | "Ask the agent" parser w/ live preview              | **us** |
| Multi-language             | EN only                                         | EN + AR (RTL) + RU                                  | **us** |
| Theme                      | Light only                                      | Dark + light, auto-persisted                        | **us** |
| Investor report export     | Paid PDF reports for some projects              | Not yet — being added in this branch                | dxb    |
| Page weight / TTI          | Heavy (lots of widgets, ads)                    | Light (single Next 16 bundle)                       | **us** |
| Mobile UX                  | Decent but cramped on map                       | Good — sticky filter, collapsible cards             | **us** |

---

## What dxbinteract does better — and what we should steal

1. **Permalink project pages.** Every Dubai project has its own URL with all
   metrics on it (sales, rentals, supply, handover). Easy to share, easy to
   index in Google. Our `/mls` is one big SPA — nothing is linkable.
   *Fix:* Add `/mls/project/[projectId]` and `/mls/report` (started in this
   branch).

2. **Rental yield as a first-class metric.** They map gross yield by area;
   it's the single most-referenced number for investors. We have asking +
   sale prices but no yield model.
   *Fix:* Add an `estimateRentalYield()` helper using ADREC rental data once
   it lands. As a stop-gap, derive a yield band from district averages.

3. **Heatmap by metric (price, yield, volume).** Our map plots transactions
   as points which becomes useless above a few thousand rows.
   *Fix:* Add a choropleth layer keyed by district polygon; metric switcher
   above the legend.

4. **Supply/handover schedule.** They show units coming online by quarter for
   each project. We only show what's already transacted.
   *Fix:* Add a `Hierarchy.handovers` slice once we have the project pipeline
   data; render a simple bar by quarter.

5. **Polished, opinionated PDF reports.** They monetise this. Our investor
   report (this PR) needs to feel print-ready, not "dashboard with a print
   button." That's the design bar to hit.

## What we already do better — keep pushing

1. **MLS-vs-actual comparison.** dxbinteract has nothing equivalent — closed
   sales only. The "asking premium vs ADREC median" + per-listing distress
   flag is genuinely novel for Abu Dhabi.
   *Push:* Track historical premium (last week / last month) so users can see
   if the gap is widening.

2. **Smart-search input.** The "Ask the agent" box that parses district +
   project + bedrooms from a free-text query in one shot is a much faster
   funnel than three dropdowns.
   *Push:* Accept price ranges ("under 2M", "above 1.5M") and yield filters.

3. **i18n with proper RTL.** Arabic mirroring is genuinely correct; dxb is
   English-only. This matters for the local broker market.
   *Push:* Add CN and FR — they are the next two highest origin-of-buyer
   languages for Abu Dhabi off-plan.

4. **Dark mode.** We persist it. They don't have one. Small but signals
   modernity to the developer/finance audience that lives in dark IDEs all
   day.

5. **Lean, framework-modern stack.** Next 16 + React 19 + Tailwind 4 means
   pages stay sub-200KB. Theirs ships a long tail of jQuery widgets and ads.

## Concrete UX gaps in our current `/mls` (addressed in this branch)

| Symptom                                                           | Root cause                                                                                          | Fix                                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| "Property Finder only" / "Bayut only" toggle does nothing         | `MLSFilterState.platform` defined but never read by `applyMLSFilters`                                | Apply at filter time AND re-aggregate group stats on the filtered listings        |
| Card stats (median, distress count) include both platforms even when you scope to one | Group stats are pre-computed once at `buildListingGroups`                                            | Recompute medians & distress count from the post-filter listings                  |
| No visible platform toggle in the UI                              | Field exists in state but no `<select>` rendered                                                    | Add a 3-state platform pill row to the filter panel                                |
| Distress threshold (5%) is buried, users can't tune it            | Hard-coded `0.95` constant in two places                                                            | Surface as a `distressThresholdPct` filter, default 5, slider in UI                |
| Expanded card stays "open" even after filters change              | `expandedGroup` keyed by `key` survives filter changes                                              | Reset on every `runAgent`                                                          |
| You can't share a comparison view                                 | Whole `/mls` is client state                                                                        | Encode filter state into URL search params                                         |
| No way to take a snapshot for a client                            | No report flow                                                                                      | New `/mls/report?key=...` page with print stylesheet                               |

The platform-filter and stats-aggregation fixes plus the report flow ship in
this branch. URL-state sharing and the distress-threshold slider are queued
for a follow-up.
