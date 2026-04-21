/**
 * Regression tests for the Pixel 1BR incident: MLS asking prices were
 * coming out ~30% below real PF/Bayut asking inventory because:
 *
 *   (a) the sample generator anchored listings to the 24-month ADREC
 *       median, which lags the current market in fast-moving districts
 *       like Al Reem Island; and
 *   (b) the +multiplier distribution was too narrow (median +1-2%
 *       above anchor, real-world is +8-15%).
 *
 * These tests pin both fixes so they don't silently revert.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildListingGroups, getDistressListings } from "../src/lib/mls-data.ts";
import type { Transaction } from "../src/data/abu-dhabi.ts";

// --- Fixture: Pixel-like rising market -------------------------------------

function tx(o: Partial<Transaction>): Transaction {
  return {
    id: 0, date: "2025-06-15",
    assetClass: "Residential", propertyType: "Apartment",
    sizeSqft: 747, sizeSqm: 69, bedrooms: 1, layout: "",
    district: "Al Reem Island", districtId: "al-reem-island",
    community: "RS4", project: "Pixel", projectId: "pixel",
    price: 1_200_000, ratePerSqft: 1500,
    status: "Ready", sequence: "Secondary",
    ...o,
  };
}

/**
 * Simulate a rising market: 60 transactions spread across the last 24 months
 * where the rate climbs from ~1,400 AED/sqft (2 years ago) to ~2,000 AED/sqft
 * (last 6 months). This matches actual Pixel 1BR data on Al Reem Island.
 */
function risingMarket(): Transaction[] {
  const rows: Transaction[] = [];
  const today = new Date();
  for (let monthsAgo = 0; monthsAgo < 24; monthsAgo++) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - monthsAgo);
    d.setDate(15);
    // Rate 2y ago: 1400, rate today: 2000 — linear climb
    const rate = Math.round(2000 - (monthsAgo / 24) * 600);
    const size = 740 + ((monthsAgo * 7) % 40) - 20; // 720-760
    const price = Math.round(size * rate);
    // 2-3 tx per month
    const perMonth = 2 + (monthsAgo % 2);
    for (let i = 0; i < perMonth; i++) {
      rows.push(
        tx({
          id: monthsAgo * 10 + i,
          date: d.toISOString().slice(0, 10),
          sizeSqft: size + i * 3,
          price: price + i * 5000,
          ratePerSqft: rate + i * 5,
        })
      );
    }
  }
  return rows;
}

// --- Tests ------------------------------------------------------------------

describe("rising market: recent-median anchor (Pixel 1BR regression)", () => {
  const [group] = buildListingGroups(risingMarket());

  it("builds a group from the rising-market fixture", () => {
    assert.ok(group, "group must exist");
    assert.equal(group.project, "Pixel");
  });

  it("recent median rate is materially higher than the 24mo median", () => {
    // We crafted the fixture so recent-6mo ≈ 1900+ and 24mo ≈ 1700
    assert.ok(group.recentMedianRate > group.adrecMedianRate,
      "recent should exceed 24mo in a rising market");
    const drift = (group.recentMedianRate - group.adrecMedianRate) / group.adrecMedianRate;
    assert.ok(drift >= 0.05, `drift must be ≥5% (got ${(drift * 100).toFixed(1)}%)`);
  });

  it("picks the 6-month window when tx density supports it", () => {
    assert.equal(group.recentWindowMonths, 6);
    assert.ok(group.recentTxCount >= 5);
  });

  it("asking median sits ≥5% above the RECENT market (not below it)", () => {
    // The whole user complaint was that asking was coming out BELOW live
    // PF/Bayut. Real asking sits +8-15% above closed-sale median.
    const premium = group.premiumPct; // vs recent median
    assert.ok(
      premium >= 5,
      `asking premium vs recent must be ≥5% (got ${premium.toFixed(1)}%)`
    );
    // Sanity-check: not ridiculously above either
    assert.ok(premium <= 25, `asking premium should be ≤25% (got ${premium.toFixed(1)}%)`);
  });

  it("most individual listings are priced at or above recent median", () => {
    const atOrAbove = group.listings.filter(
      (l) => l.askingRate >= group.recentMedianRate
    ).length;
    const ratio = atOrAbove / group.listings.length;
    // At least 60% of listings should be at market or higher — sellers in a
    // rising market rarely list below current closed-sale rate.
    assert.ok(ratio >= 0.6, `≥60% must be at/above recent median (got ${(ratio * 100).toFixed(0)}%)`);
  });

  it("distress detection fires against RECENT median, not 24mo", () => {
    // Listings anchored to the rising recent median shouldn't all be flagged
    // as "distress" merely because they sit above the 24mo median. The
    // distressCount must measure distance from the recent anchor.
    const belowRecent = group.listings.filter(
      (l) => l.askingRate < group.recentMedianRate * 0.95
    ).length;
    assert.equal(group.distressCount, belowRecent,
      "distressCount must equal listings ≥5% below recent median");
  });

  it("getDistressListings returns same count as summed group.distressCount", () => {
    const distress = getDistressListings([group]);
    assert.equal(distress.length, group.distressCount);
    for (const d of distress) {
      // discountPct is vs recent median (exposed as adrecMedianRate for
      // legacy callers, but computed from recentMedianRate internally)
      assert.ok(d.discountPct <= -5 + 1e-6);
    }
  });
});

describe("stable market: window picker falls back to older data", () => {
  it("uses 12-month window when 6mo has <5 tx", () => {
    // Only 3 tx in last 6 months, plenty in last 12
    const rows: Transaction[] = [];
    const today = new Date();
    for (let monthsAgo = 7; monthsAgo < 12; monthsAgo++) {
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - monthsAgo);
        rows.push(
          tx({
            id: monthsAgo * 10 + i,
            date: d.toISOString().slice(0, 10),
            project: "Stable Tower",
            ratePerSqft: 1500 + i,
            price: 1_100_000 + i * 1000,
          })
        );
      }
    }
    // Add 2 tx in last 6mo — below threshold of 5
    for (let i = 0; i < 2; i++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 2);
      rows.push(
        tx({
          id: 900 + i,
          date: d.toISOString().slice(0, 10),
          project: "Stable Tower",
          ratePerSqft: 1510,
          price: 1_110_000,
        })
      );
    }
    const [g] = buildListingGroups(rows);
    assert.ok(g, "group built");
    assert.equal(g.recentWindowMonths, 12,
      "should fall back to 12mo when 6mo has <5 tx");
  });

  it("falls back to 24mo when even 12mo is thin", () => {
    const rows: Transaction[] = [];
    const today = new Date();
    // 5 tx scattered at 15-23 months old (nothing in last 12)
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - (15 + i));
      rows.push(
        tx({
          id: 100 + i,
          date: d.toISOString().slice(0, 10),
          project: "Thin Tower",
          ratePerSqft: 1500 + i,
          price: 1_100_000 + i * 2000,
        })
      );
    }
    const [g] = buildListingGroups(rows);
    assert.ok(g);
    assert.equal(g.recentWindowMonths, 24);
  });
});

describe("distribution shape: realistic PF/Bayut aspirational markup", () => {
  const [group] = buildListingGroups(risingMarket());

  it("at least 40% of listings are priced above recent median (sellers' market)", () => {
    const above = group.listings.filter(
      (l) => l.askingRate > group.recentMedianRate
    ).length;
    const ratio = above / group.listings.length;
    assert.ok(
      ratio >= 0.4,
      `sellers'-market premium population should be ≥40% (got ${(ratio * 100).toFixed(0)}%)`
    );
  });

  it("at least one aspirational listing priced +15% or more above recent median", () => {
    const aspirational = group.listings.filter(
      (l) => l.askingRate >= group.recentMedianRate * 1.15
    ).length;
    assert.ok(aspirational >= 1, "there should be at least one aspirational listing");
  });
});
