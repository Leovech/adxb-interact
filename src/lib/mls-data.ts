/**
 * MLS (Multiple Listing Service) comparison data layer.
 *
 * Property Finder and Bayut don't expose public APIs, so this module
 * generates realistic SAMPLE listings derived from ADREC transaction
 * medians. The deep-link URLs go to real search pages on those
 * platforms so users can verify prices manually.
 *
 * When a real MLS API subscription is secured, replace
 * `generateSampleListings()` with a real API fetch — the rest of the
 * pipeline (stats, distress detection, UI) stays the same.
 */

import { Transaction, Hierarchy } from "@/data/abu-dhabi";
import { parseSmartSearch } from "./smart-search";

export type MLSPlatform = "propertyfinder" | "bayut";

export interface MLSListing {
  id: string;
  platform: MLSPlatform;
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;
  sizeSqft: number;
  askingPrice: number;
  askingRate: number;
  listingDate: string;
  url: string;
  agentName: string;
}

export interface ListingGroup {
  key: string; // project|bedrooms
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;

  // MLS (sample)
  listingCount: number;
  platforms: { propertyfinder: number; bayut: number };
  askPriceMedian: number;
  askPriceMin: number;
  askPriceMax: number;
  askRateMedian: number;
  listings: MLSListing[];

  // ADREC (real) — 24-month window: used for liquidity + context
  adrecTxCount: number;
  adrecMedianPrice: number;
  adrecMedianRate: number;
  adrecLastDate: string;
  typicalSize: number;

  // Recent market (6-12mo window depending on tx density): the honest
  // anchor for "what sellers are asking right now". In rising markets
  // the 24mo median lags current prices by 10-30%, so we compute a
  // second median over a tighter window and use it for listing
  // generation and the premium/distress comparison.
  recentWindowMonths: number; // 6, 12, or 24 depending on data density
  recentTxCount: number;
  recentMedianPrice: number;
  recentMedianRate: number;

  // Comparison (both anchored to recentMedianRate now — that's what
  // matches what the user sees on PF/Bayut)
  premiumPct: number; // listings median vs recent median
  distressCount: number; // listings ≥5% below recent rate
}

// Distress threshold: a listing is "distress" when its asking rate is at
// least this fraction below the ADREC median. Centralised so filter, stats,
// builder, and report stay in lockstep.
export const DISTRESS_THRESHOLD = 0.05; // 5%

// --- Deterministic PRNG so sample data is stable per project ---

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function prng(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return ((s >>> 0) / 0xffffffff);
  };
}

// --- Helpers ---

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

const AGENT_FIRST = [
  "Ahmed", "Mohammed", "Ali", "Khalid", "Omar", "Hassan", "Sara", "Fatima",
  "Priya", "Raj", "Vikram", "Anjali", "James", "Sophie", "Daniel", "Emma",
  "Rashid", "Saeed", "Layla", "Noor",
];
const AGENT_LAST = [
  "Al Mansoori", "Al Suwaidi", "Kapoor", "Sharma", "Smith", "Johnson",
  "Khan", "Hussain", "Patel", "Mehta", "Al Ameri", "Al Zaabi",
];

const AGENCIES_PF = [
  "PSI Real Estate", "Aldar Properties", "Metropolitan Capital",
  "Bloom Properties", "Hamptons International",
];
const AGENCIES_BAYUT = [
  "Better Homes", "AX Capital", "Driven Properties",
  "Crompton Partners", "LuxuryProperty.com",
];

function generateAgentName(seed: () => number, platform: MLSPlatform): string {
  const first = AGENT_FIRST[Math.floor(seed() * AGENT_FIRST.length)];
  const last = AGENT_LAST[Math.floor(seed() * AGENT_LAST.length)];
  const agencies = platform === "propertyfinder" ? AGENCIES_PF : AGENCIES_BAYUT;
  const agency = agencies[Math.floor(seed() * agencies.length)];
  return `${first} ${last} · ${agency}`;
}

export function buildListingUrl(
  platform: MLSPlatform,
  project: string,
  district: string,
  bedrooms: number,
  propertyType: string = "Apartment"
): string {
  // Deep-link to each platform's search results so the user can verify live
  // listings against our sample. URLs use the documented query params these
  // platforms expose on their search pages.
  //
  // Property Finder requires l=6 (Abu Dhabi emirate location ID) to scope
  // results — without it, free-text searches bleed into Dubai listings.
  // t=1 = residential apartments, t=35 = villas/houses.
  const isVilla =
    propertyType === "Villa" ||
    propertyType === "Townhouse" ||
    propertyType === "Duplex";

  if (platform === "propertyfinder") {
    const typeParam = isVilla ? "&t=35" : "&t=1";
    const q = encodeURIComponent(project);
    const bedParam = bedrooms > 0 ? `&bf=${bedrooms}&bt=${bedrooms}` : "";
    return `https://www.propertyfinder.ae/en/search?l=6&c=1${typeParam}${bedParam}&q=${q}`;
  }
  // Bayut: the /to-buy/property/abu-dhabi/ path already scopes to Abu Dhabi.
  // search_query narrows by project+district, beds_min/max filter bedrooms.
  const q = encodeURIComponent(`${project} ${district}`);
  const bedParam =
    bedrooms > 0 ? `&beds_min=${bedrooms}&beds_max=${bedrooms}` : "";
  return `https://www.bayut.com/to-buy/property/abu-dhabi/?search_query=${q}${bedParam}`;
}

// --- Core: derive project|bedroom groups from ADREC transactions ---

interface AdrecTx {
  date: string;
  price: number;
  rate: number;
  size: number;
}

interface AdrecGroup {
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;
  txs: AdrecTx[]; // all tx in the 24mo window (sorted newest-first)
  lastDate: string;
  count: number;
}

function buildAdrecGroups(transactions: Transaction[]): AdrecGroup[] {
  const groups = new Map<string, AdrecGroup>();
  // Use the most recent 24 months of data so medians reflect current market
  const cutoff = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 24);
    return d.toISOString().slice(0, 10);
  })();

  for (const t of transactions) {
    if (!t.project || t.project === "Unknown" || t.project === "—") continue;
    if (t.price <= 0 || t.sizeSqft <= 0) continue;
    if (t.date < cutoff) continue;
    // Only residential for now
    if (t.propertyType !== "Apartment" && t.propertyType !== "Villa" &&
        t.propertyType !== "Townhouse" && t.propertyType !== "Penthouse" &&
        t.propertyType !== "Duplex") continue;

    const key = `${t.project}|${t.bedrooms}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        project: t.project,
        district: t.district,
        propertyType: t.propertyType,
        bedrooms: t.bedrooms,
        txs: [],
        lastDate: t.date,
        count: 0,
      };
      groups.set(key, g);
    }
    g.txs.push({ date: t.date, price: t.price, rate: t.ratePerSqft, size: t.sizeSqft });
    if (t.date > g.lastDate) g.lastDate = t.date;
    g.count++;
  }

  for (const g of groups.values()) {
    g.txs.sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }

  // Only keep groups with enough data for a meaningful median
  return [...groups.values()].filter((g) => g.count >= 3);
}

/**
 * Pick the best "current market" window for this cohort. We want an anchor
 * that reflects today's prices, not a 24-month average — in fast-moving
 * markets like Reem Island a 24mo median can lag the recent rate by 20-30%,
 * which caused our asking-price sample to look 30% cheaper than real PF /
 * Bayut inventory. We step through 6 → 12 → 24 months and pick the first
 * window with at least `minTx` data points. The older fallbacks keep thin
 * project cohorts (handful of sales) from collapsing to zero.
 */
function pickRecentWindow(
  txs: AdrecTx[],
  minTx = 5
): { months: number; subset: AdrecTx[] } {
  const now = new Date();
  const windows: number[] = [6, 12, 24];
  for (const months of windows) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const subset = txs.filter((t) => t.date >= cutoffStr);
    if (subset.length >= minTx || months === 24) {
      return { months, subset };
    }
  }
  return { months: 24, subset: txs };
}

// --- Core: generate sample listings + stats per group ---

export function buildListingGroups(transactions: Transaction[]): ListingGroup[] {
  const adrecGroups = buildAdrecGroups(transactions);

  const result: ListingGroup[] = adrecGroups.map((g) => {
    const seed = prng(hashString(`${g.project}|${g.bedrooms}`));

    // --- Anchors -----------------------------------------------------------
    // 24mo median: kept for liquidity context and long-run reference.
    const adrecPrices = g.txs.map((t) => t.price);
    const adrecRates = g.txs.map((t) => t.rate);
    const adrecSizes = g.txs.map((t) => t.size);
    const adrecMedianPrice = median(adrecPrices);
    const adrecMedianRate = median(adrecRates);
    const typicalSize = Math.round(median(adrecSizes));

    // Recent window: 6 → 12 → 24 months, whichever first has ≥5 tx. This
    // is what we anchor asking-price generation to, so the sample reflects
    // today's market rather than an 18-month-old median. Reem Island 1BR
    // rates jumped ~30% between 2024 and 2026 — the 24mo median was off.
    const { months: recentWindowMonths, subset: recentTxs } = pickRecentWindow(g.txs);
    const recentMedianPrice = median(recentTxs.map((t) => t.price));
    const recentMedianRate = median(recentTxs.map((t) => t.rate));

    // Listing count scales with ADREC transaction volume.
    // Real per-bedroom-config inventory on PF+Bayut combined is usually
    // 0.3-0.8x the 24-month transaction count (most unit types have 20-80
    // active ads, not hundreds). Cap at 90, floor at 6.
    const listingCount = Math.min(
      90,
      Math.max(6, Math.round(g.count * 0.45) + Math.floor(seed() * 6))
    );

    const listings: MLSListing[] = [];
    const today = new Date();

    for (let i = 0; i < listingCount; i++) {
      // Price distribution, anchored to the RECENT median rate.
      // Real Abu Dhabi market: sellers list ~10% above recent closed-sale
      // rate on average, with a long tail of aspirational +20-30% asks.
      // Validated against Pixel 1BR on Al Reem Island (recent ~2,000 AED/sqft,
      // PF asking ~2,200-2,400 AED/sqft).
      //
      //   4%  distress       (0.88-0.94  → 6-12% below recent)
      //   8%  motivated      (0.95-0.99  → 1-5% below recent)
      //  28%  at market      (1.00-1.05  → +0-5%)
      //  40%  premium        (1.05-1.15  → +5-15%)  ← the typical asking band
      //  20%  aspirational   (1.15-1.28  → +15-28%)
      const r = seed();
      let priceMultiplier: number;
      if (r < 0.04) {
        priceMultiplier = 0.88 + seed() * 0.06;
      } else if (r < 0.12) {
        priceMultiplier = 0.95 + seed() * 0.04;
      } else if (r < 0.40) {
        priceMultiplier = 1.00 + seed() * 0.05;
      } else if (r < 0.80) {
        priceMultiplier = 1.05 + seed() * 0.10;
      } else {
        priceMultiplier = 1.15 + seed() * 0.13;
      }

      const sizeVariance = 0.9 + seed() * 0.2; // ±10% size variance
      const sizeSqft = Math.max(300, Math.round(typicalSize * sizeVariance));
      const askingRate = Math.round(recentMedianRate * priceMultiplier);
      const askingPrice = Math.round((sizeSqft * askingRate) / 1000) * 1000;

      const platform: MLSPlatform = seed() < 0.55 ? "propertyfinder" : "bayut";
      const daysAgo = Math.floor(seed() * 60);
      const listingDate = new Date(today.getTime() - daysAgo * 86400000)
        .toISOString()
        .slice(0, 10);

      listings.push({
        id: `${g.project}-${g.bedrooms}-${i}`,
        platform,
        project: g.project,
        district: g.district,
        propertyType: g.propertyType,
        bedrooms: g.bedrooms,
        sizeSqft,
        askingPrice,
        askingRate,
        listingDate,
        url: buildListingUrl(
          platform,
          g.project,
          g.district,
          g.bedrooms,
          g.propertyType
        ),
        agentName: generateAgentName(seed, platform),
      });
    }

    const askPrices = listings.map((l) => l.askingPrice);
    const askRates = listings.map((l) => l.askingRate);
    const askPriceMedian = Math.round(median(askPrices));
    const askRateMedian = Math.round(median(askRates));

    // Premium + distress both measured vs the RECENT market rate — that's
    // what the user sees on PF/Bayut, so that's the honest comparable.
    const distressCount = listings.filter(
      (l) => l.askingRate < recentMedianRate * (1 - DISTRESS_THRESHOLD)
    ).length;

    const pfCount = listings.filter((l) => l.platform === "propertyfinder").length;
    const bayutCount = listingCount - pfCount;

    return {
      key: `${g.project}|${g.bedrooms}`,
      project: g.project,
      district: g.district,
      propertyType: g.propertyType,
      bedrooms: g.bedrooms,
      listingCount,
      platforms: { propertyfinder: pfCount, bayut: bayutCount },
      askPriceMedian,
      askPriceMin: Math.min(...askPrices),
      askPriceMax: Math.max(...askPrices),
      askRateMedian,
      listings,
      adrecTxCount: g.count,
      adrecMedianPrice: Math.round(adrecMedianPrice),
      adrecMedianRate: Math.round(adrecMedianRate),
      adrecLastDate: g.lastDate,
      typicalSize,
      recentWindowMonths,
      recentTxCount: recentTxs.length,
      recentMedianPrice: Math.round(recentMedianPrice),
      recentMedianRate: Math.round(recentMedianRate),
      premiumPct: ((askRateMedian - recentMedianRate) / recentMedianRate) * 100,
      distressCount,
    };
  });

  // Sort by total activity (ADREC tx count desc)
  return result.sort((a, b) => b.adrecTxCount - a.adrecTxCount);
}

// --- Filters ---

export interface MLSFilterState {
  district: string;
  project: string;
  propertyType: string;
  bedrooms: string;
  platform: "" | MLSPlatform;
  distressOnly: boolean;
  searchQuery: string;
}

export const defaultMLSFilters: MLSFilterState = {
  district: "",
  project: "",
  propertyType: "",
  bedrooms: "",
  platform: "",
  distressOnly: false,
  searchQuery: "",
};

/**
 * Re-derive a ListingGroup from a (possibly filtered) subset of its listings.
 * Used when the user scopes to a single platform — we can't just return the
 * pre-built group as-is because its medians and distress count reflect both
 * platforms together.
 *
 * Returns null if the subset is empty (caller should drop the group).
 */
function rebuildGroupFromListings(
  base: ListingGroup,
  listings: MLSListing[]
): ListingGroup | null {
  if (listings.length === 0) return null;
  const askPrices = listings.map((l) => l.askingPrice);
  const askRates = listings.map((l) => l.askingRate);
  const askPriceMedian = Math.round(median(askPrices));
  const askRateMedian = Math.round(median(askRates));
  const pf = listings.filter((l) => l.platform === "propertyfinder").length;
  const bayut = listings.length - pf;
  const distressCount = listings.filter(
    (l) => l.askingRate < base.recentMedianRate * (1 - DISTRESS_THRESHOLD)
  ).length;
  return {
    ...base,
    listings,
    listingCount: listings.length,
    platforms: { propertyfinder: pf, bayut },
    askPriceMedian,
    askPriceMin: Math.min(...askPrices),
    askPriceMax: Math.max(...askPrices),
    askRateMedian,
    premiumPct:
      ((askRateMedian - base.recentMedianRate) / base.recentMedianRate) * 100,
    distressCount,
  };
}

export function applyMLSFilters(
  groups: ListingGroup[],
  filters: MLSFilterState
): ListingGroup[] {
  const q = filters.searchQuery.trim().toLowerCase();
  const out: ListingGroup[] = [];

  for (const g of groups) {
    if (filters.district && g.district !== filters.district) continue;
    if (filters.project && g.project !== filters.project) continue;
    if (filters.propertyType && g.propertyType !== filters.propertyType) continue;
    if (filters.bedrooms) {
      if (filters.bedrooms === "6+" && g.bedrooms < 6) continue;
      else if (filters.bedrooms !== "6+" && g.bedrooms !== Number(filters.bedrooms)) continue;
    }
    if (q) {
      const hay = `${g.project} ${g.district}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    // Platform scope rebuilds the group on the filtered listing set so the
    // displayed medians, premium %, and distress count match the badge.
    let scoped: ListingGroup | null = g;
    if (filters.platform) {
      const subset = g.listings.filter((l) => l.platform === filters.platform);
      scoped = rebuildGroupFromListings(g, subset);
      if (!scoped) continue;
    }

    if (filters.distressOnly && scoped.distressCount === 0) continue;

    out.push(scoped);
  }

  return out;
}

// --- Aggregate stats across filtered groups ---

export interface MLSOverviewStats {
  totalListings: number;
  totalDistress: number;
  avgPremiumPct: number;
  platformBreakdown: { propertyfinder: number; bayut: number };
  projectsCovered: number;
}

export function computeOverviewStats(groups: ListingGroup[]): MLSOverviewStats {
  let totalListings = 0;
  let totalDistress = 0;
  let pf = 0;
  let bayut = 0;
  const premiums: number[] = [];
  const projectSet = new Set<string>();

  for (const g of groups) {
    totalListings += g.listingCount;
    totalDistress += g.distressCount;
    pf += g.platforms.propertyfinder;
    bayut += g.platforms.bayut;
    premiums.push(g.premiumPct);
    projectSet.add(g.project);
  }

  const avgPremiumPct = premiums.length
    ? premiums.reduce((s, v) => s + v, 0) / premiums.length
    : 0;

  return {
    totalListings,
    totalDistress,
    avgPremiumPct,
    platformBreakdown: { propertyfinder: pf, bayut: bayut },
    projectsCovered: projectSet.size,
  };
}

// --- AI smart search for MLS filters ---

export interface MLSSmartSearchPreview {
  filters: Partial<MLSFilterState>;
  matchedTerms: string[];
  remainingQuery: string;
}

/**
 * Parse a natural-language query into MLS filter candidates.
 * Reuses the Dashboard's smart-search parser and maps the overlapping
 * fields (district, project, propertyType, bedrooms) onto MLSFilterState.
 * Anything unmatched becomes the free-text searchQuery.
 */
export function parseMLSSmartSearch(
  query: string,
  hierarchy: Hierarchy
): MLSSmartSearchPreview {
  const parsed = parseSmartSearch(query, hierarchy);
  const filters: Partial<MLSFilterState> = {};
  if (parsed.filters.district) filters.district = parsed.filters.district;
  if (parsed.filters.project) filters.project = parsed.filters.project;
  if (parsed.filters.propertyType) filters.propertyType = parsed.filters.propertyType;
  if (parsed.filters.bedrooms) filters.bedrooms = parsed.filters.bedrooms;
  return {
    filters,
    matchedTerms: parsed.matchedTerms,
    remainingQuery: parsed.remainingQuery,
  };
}

/**
 * Merge the parsed smart-search filters into the user's current MLS filter
 * state. Previously this reset everything to defaults (except distressOnly),
 * which silently dropped the user's platform pick, property type, etc. We
 * now preserve the current state and only overwrite fields the parser hit.
 */
export function applyMLSSmartSearch(
  current: MLSFilterState,
  parsed: MLSSmartSearchPreview
): MLSFilterState {
  const next: MLSFilterState = { ...current };
  if (parsed.filters.district && parsed.filters.district !== next.district) {
    next.district = parsed.filters.district;
    next.project = ""; // auto-reset project when district changes
  }
  if (parsed.filters.project) next.project = parsed.filters.project;
  if (parsed.filters.propertyType) next.propertyType = parsed.filters.propertyType;
  if (parsed.filters.bedrooms) next.bedrooms = parsed.filters.bedrooms;
  next.searchQuery = parsed.remainingQuery || "";
  return next;
}

// Get all distress listings across groups, sorted by discount magnitude
export function getDistressListings(groups: ListingGroup[]): Array<
  MLSListing & { discountPct: number; adrecMedianRate: number }
> {
  const distress: Array<MLSListing & { discountPct: number; adrecMedianRate: number }> = [];
  const cutoff = 1 - DISTRESS_THRESHOLD;
  for (const g of groups) {
    // Distress is measured against the RECENT median rate — that's what
    // the listing is actually competing against on PF/Bayut today. Using
    // the 24mo median would flag every Reem Island 1BR as "distress"
    // purely because the long-run median lags the current market.
    for (const l of g.listings) {
      if (l.askingRate < g.recentMedianRate * cutoff) {
        distress.push({
          ...l,
          discountPct: ((l.askingRate - g.recentMedianRate) / g.recentMedianRate) * 100,
          adrecMedianRate: g.recentMedianRate,
        });
      }
    }
  }
  return distress.sort((a, b) => a.discountPct - b.discountPct);
}
