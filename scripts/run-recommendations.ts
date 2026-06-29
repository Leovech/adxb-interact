#!/usr/bin/env node
/**
 * Runs the recommendation engine against the current shipped data and
 * prints the top opportunities. Mirrors exactly what /market-analysis
 * computes in the browser. Run: node --import tsx scripts/run-recommendations.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { decodeTransactions } from "../src/data/abu-dhabi.ts";
import { buildListingGroups } from "../src/lib/mls-data.ts";
import { buildCohortSignals } from "../src/lib/analytics/supply-demand.ts";
import { buildProjectMomentum } from "../src/lib/analytics/momentum.ts";
import { buildRecommendations } from "../src/lib/analytics/recommendations.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const compact = JSON.parse(readFileSync(join(ROOT, "public/data/transactions.json"), "utf8"));
const tx = decodeTransactions(compact);

const listingGroups = buildListingGroups(tx);
const signals = buildCohortSignals(tx, listingGroups);
const momentum = buildProjectMomentum(tx);

const momentumByKey = new Map();
for (const m of momentum) momentumByKey.set(`${m.project}|${m.bedrooms}`, m);
const distressByKey = new Map();
for (const g of listingGroups) distressByKey.set(g.key, g.distressCount);

const recs = buildRecommendations(signals, momentumByKey, {
  distressCountByKey: distressByKey,
  limit: 50,
});

const buy = recs.filter((r) => r.verdict === "buy");
const watch = recs.filter((r) => r.verdict === "watch");
const avoid = recs.filter((r) => r.verdict === "avoid");

console.log(`\nAnalyzed ${signals.length} project-bedroom cohorts from ${tx.length.toLocaleString()} transactions`);
console.log(`Verdicts → Buy: ${buy.length}  Watch: ${watch.length}  Avoid: ${avoid.length}\n`);
console.log("TOP 10 BUY RECOMMENDATIONS (by opportunity score):\n");

for (const r of buy.slice(0, 10)) {
  console.log(`  [${r.opportunityScore}] ${r.bedroomLabel} — ${r.project} (${r.district})`);
  console.log(`        tags: ${r.tags.join(", ") || "none"}`);
  console.log(`        ${r.reasoning[0]?.text ?? ""}`);
  console.log("");
}
