"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useT } from "@/i18n/LanguageContext";

interface TransactionTableProps {
  data: Transaction[];
}

type SortField =
  | "date"
  | "district"
  | "project"
  | "sizeSqft"
  | "price"
  | "ratePerSqft";

const PAGE_SIZE = 25;

const TYPE_COLORS: Record<string, string> = {
  Apartment: "bg-accent/10 text-accent",
  Villa: "bg-positive/10 text-positive",
  Townhouse: "bg-blue-500/10 text-blue-400",
  Penthouse: "bg-purple-500/10 text-purple-400",
  Land: "bg-orange-500/10 text-orange-400",
  Office: "bg-cyan-500/10 text-cyan-400",
  Retail: "bg-rose-500/10 text-rose-400",
  Warehouse: "bg-amber-500/10 text-amber-400",
};

const DEFAULT_TYPE_COLOR = "bg-input-bg text-muted";

function getTypeColor(propertyType: string): string {
  return TYPE_COLORS[propertyType] || DEFAULT_TYPE_COLOR;
}

function formatBedrooms(beds: number): string {
  if (beds === 0) return "S";
  if (beds === -1) return "-";
  return String(beds);
}

export default function TransactionTable({ data }: TransactionTableProps) {
  const t = useT();
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "district":
          cmp = a.district.localeCompare(b.district);
          break;
        case "project":
          cmp = a.project.localeCompare(b.project);
          break;
        case "sizeSqft":
          cmp = a.sizeSqft - b.sizeSqft;
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "ratePerSqft":
          cmp = a.ratePerSqft - b.ratePerSqft;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="ms-1 inline h-3 w-3 text-muted/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ms-1 inline h-3 w-3 text-accent" />
    ) : (
      <ArrowDown className="ms-1 inline h-3 w-3 text-accent" />
    );
  };

  const colClass =
    "cursor-pointer select-none whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted hover:text-accent transition-colors";

  const staticColClass =
    "whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted";

  // Page number range (show 5 at a time)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const total = Math.min(5, totalPages);
    let start: number;

    if (totalPages <= 5) {
      start = 0;
    } else if (page < 3) {
      start = 0;
    } else if (page > totalPages - 4) {
      start = totalPages - 5;
    } else {
      start = page - 2;
    }

    for (let i = 0; i < total; i++) {
      pages.push(start + i);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div
      className="rounded-xl border border-card-border bg-card-bg"
      id="transactions"
    >
      <div className="border-b border-card-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("transaction_details")}
        </h2>
        <p className="text-xs text-muted">
          {t("showing_of", paged.length.toString(), data.length.toLocaleString())}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr className="border-b border-card-border bg-input-bg/50">
              <th className={colClass} onClick={() => handleSort("date")}>
                {t("date")}
                <SortIcon field="date" />
              </th>
              <th className={colClass} onClick={() => handleSort("district")}>
                {t("district")}
                <SortIcon field="district" />
              </th>
              <th className={colClass} onClick={() => handleSort("project")}>
                {t("project")}
                <SortIcon field="project" />
              </th>
              <th className={staticColClass}>{t("type")}</th>
              <th className={staticColClass}>{t("beds")}</th>
              <th className={colClass} onClick={() => handleSort("sizeSqft")}>
                {t("size_sqft_header")}
                <SortIcon field="sizeSqft" />
              </th>
              <th className={colClass} onClick={() => handleSort("price")}>
                {t("price_aed_header")}
                <SortIcon field="price" />
              </th>
              <th
                className={colClass}
                onClick={() => handleSort("ratePerSqft")}
              >
                {t("rate_sqft")}
                <SortIcon field="ratePerSqft" />
              </th>
              <th className={staticColClass}>{t("status")}</th>
              <th className={staticColClass}>{t("sale")}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-card-border/50 transition-colors hover:bg-input-bg"
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                  {tx.date}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-accent">
                  {tx.district}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-sm text-foreground">
                  {tx.project}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(tx.propertyType)}`}
                  >
                    {tx.propertyType}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-foreground">
                  {formatBedrooms(tx.bedrooms)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-end text-sm text-foreground">
                  {formatNumber(tx.sizeSqft)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-end text-sm font-semibold text-foreground">
                  {formatAED(tx.price)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-end text-sm text-muted">
                  {formatNumber(tx.ratePerSqft)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.status === "Off-Plan"
                        ? "bg-accent/10 text-accent"
                        : tx.status === "Ready"
                          ? "bg-positive/10 text-positive"
                          : "bg-input-bg text-muted"
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.sequence === "Primary"
                        ? "bg-accent/10 text-accent"
                        : tx.sequence === "Secondary"
                          ? "bg-input-bg text-muted"
                          : "bg-input-bg text-muted"
                    }`}
                  >
                    {tx.sequence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-card-border px-5 py-3">
        <p className="text-xs text-muted">
          {t("page_of", String(page + 1), String(totalPages))}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-input-border p-2 text-muted transition-colors hover:bg-input-bg disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={`min-w-[36px] rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                page === pageNum
                  ? "border-accent bg-accent text-background"
                  : "border-input-border text-muted hover:bg-input-bg"
              }`}
            >
              {pageNum + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-input-border p-2 text-muted transition-colors hover:bg-input-bg disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
