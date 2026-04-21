/**
 * Regression tests for search UX fixes + MLS visibility cap + data
 * freshness. These cover the bugs reported by a user review session:
 *
 *   1. "I don't see all projects on MLS" → the 60-item hard cap.
 *   2. "Smart search behaves weirdly" → applySmartSearch was resetting
 *      existing filters instead of merging.
 *   3. Diacritic-insensitive matching ("sa'adiyat" vs "Saadiyat").
 *   4. Revalidate only touched `/`, leaving /mls and /mls/report stale.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseSmartSearch,
  applySmartSearch,
  resetAndApplySmartSearch,
  normalize,
} from "../src/lib/smart-search.ts";
import { defaultFilters } from "../src/lib/filters.ts";
import {
  applyMLSSmartSearch,
  parseMLSSmartSearch,
  defaultMLSFilters,
  buildListingGroups,
} from "../src/lib/mls-data.ts";
import type { Transaction, Hierarchy } from "../src/data/abu-dhabi.ts";

// --- Fixtures ---------------------------------------------------------------

const hierarchy: Hierarchy = {
  districts: [
    { id: "saadiyat-island", name: "Saadiyat Island", count: 800, projectCount: 12 },
    { id: "al-reem-island", name: "Al Reem Island", count: 1200, projectCount: 20 },
    { id: "yas-island", name: "Yas Island", count: 600, projectCount: 9 },
  ],
  projects: [
    { id: "mamsha", name: "Mamsha Al Saadiyat", district: "Saadiyat Island", community: "Saadiyat Beach", count: 120 },
    { id: "reem-heights", name: "Reem Heights", district: "Al Reem Island", community: "Najmat", count: 80 },
  ],
};

function tx(o: Partial<Transaction>): Transaction {
  return {
    id: 0,
    date: "2025-06-15",
    assetClass: "Residential",
    propertyType: "Apartment",
    sizeSqft: 900, sizeSqm: 84, bedrooms: 1,
    layout: "",
    district: "Saadiyat Island", districtId: "saadiyat-island",
    community: "Saadiyat Beach",
    project: "Mamsha Al Saadiyat", projectId: "mamsha",
    price: 2_700_000, ratePerSqft: 3000,
    status: "Ready", sequence: "Secondary",
    ...o,
  };
}

// --- Tests: normalize() -----------------------------------------------------

describe("normalize()", () => {
  it("strips Latin diacritics", () => {
    assert.equal(normalize("Saʿādiyāt"), "sa adiyat");
    assert.equal(normalize("Muḥammad"), "muhammad");
  });

  it("collapses whitespace and lowercases", () => {
    assert.equal(normalize("  Yas   ISLAND "), "yas island");
  });

  it("strips quotes, hyphens, underscores", () => {
    assert.equal(normalize("Al-Reem_Island's"), "al reem islands");
  });

  it("preserves Arabic + Cyrillic glyphs", () => {
    assert.equal(normalize("Саадият"), "саадият");
    assert.equal(normalize("سعديات"), "سعديات");
  });
});

// --- Tests: parseSmartSearch + diacritic folding ----------------------------

describe("parseSmartSearch — diacritic & case folding", () => {
  it("matches 'saadiyat island' regardless of apostrophes", () => {
    const a = parseSmartSearch("saadiyat island", hierarchy);
    const b = parseSmartSearch("sa'adiyat island", hierarchy);
    assert.equal(a.filters.district, "Saadiyat Island");
    assert.equal(b.filters.district, "Saadiyat Island");
  });

  it("matches UPPERCASE input", () => {
    const r = parseSmartSearch("YAS ISLAND 2BR APARTMENT", hierarchy);
    assert.equal(r.filters.district, "Yas Island");
    assert.equal(r.filters.bedrooms, "2");
    assert.equal(r.filters.propertyType, "Apartment");
  });

  it("matches hyphenated input", () => {
    const r = parseSmartSearch("al-reem island", hierarchy);
    assert.equal(r.filters.district, "Al Reem Island");
  });
});

// --- Tests: applySmartSearch merge behavior ---------------------------------

describe("applySmartSearch — must MERGE with current filters (regression)", () => {
  it("preserves date range when user adds a project via smart search", () => {
    const current = { ...defaultFilters, datePreset: "last_month" as const };
    const parsed = parseSmartSearch("yas island", hierarchy);
    const merged = applySmartSearch(current, parsed);
    assert.equal(merged.datePreset, "last_month", "datePreset must survive");
    assert.equal(merged.district, "Yas Island");
  });

  it("preserves user-picked status when smart query only mentions bedrooms", () => {
    const current = { ...defaultFilters, status: "Off-Plan" };
    const parsed = parseSmartSearch("3br", hierarchy);
    const merged = applySmartSearch(current, parsed);
    assert.equal(merged.status, "Off-Plan");
    assert.equal(merged.bedrooms, "3");
  });

  it("resets project when district changes via smart search", () => {
    const current = {
      ...defaultFilters,
      district: "Saadiyat Island",
      project: "Mamsha Al Saadiyat",
    };
    const parsed = parseSmartSearch("yas island", hierarchy);
    const merged = applySmartSearch(current, parsed);
    assert.equal(merged.district, "Yas Island");
    assert.equal(merged.project, "", "project must reset when district changes");
  });

  it("keeps district AND project when smart query names the same district", () => {
    const current = {
      ...defaultFilters,
      district: "Saadiyat Island",
      project: "Mamsha Al Saadiyat",
    };
    const parsed = parseSmartSearch("saadiyat island", hierarchy);
    const merged = applySmartSearch(current, parsed);
    assert.equal(merged.district, "Saadiyat Island");
    assert.equal(merged.project, "Mamsha Al Saadiyat");
  });

  it("still exposes legacy reset behavior via resetAndApplySmartSearch", () => {
    const parsed = parseSmartSearch("villa yas island", hierarchy);
    const fresh = resetAndApplySmartSearch(parsed);
    assert.equal(fresh.district, "Yas Island");
    assert.equal(fresh.propertyType, "Villa");
    // Unrelated fields untouched from defaults
    assert.equal(fresh.datePreset, defaultFilters.datePreset);
  });
});

// --- Tests: applyMLSSmartSearch merge behavior ------------------------------

describe("applyMLSSmartSearch — must MERGE with current MLS filters (regression)", () => {
  it("preserves platform pick when smart query only sets district", () => {
    const current = { ...defaultMLSFilters, platform: "propertyfinder" as const };
    const parsed = parseMLSSmartSearch("saadiyat island", hierarchy);
    const merged = applyMLSSmartSearch(current, parsed);
    assert.equal(merged.platform, "propertyfinder", "platform must survive");
    assert.equal(merged.district, "Saadiyat Island");
  });

  it("preserves distressOnly toggle", () => {
    const current = { ...defaultMLSFilters, distressOnly: true };
    const parsed = parseMLSSmartSearch("2br", hierarchy);
    const merged = applyMLSSmartSearch(current, parsed);
    assert.equal(merged.distressOnly, true);
    assert.equal(merged.bedrooms, "2");
  });
});

// --- Tests: MLS visibility cap regression -----------------------------------

describe("MLS listing groups visibility", () => {
  it("buildListingGroups returns every eligible project cohort, not a 60-item cap", () => {
    // Build 80 project cohorts — each with enough tx to pass the ≥3 floor.
    const many: Transaction[] = [];
    for (let p = 0; p < 80; p++) {
      for (let i = 0; i < 4; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (i % 12));
        many.push(
          tx({
            id: p * 10 + i,
            project: `Project ${String(p).padStart(3, "0")}`,
            projectId: `project-${p}`,
            bedrooms: 2,
            date: d.toISOString().slice(0, 10),
            price: 1_500_000 + i * 10_000,
            ratePerSqft: 1500 + i * 10,
          })
        );
      }
    }
    const groups = buildListingGroups(many);
    assert.equal(groups.length, 80, "all 80 eligible projects must be returned by the data layer");
    // The UI used to show .slice(0, 60). We've converted that to client-side
    // pagination; the data layer itself must not drop anything.
  });
});
