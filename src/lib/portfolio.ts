/**
 * Personal property portfolio.
 *
 * Logged-in users add the units they own; we estimate each unit's current
 * market value from recent ADREC closed-sale medians (project → district →
 * fallback) and show paper gain/loss.
 *
 * Storage is per-user in localStorage (consistent with the stubbed auth).
 * When a real DB lands, swap the read/write functions for API calls — the
 * shape and call sites stay the same.
 */

import { Transaction } from "@/data/abu-dhabi";

export interface OwnedProperty {
  id: string;
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;       // 0 = studio
  sizeSqft: number;
  purchasePrice: number;
  purchaseDate: string;   // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export type OwnedPropertyInput = Omit<OwnedProperty, "id" | "createdAt">;

// --- storage ---------------------------------------------------------------

function storageKey(userId: string): string {
  return `adxb-portfolio-${userId}`;
}

export function readPortfolio(userId: string): OwnedProperty[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as OwnedProperty[]) : [];
  } catch {
    return [];
  }
}

function writePortfolio(userId: string, items: OwnedProperty[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(items));
}

function uid(): string {
  return `prop_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function addProperty(userId: string, input: OwnedPropertyInput): OwnedProperty[] {
  const items = readPortfolio(userId);
  const prop: OwnedProperty = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  const next = [prop, ...items];
  writePortfolio(userId, next);
  return next;
}

export function updateProperty(
  userId: string,
  id: string,
  patch: Partial<OwnedPropertyInput>
): OwnedProperty[] {
  const items = readPortfolio(userId).map((p) =>
    p.id === id ? { ...p, ...patch } : p
  );
  writePortfolio(userId, items);
  return items;
}

export function removeProperty(userId: string, id: string): OwnedProperty[] {
  const items = readPortfolio(userId).filter((p) => p.id !== id);
  writePortfolio(userId, items);
  return items;
}

// --- valuation -------------------------------------------------------------

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export interface ValuationIndex {
  rateByProjectBr: Map<string, number>;
  rateByDistrictBr: Map<string, number>;
  rateByDistrict: Map<string, number>;
}

/**
 * Build median AED/sqft lookups over the most recent 12 months, with
 * fallbacks: project+bedrooms → district+bedrooms → district.
 */
export function buildValuationIndex(transactions: Transaction[]): ValuationIndex {
  const cutoff = daysAgoISO(365);
  const pbr = new Map<string, number[]>();
  const dbr = new Map<string, number[]>();
  const dis = new Map<string, number[]>();

  for (const t of transactions) {
    if (t.ratePerSqft <= 0 || t.date < cutoff) continue;
    if (t.project) {
      const k = `${t.project}|${t.bedrooms}`;
      (pbr.get(k) ?? pbr.set(k, []).get(k)!).push(t.ratePerSqft);
    }
    if (t.district) {
      const dk = `${t.district}|${t.bedrooms}`;
      (dbr.get(dk) ?? dbr.set(dk, []).get(dk)!).push(t.ratePerSqft);
      (dis.get(t.district) ?? dis.set(t.district, []).get(t.district)!).push(t.ratePerSqft);
    }
  }

  const collapse = (m: Map<string, number[]>) => {
    const out = new Map<string, number>();
    for (const [k, v] of m) out.set(k, Math.round(median(v)));
    return out;
  };

  return {
    rateByProjectBr: collapse(pbr),
    rateByDistrictBr: collapse(dbr),
    rateByDistrict: collapse(dis),
  };
}

export type ValuationBasis = "project" | "district_bedrooms" | "district" | "none";

export interface Valuation {
  rate: number;           // estimated current AED/sqft
  estValue: number;       // rate × size
  basis: ValuationBasis;
  gainAED: number;        // estValue − purchasePrice
  gainPct: number;
}

export function estimateValue(
  index: ValuationIndex,
  prop: OwnedProperty
): Valuation {
  let rate = 0;
  let basis: ValuationBasis = "none";

  const pk = `${prop.project}|${prop.bedrooms}`;
  const dk = `${prop.district}|${prop.bedrooms}`;
  if (index.rateByProjectBr.get(pk)) {
    rate = index.rateByProjectBr.get(pk)!;
    basis = "project";
  } else if (index.rateByDistrictBr.get(dk)) {
    rate = index.rateByDistrictBr.get(dk)!;
    basis = "district_bedrooms";
  } else if (index.rateByDistrict.get(prop.district)) {
    rate = index.rateByDistrict.get(prop.district)!;
    basis = "district";
  }

  const estValue = rate > 0 && prop.sizeSqft > 0 ? Math.round(rate * prop.sizeSqft) : 0;
  const gainAED = estValue > 0 ? estValue - prop.purchasePrice : 0;
  const gainPct = estValue > 0 && prop.purchasePrice > 0
    ? (gainAED / prop.purchasePrice) * 100
    : 0;

  return { rate, estValue, basis, gainAED, gainPct };
}

export interface PortfolioSummary {
  count: number;
  totalInvested: number;
  totalCurrentValue: number;   // uses purchasePrice when no estimate available
  totalGainAED: number;
  totalGainPct: number;
  valuedCount: number;         // how many had a market estimate
}

export function summarize(
  index: ValuationIndex,
  props: OwnedProperty[]
): PortfolioSummary {
  let invested = 0;
  let current = 0;
  let valued = 0;
  for (const p of props) {
    invested += p.purchasePrice;
    const v = estimateValue(index, p);
    if (v.estValue > 0) {
      current += v.estValue;
      valued++;
    } else {
      current += p.purchasePrice; // no data → assume flat
    }
  }
  const gain = current - invested;
  return {
    count: props.length,
    totalInvested: invested,
    totalCurrentValue: current,
    totalGainAED: gain,
    totalGainPct: invested > 0 ? (gain / invested) * 100 : 0,
    valuedCount: valued,
  };
}

export const BASIS_LABEL: Record<ValuationBasis, string> = {
  project: "Based on recent sales in this project",
  district_bedrooms: "Based on area sales for this bedroom type",
  district: "Based on district average",
  none: "No recent comparable sales",
};
