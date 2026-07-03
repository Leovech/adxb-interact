/**
 * Client-side CSV export. No dependency — just a Blob + a synthetic
 * download link, matching the "no heavy PDF/export lib" constraint.
 */

function escapeCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  // Union of keys across all rows — rows are allowed to have different
  // shapes (e.g. mixing a "trend" section with a "best deals" section).
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => (h in r ? escapeCell(r[h]) : "")).join(",")),
  ];
  return lines.join("\n");
}

export function downloadCSV(filename: string, rows: Record<string, string | number>[]): void {
  if (typeof window === "undefined" || rows.length === 0) return;
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
