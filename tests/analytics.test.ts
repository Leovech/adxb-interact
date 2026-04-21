/**
 * Tests for the new analytics stack:
 *   - momentum (Trends page)
 *   - supply/demand signals (Market Analysis page)
 *   - recommendation scoring + verdict + tags
 *
 * Uses synthetic deterministic fixtures so behaviour can be pinned without
 * depending on the shipped JSON dataset.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildProjectMomentum, sortByWindow } from "../src/lib/analytics/momentum.ts";
import { buildCohortSignals } from "../src/lib/analytics/supply-demand.ts";
import {
  buildRecommendations,
  scoreRecommendation,
  SCORE_WEIGHTS,
} from "../src/lib/analytics/recommendations.ts";
import { buildListingGroups } from "../src/lib/mls-data.ts";
import type { Transaction } from "../src/data/abu-dhabi.ts";

// --- Fixtures --------------------------------------------------------------

function tx(o: Partial<Transaction>): Transaction {
  return {
    id: 0, date: "2026-03-15",
    assetClass: "Residential", propertyType: "Apartment",
    sizeSqft: 700, sizeSqm: 65, bedrooms: 1, layout: "",
    district: "Al Reem Island", districtId: "al-reem-island",
    community: "RS4", project: "Pixel", projectId: "pixel",
    price: 1_500_000, ratePerSqft: 2000,
    status: "Ready", sequence: "Secondary",
    ...o,
  };
}

function fixture() {
  const rows: Transaction[] = [];
  const today = new Date();

  // Pixel 1BR: very active recently (surging)
  for (let daysAgo = 0; daysAgo < 8; daysAgo++) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    rows.push(
      tx({
        id: 1000 + daysAgo,
        date: d.toISOString().slice(0, 10),
        price: 1_500_000 + daysAgo * 5000,
      })
    );
  }
  // Pixel 1BR earlier history (few tx over last 12 months)
  for (let monthsAgo = 2; monthsAgo < 12; monthsAgo++) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - monthsAgo);
    rows.push(
      tx({
        id: 2000 + monthsAgo,
        date: d.toISOString().slice(0, 10),
        price: 1_200_000 + monthsAgo * 5000,
      })
    );
  }

  // Reem Heights 1BR — area-average, balanced activity
  for (let monthsAgo = 0; monthsAgo < 12; monthsAgo++) {
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - monthsAgo);
      d.setDate(10 + i * 6);
      rows.push(
        tx({
          id: 3000 + monthsAgo * 10 + i,
          date: d.toISOString().slice(0, 10),
          project: "Reem Heights",
          projectId: "reem-heights",
          community: "Najmat",
          price: 2_000_000 + i * 10_000,
          ratePerSqft: 2500,
        })
      );
    }
  }

  // Quiet Tower 1BR — cooling (lots last year, almost nothing recent)
  for (let monthsAgo = 6; monthsAgo < 12; monthsAgo++) {
    for (let i = 0; i < 4; i++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - monthsAgo);
      d.setDate(i * 7 + 1);
      rows.push(
        tx({
          id: 4000 + monthsAgo * 10 + i,
          date: d.toISOString().slice(0, 10),
          project: "Quiet Tower",
          projectId: "quiet-tower",
          price: 1_800_000,
          ratePerSqft: 2300,
        })
      );
    }
  }
  return rows;
}

// --- momentum --------------------------------------------------------------

describe("buildProjectMomentum", () => {
  const rows = fixture();
  const momentum = buildProjectMomentum(rows);

  it("produces one entry per (project, bedrooms) cohort with ≥3 tx in 12mo", () => {
    const keys = new Set(momentum.map((m) => `${m.project}|${m.bedrooms}`));
    assert.ok(keys.has("Pixel|1"));
    assert.ok(keys.has("Reem Heights|1"));
  });

  it("counts across multiple windows for Pixel", () => {
    const p = momentum.find((m) => m.project === "Pixel")!;
    assert.ok(p.counts["10d"] >= 7, "8-day burst should show up in 10d window");
    assert.ok(p.counts["12mo"] > p.counts["3mo"], "12mo count must exceed 3mo");
  });

  it("assigns 'surging' badge when 3mo momentum >= 1.5 and count_3mo >= 5", () => {
    const p = momentum.find((m) => m.project === "Pixel")!;
    // The burst of 8 tx in last 10 days is wildly above 12-month expectation
    assert.ok(p.momentum["3mo"] >= 1.0, "momentum must be measurable");
    if (p.counts["3mo"] >= 5 && p.momentum["3mo"] >= 1.5) {
      assert.ok(p.badges.includes("surging"));
    }
  });

  it("assigns 'cooling' badge when activity collapses", () => {
    const q = momentum.find((m) => m.project === "Quiet Tower");
    if (q) {
      // 3mo count is 0 relative to 24 tx in prior 6mo
      assert.ok(q.momentum["3mo"] <= 0.5);
      assert.ok(q.badges.includes("cooling"));
    }
  });

  it("most_active is applied to top-5 by 90d count", () => {
    const anyMostActive = momentum.filter((m) => m.badges.includes("most_active"));
    assert.ok(anyMostActive.length >= 1);
  });

  it("sortByWindow orders descending by the requested window", () => {
    const sorted = sortByWindow(momentum, "12mo");
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i - 1].counts["12mo"] >= sorted[i].counts["12mo"]);
    }
  });

  it("district filter scopes the cohorts", () => {
    const scoped = buildProjectMomentum(rows, { districtFilter: "Al Reem Island" });
    for (const s of scoped) assert.equal(s.district, "Al Reem Island");
  });
});

// --- supply-demand ---------------------------------------------------------

describe("buildCohortSignals", () => {
  const rows = fixture();
  const listingGroups = buildListingGroups(rows);
  const signals = buildCohortSignals(rows, listingGroups);

  it("includes project, area, and all-types medians", () => {
    const pixel = signals.find((s) => s.project === "Pixel")!;
    assert.ok(pixel.projectMedianPrice > 0);
    assert.ok(pixel.areaBedroomsMedianPrice > 0);
    assert.ok(pixel.areaAllTypesMedianPrice > 0);
  });

  it("priceDiscountPct is positive when project is below area median", () => {
    const pixel = signals.find((s) => s.project === "Pixel")!;
    const reem = signals.find((s) => s.project === "Reem Heights")!;
    // Pixel is cheaper than Reem Heights in this fixture
    if (pixel.projectMedianPrice < reem.projectMedianPrice) {
      assert.ok(pixel.priceDiscountPct >= 0, "Pixel should show discount vs area");
    }
  });

  it("supplyDemandRatio is listings/tx90d", () => {
    for (const s of signals) {
      if (s.tx90d > 0 && s.activeListings > 0) {
        const expected = Math.round((s.activeListings / s.tx90d) * 100) / 100;
        assert.equal(s.supplyDemandRatio, expected);
      }
    }
  });
});

// --- recommendations -------------------------------------------------------

describe("buildRecommendations", () => {
  const rows = fixture();
  const listingGroups = buildListingGroups(rows);
  const signals = buildCohortSignals(rows, listingGroups);
  const momentum = buildProjectMomentum(rows);

  const momentumByKey = new Map();
  for (const m of momentum) momentumByKey.set(`${m.project}|${m.bedrooms}`, m);
  const distressByKey = new Map<string, number>();
  for (const g of listingGroups) distressByKey.set(g.key, g.distressCount);

  const recs = buildRecommendations(signals, momentumByKey, {
    distressCountByKey: distressByKey,
  });

  it("returns recommendations sorted by opportunity score descending", () => {
    for (let i = 1; i < recs.length; i++) {
      assert.ok(
        recs[i - 1].opportunityScore >= recs[i].opportunityScore,
        "must be sorted descending"
      );
    }
  });

  it("every recommendation has a verdict and at least one reasoning bullet", () => {
    for (const r of recs) {
      assert.ok(["buy", "watch", "avoid"].includes(r.verdict));
      assert.ok(r.reasoning.length >= 1);
      assert.ok(r.headline.length > 0);
    }
  });

  it("SCORE_WEIGHTS sum to 1 (within floating-point tolerance)", () => {
    const sum =
      SCORE_WEIGHTS.priceDiscount +
      SCORE_WEIGHTS.demand +
      SCORE_WEIGHTS.supplyTightness +
      SCORE_WEIGHTS.momentum +
      SCORE_WEIGHTS.unitTypeSpread;
    assert.ok(Math.abs(sum - 1) < 1e-6);
  });

  it("scoreRecommendation returns 0-100", () => {
    for (const r of recs) {
      assert.ok(r.opportunityScore >= 0);
      assert.ok(r.opportunityScore <= 100);
      const recomputed = scoreRecommendation(r.signals, r.momentum);
      assert.equal(r.opportunityScore, recomputed);
    }
  });

  it("assigns 'thin_liquidity' tag to cohorts with <8 tx / 12mo", () => {
    for (const r of recs) {
      if (r.signals.tx12mo < 8) assert.ok(r.tags.includes("thin_liquidity"));
    }
  });

  it("thin-liquidity cohorts never score 'buy' unless the signal is unusually strong", () => {
    const thinBuys = recs.filter(
      (r) => r.tags.includes("thin_liquidity") && r.verdict === "buy"
    );
    for (const r of thinBuys) {
      // Thin-liquidity gating in recommendations.ts: must score ≥65
      assert.ok(r.opportunityScore >= 65);
    }
  });
});
