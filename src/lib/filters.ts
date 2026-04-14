import { Transaction } from "@/data/abu-dhabi";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
  isWithinInterval,
  parseISO,
} from "date-fns";

export type DatePreset =
  | "all_time"
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "ytd"
  | "custom";

export interface FilterState {
  district: string;
  project: string;
  propertyType: string;
  status: string;        // Off-Plan | Ready
  sequence: string;      // Primary | Secondary
  assetClass: string;    // residential | commercial etc.
  bedrooms: string;
  searchQuery: string;
  priceMin: string;
  priceMax: string;
  sizeMin: string;
  sizeMax: string;
  rateMin: string;
  rateMax: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
}

export const defaultFilters: FilterState = {
  district: "",
  project: "",
  propertyType: "",
  status: "",
  sequence: "",
  assetClass: "",
  bedrooms: "",
  searchQuery: "",
  priceMin: "",
  priceMax: "",
  sizeMin: "",
  sizeMax: "",
  rateMin: "",
  rateMax: "",
  datePreset: "all_time",
  dateFrom: "",
  dateTo: "",
};

export function getDateRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string
): { start: Date; end: Date } {
  const now = new Date();

  switch (preset) {
    case "all_time":
      return { start: new Date(2019, 0, 1), end: endOfDay(now) };
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7d":
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case "30d":
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case "90d":
      return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
    case "this_week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "this_quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      const qEnd = new Date(now.getFullYear(), qMonth + 3, 0);
      return { start: startOfDay(qStart), end: endOfDay(qEnd) };
    }
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "last_month":
      return {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
      };
    case "last_quarter": {
      const cqMonth = Math.floor(now.getMonth() / 3) * 3;
      const lqStart = new Date(now.getFullYear(), cqMonth - 3, 1);
      const lqEnd = new Date(now.getFullYear(), cqMonth, 0);
      return { start: startOfDay(lqStart), end: endOfDay(lqEnd) };
    }
    case "last_year":
      return {
        start: startOfYear(subYears(now, 1)),
        end: endOfYear(subYears(now, 1)),
      };
    case "ytd":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "custom":
      return {
        start: customFrom
          ? startOfDay(parseISO(customFrom))
          : new Date(2019, 0, 1),
        end: customTo ? endOfDay(parseISO(customTo)) : endOfDay(now),
      };
    default:
      return { start: startOfYear(now), end: endOfDay(now) };
  }
}

export function applyFilters(
  data: Transaction[],
  filters: FilterState
): Transaction[] {
  const { start, end } = getDateRange(
    filters.datePreset,
    filters.dateFrom,
    filters.dateTo
  );

  const searchLower = filters.searchQuery
    ? filters.searchQuery.toLowerCase()
    : "";

  return data.filter((tx) => {
    const txDate = parseISO(tx.date);

    if (!isWithinInterval(txDate, { start, end })) return false;
    if (filters.district && tx.district !== filters.district) return false;
    if (filters.project && tx.project !== filters.project) return false;
    if (filters.propertyType && tx.propertyType !== filters.propertyType)
      return false;
    if (filters.status && tx.status !== filters.status) return false;
    if (filters.sequence && tx.sequence !== filters.sequence) return false;
    if (filters.assetClass && tx.assetClass !== filters.assetClass)
      return false;

    // Bedrooms
    if (filters.bedrooms) {
      if (filters.bedrooms === "6+") {
        if (tx.bedrooms < 6) return false;
      } else {
        if (tx.bedrooms !== parseInt(filters.bedrooms)) return false;
      }
    }

    // Search query
    if (searchLower) {
      const haystack =
        `${tx.district} ${tx.project} ${tx.community}`.toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }

    // Range filters
    if (filters.priceMin && tx.price < parseInt(filters.priceMin)) return false;
    if (filters.priceMax && tx.price > parseInt(filters.priceMax)) return false;
    if (filters.sizeMin && tx.sizeSqft < parseInt(filters.sizeMin))
      return false;
    if (filters.sizeMax && tx.sizeSqft > parseInt(filters.sizeMax))
      return false;
    if (filters.rateMin && tx.ratePerSqft < parseInt(filters.rateMin))
      return false;
    if (filters.rateMax && tx.ratePerSqft > parseInt(filters.rateMax))
      return false;

    return true;
  });
}

export function formatAED(value: number): string {
  if (value >= 1_000_000_000)
    return `AED ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`;
  return `AED ${value.toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
