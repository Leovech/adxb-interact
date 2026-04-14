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
  areaId: string;
  projectId: string;
  buildingId: string;
  propertyType: string;
  transactionType: string;
  status: string;
  bedrooms: string;
  bathrooms: string;
  maidsRoom: string;
  searchQuery: string;
  priceMin: string;
  priceMax: string;
  sizeMin: string;
  sizeMax: string;
  paymentMethod: string;
  developer: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
}

export const defaultFilters: FilterState = {
  areaId: "",
  projectId: "",
  buildingId: "",
  propertyType: "",
  transactionType: "",
  status: "",
  bedrooms: "",
  bathrooms: "",
  maidsRoom: "",
  searchQuery: "",
  priceMin: "",
  priceMax: "",
  sizeMin: "",
  sizeMax: "",
  paymentMethod: "",
  developer: "",
  datePreset: "this_year",
  dateFrom: "",
  dateTo: "",
};

export function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string): { start: Date; end: Date } {
  const now = new Date();

  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7d":
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case "30d":
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case "90d":
      return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
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
        start: customFrom ? startOfDay(parseISO(customFrom)) : startOfYear(subYears(now, 3)),
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
  const { start, end } = getDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);

  const searchLower = filters.searchQuery ? filters.searchQuery.toLowerCase() : "";

  return data.filter((tx) => {
    const txDate = parseISO(tx.date);

    if (!isWithinInterval(txDate, { start, end })) return false;
    if (filters.areaId && tx.areaId !== filters.areaId) return false;
    if (filters.projectId && tx.projectId !== filters.projectId) return false;
    if (filters.buildingId && tx.buildingId !== filters.buildingId) return false;
    if (filters.propertyType && tx.propertyType !== filters.propertyType) return false;
    if (filters.transactionType && tx.transactionType !== filters.transactionType) return false;
    if (filters.status && tx.status !== filters.status) return false;
    if (filters.paymentMethod && tx.paymentMethod !== filters.paymentMethod) return false;
    if (filters.developer && tx.developer !== filters.developer) return false;

    // Bedrooms: exact match, "6+" means 6 or more
    if (filters.bedrooms) {
      if (filters.bedrooms === "6+") {
        if (tx.bedrooms < 6) return false;
      } else {
        if (tx.bedrooms !== parseInt(filters.bedrooms)) return false;
      }
    }

    // Bathrooms: exact match, "4+" means 4 or more
    if (filters.bathrooms) {
      if (filters.bathrooms === "4+") {
        if (tx.bathrooms < 4) return false;
      } else {
        if (tx.bathrooms !== parseInt(filters.bathrooms)) return false;
      }
    }

    // Maid's room
    if (filters.maidsRoom) {
      if (filters.maidsRoom === "yes" && !tx.maidsRoom) return false;
      if (filters.maidsRoom === "no" && tx.maidsRoom) return false;
    }

    // Search query: case-insensitive match against area, project, building, or developer
    if (searchLower) {
      const haystack = `${tx.area} ${tx.project} ${tx.building} ${tx.developer}`.toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }

    if (filters.priceMin && tx.price < parseInt(filters.priceMin)) return false;
    if (filters.priceMax && tx.price > parseInt(filters.priceMax)) return false;
    if (filters.sizeMin && tx.size < parseInt(filters.sizeMin)) return false;
    if (filters.sizeMax && tx.size > parseInt(filters.sizeMax)) return false;

    return true;
  });
}

export function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`;
  return `AED ${value.toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
