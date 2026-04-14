"use client";

import { Transaction } from "@/data/abu-dhabi";
import { formatAED } from "@/lib/filters";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";

interface TransactionTableProps {
  data: Transaction[];
}

type SortField =
  | "date"
  | "area"
  | "project"
  | "building"
  | "propertyType"
  | "bedrooms"
  | "size"
  | "price"
  | "pricePerSqft"
  | "transactionType";

const PAGE_SIZE = 25;

export default function TransactionTable({ data }: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let cmp = 0;
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
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
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3 text-accent" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3 text-accent" />
    );
  };

  const colClass =
    "cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted hover:text-accent transition-colors";

  return (
    <div className="rounded-xl border border-card-border bg-card-bg" id="transactions">
      <div className="border-b border-card-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Transaction Details
        </h2>
        <p className="text-xs text-muted">
          Showing {paged.length} of {data.length.toLocaleString()} transactions
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-card-border bg-input-bg/50">
              <th className={colClass} onClick={() => handleSort("date")}>
                Date
                <SortIcon field="date" />
              </th>
              <th className={colClass} onClick={() => handleSort("area")}>
                Area
                <SortIcon field="area" />
              </th>
              <th className={colClass} onClick={() => handleSort("project")}>
                Project
                <SortIcon field="project" />
              </th>
              <th className={colClass} onClick={() => handleSort("building")}>
                Building
                <SortIcon field="building" />
              </th>
              <th
                className={colClass}
                onClick={() => handleSort("propertyType")}
              >
                Type
                <SortIcon field="propertyType" />
              </th>
              <th className={colClass} onClick={() => handleSort("bedrooms")}>
                Beds
                <SortIcon field="bedrooms" />
              </th>
              <th className={colClass} onClick={() => handleSort("size")}>
                Size (sqft)
                <SortIcon field="size" />
              </th>
              <th className={colClass} onClick={() => handleSort("price")}>
                Price
                <SortIcon field="price" />
              </th>
              <th
                className={colClass}
                onClick={() => handleSort("pricePerSqft")}
              >
                AED/sqft
                <SortIcon field="pricePerSqft" />
              </th>
              <th
                className={colClass}
                onClick={() => handleSort("transactionType")}
              >
                Deal
                <SortIcon field="transactionType" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-card-border/50 transition-colors hover:bg-input-bg/30"
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                  {tx.date}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-accent">
                  {tx.area}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                  {tx.project}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">
                  {tx.building}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {tx.propertyType}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-foreground">
                  {tx.bedrooms === 0 ? "S" : tx.bedrooms}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-foreground">
                  {tx.size.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-foreground">
                  {formatAED(tx.price)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted">
                  {tx.pricePerSqft.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.transactionType === "Sale"
                        ? "bg-positive/10 text-positive"
                        : tx.transactionType === "Rental"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-orange-500/10 text-orange-400"
                    }`}
                  >
                    {tx.transactionType}
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
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-input-border p-2 text-muted transition-colors hover:bg-input-bg disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i;
            } else if (page < 3) {
              pageNum = i;
            } else if (page > totalPages - 4) {
              pageNum = totalPages - 5 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
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
            );
          })}
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
