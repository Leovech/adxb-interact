/**
 * Tests for the MLS compare data layer.
 *
 * Run with: npm test
 *
 * Uses Node's built-in test runner + tsx for TS support. No Vitest, no Jest
 * — keeps the dep tree thin.
 *
 * The fixtures below are deterministic synthetic Transaction rows that
 * exercise the realistic shape of the real data without depending on the
 * shipped JSON file.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildListingGroups,
  applyMLSFilters,
  computeOverviewStats,
  getDistressListings,
  defaultMLSFilters,
  DISTRESS_THRESHOLD,
} from "../src/lib/mls-data.ts";
import {
  buildInvestorReport,
  estimateYield,
  buildPriceTrend,
  topDistressDeals,
  buildThesis,
  computeLiquidity,
} from "../src/lib/investor-report.ts";
import type { Transaction } from "../src/data/abu-dhabi.ts";

// --- Fixtures ---------------------------------------------------------------

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 0,
    date: "2025-06-15",
    assetClass: "Residential",
    propertyType: "Apartment",
    sizeSqft: 900,
    sizeSqm: 84,
    bedrooms: 1,
    layout: "",
    district: "Saadiyat Island",
    districtId: "saadiyat-island",
    community: "Saadiyat Beach",
    project: "Mamsha Al Saadiyat",
    projectId: "mamsha-al-saadiyat",
    price: 2_700_000,
    ratePerSqft: 3000,
    status: "Ready",
    sequence: "Secondary",
    ...overrides,
  };
}

function manyTransactions(n: number, base: Partial<Transaction>): Transaction[] {
  // Spread dates across the last 12 months so the trend bucket has data.
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (i % 12));
    d.setDate(15);
    return tx({
      ...base,
      id: i,
      date: d.toISOString().slice(0, 10),
      // small random-ish jitter so medians aren't degenerate
      price: (base.price ?? 2_700_000) + ((i * 7919) % 200_000) - 100_000,
      ratePerSqft: (base.ratePerSqft ?? 3000) + ((i * 1009) % 200) - 100,
    });
  });
}

const fixture = manyTransactions(40, {});

// --- Tests ------------------------------------------------------------------

describe("buildListingGroups", () => {
  it("creates one group per (project, bedrooms) cohort", () => {
    const groups = buildListingGroups(fixture);
    assert.equal(groups.length, 1);
    const g = groups[0];
    assert.equal(g.project, "Mamsha Al Saadiyat");
    assert.equal(g.bedrooms, 1);
    assert.equal(g.adrecTxCount, 40);
    assert.ok(g.askPriceMedian > 0);
    assert.ok(g.adrecMedianPrice > 0);
    assert.ok(g.listingCount >= 6, "should have at least floor of 6 listings");
    assert.ok(g.listingCount <= 90, "should never exceed cap of 90");
  });

  it("listing platform mix sums to total listings", () => {
    const [g] = buildListingGroups(fixture);
    assert.equal(g.platforms.propertyfinder + g.platforms.bayut, g.listingCount);
  });

  it("excludes groups with fewer than 3 ADREC transactions", () => {
    const sparse = manyTransactions(2, { project: "Tiny Project" });
    assert.equal(buildListingGroups(sparse).length, 0);
  });

  it("excludes Unknown / placeholder projects", () => {
    const noisy = [
      ...manyTransactions(3, { project: "Unknown" }),
      ...manyTransactions(3, { project: "—" }),
    ];
    assert.equal(buildListingGroups(noisy).length, 0);
  });
});

describe("applyMLSFilters — platform scope (regression: was a no-op)", () => {
  const groups = buildListingGroups(fixture);

  it("returns same groups when platform filter is empty", () => {
    const out = applyMLSFilters(groups, defaultMLSFilters);
    assert.equal(out.length, groups.length);
    assert.equal(out[0].listingCount, groups[0].listingCount);
  });

  it("scopes listings to Property Finder only and re-aggregates stats", () => {
    const out = applyMLSFilters(groups, {
      ...defaultMLSFilters,
      platform: "propertyfinder",
    });
    assert.equal(out.length, 1);
    const scoped = out[0];
    assert.equal(scoped.platforms.bayut, 0, "bayut count must be zero");
    assert.equal(scoped.platforms.propertyfinder, scoped.listingCount);
    // Every listing should be PF
    for (const l of scoped.listings) {
      assert.equal(l.platform, "propertyfinder");
    }
    // Stats must reflect the PF-only subset, not the full cohort
    assert.ok(scoped.askPriceMedian > 0);
    assert.ok(scoped.askRateMedian > 0);
  });

  it("scopes listings to Bayut only", () => {
    const out = applyMLSFilters(groups, {
      ...defaultMLSFilters,
      platform: "bayut",
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].platforms.propertyfinder, 0);
    for (const l of out[0].listings) {
      assert.equal(l.platform, "bayut");
    }
  });

  it("drops a group entirely if no listings remain after platform scope", () => {
    // Force a synthetic group with only PF listings, then ask for Bayut only.
    const onlyPF = {
      ...groups[0],
      listings: groups[0].listings.filter((l) => l.platform === "propertyfinder"),
    };
    onlyPF.platforms = { propertyfinder: onlyPF.listings.length, bayut: 0 };
    onlyPF.listingCount = onlyPF.listings.length;
    const out = applyMLSFilters([onlyPF], { ...defaultMLSFilters, platform: "bayut" });
    assert.equal(out.length, 0);
  });

  it("combines platform scope with distressOnly correctly", () => {
    const out = applyMLSFilters(groups, {
      ...defaultMLSFilters,
      platform: "propertyfinder",
      distressOnly: true,
    });
    // Either the PF subset has distress (then we get one group) or it doesn't
    // (zero groups). Both are valid; the regression bug returned the
    // unfiltered set in both cases.
    if (out.length > 0) {
      assert.ok(out[0].distressCount > 0, "kept group must have distress");
      for (const l of out[0].listings) {
        assert.equal(l.platform, "propertyfinder");
      }
    }
  });
});

describe("applyMLSFilters — text + structured filters", () => {
  const groups = buildListingGroups(fixture);

  it("filters by district", () => {
    assert.equal(
      applyMLSFilters(groups, { ...defaultMLSFilters, district: "Yas Island" }).length,
      0
    );
    assert.equal(
      applyMLSFilters(groups, { ...defaultMLSFilters, district: "Saadiyat Island" }).length,
      1
    );
  });

  it("filters by bedrooms", () => {
    assert.equal(
      applyMLSFilters(groups, { ...defaultMLSFilters, bedrooms: "1" }).length,
      1
    );
    assert.equal(
      applyMLSFilters(groups, { ...defaultMLSFilters, bedrooms: "5" }).length,
      0
    );
  });

  it("supports the 6+ bedrooms bucket", () => {
    const big = buildListingGroups(manyTransactions(20, { bedrooms: 7, project: "Big Villas" }));
    assert.equal(
      applyMLSFilters(big, { ...defaultMLSFilters, bedrooms: "6+" }).length,
      1
    );
  });

  it("free-text search matches project or district", () => {
    assert.equal(
      applyMLSFilters(groups, { ...defaultMLSFilters, searchQuery: "saadiyat" }).length,
      1
    );
    assert.equal(
      applyMLSFilters(groups, { ...defaultMLSFilters, searchQuery: "marina" }).length,
      0
    );
  });
});

describe("computeOverviewStats", () => {
  it("aggregates totals across multiple groups", () => {
    const groups = buildListingGroups([
      ...fixture,
      ...manyTransactions(15, { project: "Reem Heights", district: "Al Reem Island", bedrooms: 2 }),
    ]);
    const stats = computeOverviewStats(groups);
    assert.equal(stats.projectsCovered, 2);
    assert.equal(
      stats.totalListings,
      groups.reduce((s, g) => s + g.listingCount, 0)
    );
    assert.equal(
      stats.platformBreakdown.propertyfinder + stats.platformBreakdown.bayut,
      stats.totalListings
    );
  });

  it("returns zeros for an empty group set", () => {
    const stats = computeOverviewStats([]);
    assert.equal(stats.totalListings, 0);
    assert.equal(stats.totalDistress, 0);
    assert.equal(stats.avgPremiumPct, 0);
  });
});

describe("getDistressListings + DISTRESS_THRESHOLD", () => {
  it("uses the central threshold so flag/list/stat agree", () => {
    const groups = buildListingGroups(fixture);
    const distress = getDistressListings(groups);
    const summed = groups.reduce((s, g) => s + g.distressCount, 0);
    assert.equal(distress.length, summed, "distress array must match summed group counts");
  });

  it("threshold is 5%", () => {
    assert.equal(DISTRESS_THRESHOLD, 0.05);
  });

  it("every distress listing is at least 5% below market", () => {
    const distress = getDistressListings(buildListingGroups(fixture));
    for (const d of distress) {
      assert.ok(d.discountPct <= -DISTRESS_THRESHOLD * 100 + 1e-6);
    }
  });
});

describe("buildInvestorReport", () => {
  const [group] = buildListingGroups(fixture);

  it("returns a populated report for a known project + bedrooms", () => {
    const report = buildInvestorReport(group, fixture);
    assert.equal(report.project, group.project);
    assert.equal(report.bedrooms, group.bedrooms);
    assert.equal(report.totalListings, group.listingCount);
    assert.equal(report.distressCount, group.distressCount);
    assert.ok(report.txLast24mo > 0);
    assert.ok(report.yieldEstimate.grossPct > 0);
    assert.ok(["buy", "watch", "avoid"].includes(report.thesis.verdict));
  });

  it("trend is sorted oldest → newest and has at least one bucket", () => {
    const report = buildInvestorReport(group, fixture);
    assert.ok(report.trend.length >= 1);
    for (let i = 1; i < report.trend.length; i++) {
      assert.ok(report.trend[i - 1].month <= report.trend[i].month);
    }
  });

  it("estimateYield: high confidence for ≥30 ADREC tx", () => {
    assert.equal(estimateYield(group).confidence, "high");
  });

  it("estimateYield: low confidence for sparse data", () => {
    const [sparse] = buildListingGroups(manyTransactions(4, { project: "Sparse Tower" }));
    if (sparse) assert.equal(estimateYield(sparse).confidence, "low");
  });

  it("topDistressDeals never returns more than the requested limit", () => {
    const deals = topDistressDeals(group, 3);
    assert.ok(deals.length <= 3);
    // all rows are below threshold
    for (const d of deals) assert.ok(d.discountPct < -DISTRESS_THRESHOLD * 100 + 1e-6);
    // sorted by discount ascending (most negative first)
    for (let i = 1; i < deals.length; i++) {
      assert.ok(deals[i - 1].discountPct <= deals[i].discountPct);
    }
  });

  it("buildThesis verdict reacts to liquidity collapse", () => {
    const yieldLow = { grossPct: 4, monthlyRentAED: 0, confidence: "low" as const, basis: "" };
    const t = buildThesis(
      { ...group, premiumPct: 12, distressCount: 0 },
      { txPerMonth: 0.2 },
      yieldLow
    );
    assert.equal(t.verdict, "avoid");
  });

  it("buildPriceTrend respects the project + bedrooms filter", () => {
    const mixed = [
      ...fixture,
      ...manyTransactions(20, { project: "Other Tower", bedrooms: 3 }),
    ];
    const trend = buildPriceTrend(mixed, group);
    const totalTx = trend.reduce((s, p) => s + p.txCount, 0);
    // Should only count transactions from `group.project` w/ matching bedrooms
    assert.ok(totalTx > 0);
    assert.ok(totalTx <= fixture.length);
  });

  it("computeLiquidity ignores wrong project/bedrooms", () => {
    const noise = [
      ...fixture,
      ...manyTransactions(10, { project: "Noise Tower", bedrooms: 2 }),
    ];
    const l = computeLiquidity(noise, group);
    assert.equal(l.txLast24mo, fixture.length); // noise excluded
  });
});
