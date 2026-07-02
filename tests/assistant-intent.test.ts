/**
 * Tests for the assistant's intent + numeric-constraint parser.
 * Pure regex logic — no fixtures needed beyond query strings.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { detectIntent, parseConstraints } from "../src/lib/assistant/intent.ts";

describe("detectIntent", () => {
  it("detects recommend intent", () => {
    assert.equal(detectIntent("what should I buy in Al Reem Island"), "recommend");
    assert.equal(detectIntent("recommend a good investment"), "recommend");
    assert.equal(detectIntent("best deal in Yas Island"), "recommend");
  });

  it("detects trend intent", () => {
    assert.equal(detectIntent("what's trending right now"), "trend");
    assert.equal(detectIntent("show me surging projects"), "trend");
    assert.equal(detectIntent("which projects have momentum"), "trend");
  });

  it("detects cheapest intent", () => {
    assert.equal(detectIntent("cheapest studio in Yas Island"), "cheapest");
    assert.equal(detectIntent("most affordable 2BR"), "cheapest");
  });

  it("detects expensive intent", () => {
    assert.equal(detectIntent("most expensive villa in Saadiyat"), "expensive");
    assert.equal(detectIntent("highest price penthouse"), "expensive");
  });

  it("detects average intent", () => {
    assert.equal(detectIntent("average price of 2BR in Al Reem Island"), "average");
    assert.equal(detectIntent("median price for studios"), "average");
  });

  it("detects count intent", () => {
    assert.equal(detectIntent("how many transactions in Yas Island"), "count");
    assert.equal(detectIntent("number of sales in Al Reem Island"), "count");
  });

  it("defaults to find when no intent keyword matches", () => {
    assert.equal(detectIntent("2 bedroom apartments in Al Reem Island"), "find");
    assert.equal(detectIntent("show me villas in Yas Island"), "find");
  });

  it("recommend takes priority over other keywords when both present", () => {
    // "best" (recommend) should win over "trend"-ish wording here
    assert.equal(detectIntent("what's the best investment trending in Yas Island"), "recommend");
  });
});

describe("parseConstraints — price", () => {
  it("parses 'under Xm'", () => {
    const c = parseConstraints("apartments under 1.5m in Al Reem Island");
    assert.equal(c.priceMax, 1_500_000);
    assert.equal(c.priceMin, undefined);
  });

  it("parses 'below Xk'", () => {
    const c = parseConstraints("studios below 900k");
    assert.equal(c.priceMax, 900_000);
  });

  it("parses 'over Xm'", () => {
    const c = parseConstraints("villas over 3 million");
    assert.equal(c.priceMin, 3_000_000);
  });

  it("parses 'above X' with comma-formatted bare number", () => {
    const c = parseConstraints("apartments above 800,000");
    assert.equal(c.priceMin, 800_000);
  });

  it("parses 'between X and Y'", () => {
    const c = parseConstraints("2BR between 1m and 2m in Al Reem Island");
    assert.equal(c.priceMin, 1_000_000);
    assert.equal(c.priceMax, 2_000_000);
  });

  it("handles reversed between order (max first)", () => {
    const c = parseConstraints("between 2m and 1m");
    assert.equal(c.priceMin, 1_000_000);
    assert.equal(c.priceMax, 2_000_000);
  });

  it("returns undefined bounds when no price language present", () => {
    const c = parseConstraints("2 bedroom apartments in Al Reem Island");
    assert.equal(c.priceMin, undefined);
    assert.equal(c.priceMax, undefined);
  });
});

describe("parseConstraints — yield", () => {
  it("parses 'yield above X%'", () => {
    const c = parseConstraints("2BR with yield above 7% in Al Reem Island");
    assert.equal(c.yieldMin, 7);
  });

  it("parses 'yield over X%'", () => {
    const c = parseConstraints("studios with yield over 6.5%");
    assert.equal(c.yieldMin, 6.5);
  });

  it("parses 'X%+ yield'", () => {
    const c = parseConstraints("7%+ yield studios in Yas Island");
    assert.equal(c.yieldMin, 7);
  });

  it("parses 'yield below X%'", () => {
    const c = parseConstraints("yield below 5%");
    assert.equal(c.yieldMax, 5);
  });

  it("returns undefined when no yield language present", () => {
    const c = parseConstraints("cheapest studio in Yas Island");
    assert.equal(c.yieldMin, undefined);
    assert.equal(c.yieldMax, undefined);
  });
});

describe("parseConstraints — size", () => {
  it("parses 'over X sqft'", () => {
    const c = parseConstraints("apartments over 1000 sqft");
    assert.equal(c.sizeMin, 1000);
  });

  it("parses 'under X sq ft' (spaced)", () => {
    const c = parseConstraints("studios under 500 sq ft");
    assert.equal(c.sizeMax, 500);
  });
});

describe("parseConstraints — combined", () => {
  it("parses price + yield + district + bedrooms together", () => {
    const c = parseConstraints("2BR under 2m with yield above 7% in Al Reem Island");
    assert.equal(c.priceMax, 2_000_000);
    assert.equal(c.yieldMin, 7);
  });
});
