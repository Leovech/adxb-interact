import { Transaction } from "@/data/abu-dhabi";

/** "Data updated: <Month Year>" — derived from the most recent transaction
 *  date already in the dataset, so it needs no extra pipeline field and
 *  always matches what's actually loaded. */
export function latestDataMonthLabel(transactions: Transaction[]): string {
  if (!transactions.length) return "";
  let max = transactions[0].date;
  for (const t of transactions) if (t.date > max) max = t.date;
  const d = new Date(max);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
