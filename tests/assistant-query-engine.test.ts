/**
 * Integration tests for the assistant query engine — verifies that
 * buildAssistantContext + answerQuery correctly compose smart-search,
 * intent detection, and the momentum/supply-demand/recommendation/yield
 * analytics modules into a coherent answer.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildAssistantContext,
  answerQuery,
} from "../src/lib/assistant/query-engine.ts";
import type { Transaction, Hierarchy } from "../src/data/abu-dhabi.ts";

// --- Fixtures ----------------------------------------------------------------

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

/**
 * Builds a small but realistic multi-district, multi-project dataset:
 *   - Pixel (Al Reem Island) studio + 1BR: undervalued, active, high yield
 *   - Reem Heights (Al Reem Island) 2BR: area-average baseline, cheap-ish
 *   - Yas Bay (Yas Island) studio: expensive, thin liquidity
 *   - Saadiyat Grove (Al Saadiyat Island) villa: pricey baseline for the area
 */
function fixture(): Transaction[] {
  const rows: Transaction[] = [];
  const today = new Date();
  let id = 0;

  const pushMonthly = (opts: Partial<Transaction>, months: number, perMonth: number, priceJitter = 0) => {
    for (let m = 0; m < months; m++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - m);
      for (let i = 0; i < perMonth; i++) {
        rows.push(
          tx({
            ...opts,
            id: id++,
            date: d.toISOString().slice(0, 10),
            price: (opts.price ?? 1_500_000) + i * priceJitter,
          })
        );
      }
    }
  };

  // Pixel studio — Al Reem Island, cheap + very active (undervalued + surging)
  pushMonthly(
    { project: "Pixel", district: "Al Reem Island", bedrooms: 0, sizeSqft: 400, price: 650_000, ratePerSqft: 1600 },
    12, 4, 5000
  );
  // Pixel 1BR — Al Reem Island
  pushMonthly(
    { project: "Pixel", district: "Al Reem Island", bedrooms: 1, sizeSqft: 700, price: 1_200_000, ratePerSqft: 1700 },
    12, 3, 5000
  );
  // Reem Heights 2BR — Al Reem Island, area-average baseline (higher price, more sqft)
  pushMonthly(
    { project: "Reem Heights", district: "Al Reem Island", bedrooms: 2, sizeSqft: 1100, price: 2_000_000, ratePerSqft: 1800 },
    12, 3, 5000
  );
  // Yas Bay studio — Yas Island, expensive + thin liquidity
  pushMonthly(
    { project: "Yas Bay", district: "Yas Island", bedrooms: 0, sizeSqft: 420, price: 950_000, ratePerSqft: 2200 },
    12, 1, 2000
  );
  // Saadiyat Grove villa — Al Saadiyat Island, pricey
  pushMonthly(
    { project: "Saadiyat Grove", district: "Al Saadiyat Island", propertyType: "Villa", bedrooms: 4, sizeSqft: 4000, price: 6_000_000, ratePerSqft: 1500 },
    12, 2, 20000
  );

  return rows;
}

function hierarchyFor(transactions: Transaction[]): Hierarchy {
  const districts = new Map<string, { id: string; count: number; projects: Set<string> }>();
  const projects = new Map<string, { id: string; district: string; community: string; count: number }>();
  for (const t of transactions) {
    const d = districts.get(t.district) || { id: t.districtId, count: 0, projects: new Set() };
    d.count++;
    d.projects.add(t.project);
    districts.set(t.district, d);
    const p = projects.get(t.project) || { id: t.projectId, district: t.district, community: t.community, count: 0 };
    p.count++;
    projects.set(t.project, p);
  }
  return {
    districts: [...districts.entries()].map(([name, d]) => ({ id: d.id, name, count: d.count, projectCount: d.projects.size })),
    projects: [...projects.entries()].map(([name, p]) => ({ id: p.id, name, district: p.district, community: p.community, count: p.count })),
  };
}

const data = fixture();
const hierarchy = hierarchyFor(data);
const ctx = buildAssistantContext(data, hierarchy);

// --- Tests ---------------------------------------------------------------------

describe("buildAssistantContext", () => {
  it("computes listing groups, momentum, and recommendations over the full dataset", () => {
    assert.ok(ctx.listingGroups.length >= 4, "should have a group per project+bedroom cohort");
    assert.ok(ctx.momentum.length >= 4);
    assert.ok(ctx.cohortSignals.length >= 4);
    assert.ok(ctx.recommendations.length >= 4);
  });
});

describe("answerQuery — empty / unfilterable input", () => {
  it("returns a guidance answer for a blank query", () => {
    const a = answerQuery("", ctx);
    assert.equal(a.matchCount, 0);
    assert.ok(a.suggestions.length > 0);
  });

  it("returns guidance for a query with no filters, constraints, or intent keyword", () => {
    const a = answerQuery("hello there", ctx);
    assert.equal(a.matchCount, 0);
    assert.ok(a.suggestions.length > 0);
  });
});

describe("answerQuery — find intent (default)", () => {
  it("filters by district", () => {
    const a = answerQuery("show me apartments in Al Reem Island", ctx);
    assert.equal(a.intent, "find");
    assert.ok(a.matchCount > 0);
    // Every returned cohort row should be in Al Reem Island
    for (const r of a.rows) assert.equal(r.district, "Al Reem Island");
  });

  it("filters by district + bedrooms together", () => {
    const a = answerQuery("2 bedroom apartments in Al Reem Island", ctx);
    assert.ok(a.matchCount > 0);
    for (const r of a.rows) assert.equal(r.bedroomLabel, "2 BR");
  });

  it("returns no-match answer for a bedroom count with zero data", () => {
    // Nothing in the fixture has 6 bedrooms.
    const a = answerQuery("6 bedroom apartments in Al Reem Island", ctx);
    assert.equal(a.matchCount, 0);
    assert.equal(a.rows.length, 0);
  });
});

describe("answerQuery — count intent", () => {
  it("counts transactions matching a district", () => {
    const a = answerQuery("how many transactions in Al Reem Island", ctx);
    assert.equal(a.intent, "count");
    assert.ok(a.matchCount > 0);
    assert.ok(a.narrative.includes(String(a.matchCount)));
  });
});

describe("answerQuery — average intent", () => {
  it("computes median price/rate for a scoped query", () => {
    const a = answerQuery("average price of studios in Al Reem Island", ctx);
    assert.equal(a.intent, "average");
    assert.ok(a.stats.some((s) => s.label === "Median price"));
    assert.ok(a.matchCount > 0);
  });
});

describe("answerQuery — cheapest / expensive", () => {
  it("cheapest picks the lowest median-rate cohort within scope", () => {
    const a = answerQuery("cheapest studio in Al Reem Island", ctx);
    assert.equal(a.intent, "cheapest");
    assert.ok(a.rows.length > 0);
    assert.equal(a.rows[0].project, "Pixel");
    // Sorted ascending by rate
    for (let i = 1; i < a.rows.length; i++) {
      assert.ok(a.rows[i - 1].medianRate <= a.rows[i].medianRate);
    }
  });

  it("expensive picks the highest median-rate cohort within scope", () => {
    const a = answerQuery("most expensive studio", ctx);
    assert.equal(a.intent, "expensive");
    assert.ok(a.rows.length > 0);
    // Yas Bay studio has the highest rate (2200) vs Pixel studio (1600)
    assert.equal(a.rows[0].project, "Yas Bay");
  });

  it("provides a reportLink for the winning cohort", () => {
    const a = answerQuery("cheapest studio in Al Reem Island", ctx);
    assert.ok(a.reportLink);
    assert.equal(a.reportLink?.project, "Pixel");
    assert.equal(a.reportLink?.bedrooms, 0);
  });
});

describe("answerQuery — yield constraint", () => {
  it("filters cohorts by minimum modelled yield", () => {
    const a = answerQuery("studios with yield above 3% in Al Reem Island", ctx);
    assert.ok(a.matchCount >= 0);
    for (const r of a.rows) {
      assert.ok((r.yieldPct ?? 0) >= 3);
    }
  });

  it("returns no-match when yield threshold is unreasonably high", () => {
    const a = answerQuery("studios with yield above 99% in Al Reem Island", ctx);
    assert.equal(a.matchCount, 0);
  });

  it("sorts matches by yield descending", () => {
    const a = answerQuery("apartments with yield above 0% in Al Reem Island", ctx);
    for (let i = 1; i < a.rows.length; i++) {
      assert.ok((a.rows[i - 1].yieldPct ?? 0) >= (a.rows[i].yieldPct ?? 0));
    }
  });
});

describe("answerQuery — trend intent", () => {
  it("returns momentum-ranked rows scoped to a district", () => {
    const a = answerQuery("what's trending in Al Reem Island", ctx);
    assert.equal(a.intent, "trend");
    assert.ok(a.matchCount > 0);
    for (const r of a.rows) assert.equal(r.district, "Al Reem Island");
  });

  it("Pixel studio (most active cohort) surfaces near the top for trend queries", () => {
    const a = answerQuery("surging projects in Al Reem Island", ctx);
    assert.ok(a.rows.some((r) => r.project === "Pixel"));
  });
});

describe("answerQuery — recommend intent", () => {
  it("returns a scored recommendation with a headline and reasoning", () => {
    const a = answerQuery("what should I buy in Al Reem Island", ctx);
    assert.equal(a.intent, "recommend");
    assert.ok(a.matchCount > 0);
    assert.ok(a.rows.length > 0);
    assert.ok(a.reportLink);
    assert.ok(a.narrative.length > 0);
  });

  it("scopes recommendations to the requested district only", () => {
    const a = answerQuery("best investment in Yas Island", ctx);
    for (const r of a.rows) assert.equal(r.district, "Yas Island");
  });
});

describe("answerQuery — filter chips reflect parsed query", () => {
  it("includes district and bedroom chips", () => {
    const a = answerQuery("2 bedroom apartments in Al Reem Island", ctx);
    assert.ok(a.filterChips.some((c) => c.includes("Al Reem Island")));
    assert.ok(a.filterChips.some((c) => c.includes("2 BR")));
  });

  it("includes a price chip when a price constraint is present", () => {
    const a = answerQuery("apartments under 2m in Al Reem Island", ctx);
    assert.ok(a.filterChips.some((c) => c.toLowerCase().includes("under")));
  });
});
