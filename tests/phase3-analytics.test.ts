/**
 * Tests for the Phase 3 data layer:
 *   - area/project comparison stats (compare.ts)
 *   - ROI/deal calculator math (calculator.ts)
 *   - service-charge lookup + net-yield math (service-charge.ts)
 *   - CSV export formatting (csv-export.ts)
 *
 * Uses synthetic deterministic fixtures (dates relative to "today") so
 * behaviour can be pinned without depending on the shipped JSON dataset.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildCompareStats, buildComparison } from "../src/lib/analytics/compare.ts";
import { computeDeal, DEFAULT_CALCULATOR_INPUTS } from "../src/lib/calculator.ts";
import { lookupServiceCharge, computeNetYieldPct } from "../src/lib/service-charge.ts";
import { toCSV } from "../src/lib/csv-export.ts";
import type { Transaction } from "../src/data/abu-dhabi.ts";

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

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// --- compare.ts --------------------------------------------------------------

describe("buildCompareStats", () => {
  it("returns null when there's no usable history for the entity", () => {
    const stats = buildCompareStats([tx({})], "district", "Nowhere");
    assert.equal(stats, null);
  });

  it("computes median rate, QoQ change, and tx volume for a district", () => {
    const rows: Transaction[] = [];
    // prior 90d window (91-180 days ago): rate ~2000
    for (let i = 0; i < 6; i++) {
      rows.push(tx({ id: i, date: daysAgoISO(100 + i), ratePerSqft: 2000, price: 1_400_000 }));
    }
    // recent 90d window (0-89 days ago): rate ~2200 (up ~10%)
    for (let i = 0; i < 6; i++) {
      rows.push(tx({ id: 100 + i, date: daysAgoISO(10 + i), ratePerSqft: 2200, price: 1_540_000 }));
    }
    const stats = buildCompareStats(rows, "district", "Al Reem Island");
    assert.ok(stats);
    assert.equal(stats!.medianRateSqft, 2200);
    assert.ok(stats!.qoqChangePct !== null && stats!.qoqChangePct > 5, "expected a positive QoQ move");
    assert.equal(stats!.txVolume12mo, 12);
    assert.equal(stats!.momentumBadge, "surging");
  });

  it("flags a cooling badge when the recent median rate drops sharply", () => {
    const rows: Transaction[] = [];
    for (let i = 0; i < 6; i++) rows.push(tx({ id: i, date: daysAgoISO(100 + i), ratePerSqft: 2200 }));
    for (let i = 0; i < 6; i++) rows.push(tx({ id: 100 + i, date: daysAgoISO(10 + i), ratePerSqft: 1900 }));
    const stats = buildCompareStats(rows, "district", "Al Reem Island");
    assert.equal(stats!.momentumBadge, "cooling");
  });

  it("buildComparison drops entities with no data instead of throwing", () => {
    const rows = [tx({ date: daysAgoISO(5) })];
    const result = buildComparison(rows, [
      { type: "district", name: "Al Reem Island" },
      { type: "district", name: "Nonexistent Place" },
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "Al Reem Island");
  });
});

// --- calculator.ts -------------------------------------------------------------

describe("computeDeal", () => {
  it("computes acquisition cost including DMT + agency fees + other costs", () => {
    const result = computeDeal({
      ...DEFAULT_CALCULATOR_INPUTS,
      purchasePrice: 1_000_000,
      dmtFeePct: 2,
      agencyFeePct: 2,
      otherCostsAed: 5_000,
    });
    assert.equal(result.dmtFeeAed, 20_000);
    assert.equal(result.agencyFeeAed, 20_000);
    assert.equal(result.totalAcquisitionCostAed, 1_045_000);
  });

  it("computes gross yield from purchase price and annual rent", () => {
    const result = computeDeal({
      ...DEFAULT_CALCULATOR_INPUTS,
      purchasePrice: 1_000_000,
      annualRent: 70_000,
    });
    assert.equal(result.grossYieldPct, 7);
  });

  it("nets the annual service charge out of rent for net yield + monthly income", () => {
    const result = computeDeal({
      purchasePrice: 1_000_000,
      sizeSqft: 1_000,
      annualRent: 70_000,
      serviceChargeAedSqftYr: 15,
      dmtFeePct: 0,
      agencyFeePct: 0,
      otherCostsAed: 0,
    });
    // annual service charge = 1000 * 15 = 15,000
    assert.equal(result.annualServiceChargeAed, 15_000);
    // net annual income = 70,000 - 15,000 = 55,000; net yield = 55,000 / 1,000,000
    assert.equal(result.netYieldPct, 5.5);
    assert.equal(result.monthlyNetIncomeAed, Math.round(55_000 / 12));
  });

  it("computes a positive years-to-payback only when net income is positive", () => {
    const positive = computeDeal({ ...DEFAULT_CALCULATOR_INPUTS, purchasePrice: 1_000_000, annualRent: 100_000 });
    assert.ok(positive.yearsToPayback !== null && positive.yearsToPayback > 0);

    const negative = computeDeal({
      ...DEFAULT_CALCULATOR_INPUTS,
      purchasePrice: 1_000_000,
      sizeSqft: 1_000,
      annualRent: 10_000,
      serviceChargeAedSqftYr: 50, // 50,000/yr charge > rent
    });
    assert.equal(negative.yearsToPayback, null);
  });

  it("rent sensitivity table covers -10% / base / +10% and scales net yield accordingly", () => {
    const result = computeDeal({
      purchasePrice: 1_000_000,
      sizeSqft: 1_000,
      annualRent: 70_000,
      serviceChargeAedSqftYr: 0,
      dmtFeePct: 0,
      agencyFeePct: 0,
      otherCostsAed: 0,
    });
    assert.equal(result.rentSensitivity.length, 3);
    const [down, base, up] = result.rentSensitivity;
    assert.equal(down.deltaPct, -10);
    assert.equal(base.deltaPct, 0);
    assert.equal(up.deltaPct, 10);
    assert.ok(down.netYieldPct < base.netYieldPct);
    assert.ok(up.netYieldPct > base.netYieldPct);
  });
});

// --- service-charge.ts ---------------------------------------------------------

describe("lookupServiceCharge", () => {
  const data = {
    asOf: "2026-07",
    source: "estimate",
    note: "",
    defaultAedSqftYr: 14,
    districts: [{ district: "Al Reem Island", aedSqftYr: 18 }],
  };

  it("returns the curated value for a known district", () => {
    const result = lookupServiceCharge(data, "Al Reem Island");
    assert.equal(result.aedSqftYr, 18);
    assert.equal(result.isDefault, false);
  });

  it("falls back to the site-wide default and flags it for unknown districts", () => {
    const result = lookupServiceCharge(data, "Somewhere Else");
    assert.equal(result.aedSqftYr, 14);
    assert.equal(result.isDefault, true);
  });
});

describe("computeNetYieldPct", () => {
  it("subtracts the annual service charge from gross rent before dividing by price", () => {
    // price = 2,000,000; gross 6% => 120,000 rent; size 1,000 sqft * 20 AED/sqft = 20,000 charge
    // net = (120,000 - 20,000) / 2,000,000 = 5%
    const pct = computeNetYieldPct(6, 2_000_000, 1_000, 20);
    assert.equal(pct, 5);
  });

  it("returns 0 for non-positive price or size", () => {
    assert.equal(computeNetYieldPct(6, 0, 1000, 20), 0);
    assert.equal(computeNetYieldPct(6, 2_000_000, 0, 20), 0);
  });
});

// --- csv-export.ts ---------------------------------------------------------

describe("toCSV", () => {
  it("returns an empty string for no rows", () => {
    assert.equal(toCSV([]), "");
  });

  it("quotes cells containing commas, quotes, or newlines", () => {
    const csv = toCSV([{ name: 'Al Reem, Island "Prime"', notes: "line1\nline2" }]);
    assert.match(csv, /"Al Reem, Island ""Prime"""/);
    assert.match(csv, /"line1\nline2"/);
  });

  it("unions headers across rows of different shapes and fills blanks", () => {
    const csv = toCSV([{ a: 1, b: 2 }, { a: 3, c: 4 }]);
    const lines = csv.split("\n");
    assert.equal(lines[0], "a,b,c");
    assert.equal(lines[1], "1,2,");
    assert.equal(lines[2], "3,,4");
  });
});
