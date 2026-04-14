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

  // ADREC (real)
  adrecTxCount: number;
  adrecMedianPrice: number;
  adrecMedianRate: number;
  adrecLastDate: string;
  typicalSize: number;

  // Comparison
  premiumPct: number; // listings median vs ADREC median
  distressCount: number; // listings ≥5% below ADREC rate
}

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

interface AdrecGroup {
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;
  prices: number[];
  rates: number[];
  sizes: number[];
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
        prices: [],
        rates: [],
        sizes: [],
        lastDate: t.date,
        count: 0,
      };
      groups.set(key, g);
    }
    g.prices.push(t.price);
    g.rates.push(t.ratePerSqft);
    g.sizes.push(t.sizeSqft);
    if (t.date > g.lastDate) g.lastDate = t.date;
    g.count++;
  }

  // Only keep groups with enough data for a meaningful median
  return [...groups.values()].filter((g) => g.count >= 3);
}

// --- Core: generate sample listings + stats per group ---

export function buildListingGroups(transactions: Transaction[]): ListingGroup[] {
  const adrecGroups = buildAdrecGroups(transactions);

  const result: ListingGroup[] = adrecGroups.map((g) => {
    const seed = prng(hashString(`${g.project}|${g.bedrooms}`));
    const adrecMedianPrice = median(g.prices);
    const adrecMedianRate = median(g.rates);
    const typicalSize = Math.round(median(g.sizes));

    // Listing count scales with ADREC transaction volume.
    // Property Finder + Bayut combined typically list 1.5-3x the 24-month
    // transaction count for active projects (stale inventory accumulates),
    // so we mirror that: base ≈ 1.8x tx count, capped at 220, floor at 12.
    const listingCount = Math.min(
      220,
      Math.max(12, Math.round(g.count * 1.8) + Math.floor(seed() * 24))
    );

    const listings: MLSListing[] = [];
    const today = new Date();

    for (let i = 0; i < listingCount; i++) {
      // Price distribution:
      //  60% overpriced (5-18% above market - typical)
      //  25% fair (±5% of market)
      //  15% distress (5-15% below market)
      const r = seed();
      let priceMultiplier: number;
      if (r < 0.15) {
        priceMultiplier = 0.85 + seed() * 0.1; // 5-15% below
      } else if (r < 0.4) {
        priceMultiplier = 0.95 + seed() * 0.1; // ±5%
      } else {
        priceMultiplier = 1.05 + seed() * 0.13; // 5-18% above
      }

      const sizeVariance = 0.82 + seed() * 0.36; // ±18% size variance
      const sizeSqft = Math.max(300, Math.round(typicalSize * sizeVariance));
      const askingRate = Math.round(adrecMedianRate * priceMultiplier);
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

    const distressCount = listings.filter(
      (l) => l.askingRate < adrecMedianRate * 0.95
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
      premiumPct: ((askRateMedian - adrecMedianRate) / adrecMedianRate) * 100,
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
  platform: string;
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

export function applyMLSFilters(
  groups: ListingGroup[],
  filters: MLSFilterState
): ListingGroup[] {
  const q = filters.searchQuery.trim().toLowerCase();
  return groups.filter((g) => {
    if (filters.district && g.district !== filters.district) return false;
    if (filters.project && g.project !== filters.project) return false;
    if (filters.propertyType && g.propertyType !== filters.propertyType) return false;
    if (filters.bedrooms) {
      if (filters.bedrooms === "6+" && g.bedrooms < 6) return false;
      else if (filters.bedrooms !== "6+" && g.bedrooms !== Number(filters.bedrooms)) return false;
    }
    if (filters.distressOnly && g.distressCount === 0) return false;
    if (q) {
      const hay = `${g.project} ${g.district}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
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

export function applyMLSSmartSearch(
  current: MLSFilterState,
  parsed: MLSSmartSearchPreview
): MLSFilterState {
  const next: MLSFilterState = { ...defaultMLSFilters, distressOnly: current.distressOnly };
  if (parsed.filters.district) next.district = parsed.filters.district;
  if (parsed.filters.project) next.project = parsed.filters.project;
  if (parsed.filters.propertyType) next.propertyType = parsed.filters.propertyType;
  if (parsed.filters.bedrooms) next.bedrooms = parsed.filters.bedrooms;
  if (parsed.remainingQuery) next.searchQuery = parsed.remainingQuery;
  return next;
}

// Get all distress listings across groups, sorted by discount magnitude
export function getDistressListings(groups: ListingGroup[]): Array<
  MLSListing & { discountPct: number; adrecMedianRate: number }
> {
  const distress: Array<MLSListing & { discountPct: number; adrecMedianRate: number }> = [];
  for (const g of groups) {
    for (const l of g.listings) {
      if (l.askingRate < g.adrecMedianRate * 0.95) {
        distress.push({
          ...l,
          discountPct: ((l.askingRate - g.adrecMedianRate) / g.adrecMedianRate) * 100,
          adrecMedianRate: g.adrecMedianRate,
        });
      }
    }
  }
  return distress.sort((a, b) => a.discountPct - b.discountPct);
}
