/**
 * Area / project comparison tool data layer.
 *
 * Given a set of district or project names, compute the side-by-side
 * metrics the /compare page renders: median AED/sqft, QoQ & YoY change,
 * 12-month transaction volume, a modelled gross yield, a quarterly price
 * sparkline, and a momentum badge. Pure, dependency-free, testable.
 */

import { Transaction } from "@/data/abu-dhabi";
import { districtYieldFloor } from "@/lib/investor-report";

export type CompareEntityType = "district" | "project";

export interface CompareTrendPoint {
  label: string; // "2025 Q3"
  value: number; // median AED/sqft that quarter
}

export type MomentumBadge = "surging" | "cooling" | "steady";

export interface CompareStats {
  type: CompareEntityType;
  name: string;
  district: string; // same as `name` for districts, parent district for projects
  medianRateSqft: number;
  qoqChangePct: number | null;
  yoyChangePct: number | null;
  txVolume12mo: number;
  grossYieldPct: number;
  trend: CompareTrendPoint[];
  momentumBadge: MomentumBadge;
  sampleSize: number;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function quarterKey(iso: string): string {
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} Q${q}`;
}

function pctChange(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

/** Build comparison stats for a single district or project. Returns null
 *  when there's no usable transaction history for it. */
export function buildCompareStats(
  transactions: Transaction[],
  type: CompareEntityType,
  name: string
): CompareStats | null {
  const rows = transactions.filter(
    (t) =>
      (type === "district" ? t.district : t.project) === name &&
      t.price > 0 &&
      t.sizeSqft > 0 &&
      t.ratePerSqft > 0
  );
  if (rows.length === 0) return null;

  const cutoff90 = daysAgoISO(90);
  const cutoff180 = daysAgoISO(180);
  const cutoff365 = daysAgoISO(365);
  const cutoff730 = daysAgoISO(730);

  const recent90 = rows.filter((t) => t.date >= cutoff90);
  const prior90 = rows.filter((t) => t.date >= cutoff180 && t.date < cutoff90);
  const recent365 = rows.filter((t) => t.date >= cutoff365);
  const prior365 = rows.filter((t) => t.date >= cutoff730 && t.date < cutoff365);

  const anchorRows = recent90.length >= 3 ? recent90 : rows;
  const medianRateSqft = Math.round(median(anchorRows.map((t) => t.ratePerSqft)));

  const qoqChangePct =
    recent90.length >= 3 && prior90.length >= 3
      ? pctChange(median(recent90.map((t) => t.ratePerSqft)), median(prior90.map((t) => t.ratePerSqft)))
      : null;

  const yoyChangePct =
    recent365.length >= 3 && prior365.length >= 3
      ? pctChange(median(recent365.map((t) => t.ratePerSqft)), median(prior365.map((t) => t.ratePerSqft)))
      : null;

  const txVolume12mo = recent365.length;

  const district = type === "district" ? name : rows[0].district;
  const floor = districtYieldFloor(district);
  const grossYieldPct = Math.round((floor + 0.0075) * 1000) / 10; // midpoint of the ±150bps band, as a %

  const buckets = new Map<string, number[]>();
  for (const t of rows) {
    const key = quarterKey(t.date);
    const arr = buckets.get(key) ?? [];
    arr.push(t.ratePerSqft);
    buckets.set(key, arr);
  }
  const trend: CompareTrendPoint[] = [...buckets.keys()]
    .sort()
    .slice(-8)
    .map((key) => ({ label: key, value: Math.round(median(buckets.get(key)!)) }));

  const momentumBadge: MomentumBadge =
    qoqChangePct === null ? "steady" : qoqChangePct >= 5 ? "surging" : qoqChangePct <= -5 ? "cooling" : "steady";

  return {
    type,
    name,
    district,
    medianRateSqft,
    qoqChangePct,
    yoyChangePct,
    txVolume12mo,
    grossYieldPct,
    trend,
    momentumBadge,
    sampleSize: rows.length,
  };
}

/** Build stats for up to a handful of entities at once, dropping any with
 *  no usable data (rather than throwing — comparisons should degrade
 *  gracefully when one pick has too little history). */
export function buildComparison(
  transactions: Transaction[],
  entities: { type: CompareEntityType; name: string }[]
): CompareStats[] {
  return entities
    .map((e) => buildCompareStats(transactions, e.type, e.name))
    .filter((s): s is CompareStats => s !== null);
}
