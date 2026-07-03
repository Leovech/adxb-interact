"use client";

import SparkAreaChart from "@/components/ui/SparkAreaChart";
import { AssistantAnswer } from "@/lib/assistant/query-engine";
import { FileText, ArrowUpRight, TrendingUp, TrendingDown, Minus, Bot, User as UserIcon } from "lucide-react";

export function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end gap-2">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 text-sm font-medium text-background">
        {text}
      </div>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-input-bg">
        <UserIcon className="h-3.5 w-3.5 text-muted" />
      </div>
    </div>
  );
}

/** Renders one AI assistant answer: narrative, stats, trend chart, ranked
 *  table, report link, and follow-up suggestions. Shared by the full
 *  /assistant page and the compact landing-page widget. */
export function AssistantAnswerCard({
  answer,
  onFollowUp,
}: {
  answer: AssistantAnswer;
  onFollowUp: (q: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <Bot className="h-3.5 w-3.5 text-accent" />
      </div>
      <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-sm border border-card-border bg-background/60 p-4">
        {answer.filterChips.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {answer.filterChips.map((c, i) => (
              <span key={i} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                {c}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm leading-relaxed text-foreground">{answer.narrative}</p>

        {answer.stats.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {answer.stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-card-border bg-card-bg p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">{s.label}</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {answer.chart && answer.chart.length >= 2 && (
          <div className="mt-3">
            <SparkAreaChart
              data={answer.chart}
              height={140}
              showFooter={false}
              formatValue={(n) => `${Math.round(n).toLocaleString()} AED/sqft`}
            />
          </div>
        )}

        {answer.rows.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-card-border">
            <table className="w-full text-xs">
              <thead className="bg-input-bg text-[9px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-2.5 py-2 text-left font-semibold">Project</th>
                  <th className="px-2.5 py-2 text-left font-semibold">BR</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Median</th>
                  <th className="px-2.5 py-2 text-right font-semibold">AED/sqft</th>
                  {answer.rows.some((r) => r.yieldPct != null) && (
                    <th className="px-2.5 py-2 text-right font-semibold">Yield</th>
                  )}
                  {answer.rows.some((r) => r.badge) && (
                    <th className="px-2.5 py-2 text-left font-semibold">Signal</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {answer.rows.map((r) => (
                  <tr key={r.key} className="border-t border-card-border/50">
                    <td className="px-2.5 py-2">
                      <p className="font-semibold text-foreground">{r.project}</p>
                      <p className="text-[10px] text-muted">{r.district}</p>
                    </td>
                    <td className="px-2.5 py-2 text-foreground">{r.bedroomLabel}</td>
                    <td className="px-2.5 py-2 text-right text-foreground">{formatAED(r.medianPrice)}</td>
                    <td className="px-2.5 py-2 text-right text-muted">{r.medianRate.toLocaleString()}</td>
                    {answer.rows.some((x) => x.yieldPct != null) && (
                      <td className="px-2.5 py-2 text-right font-semibold text-positive">
                        {r.yieldPct != null ? `${r.yieldPct.toFixed(1)}%` : "—"}
                      </td>
                    )}
                    {answer.rows.some((x) => x.badge) && (
                      <td className="px-2.5 py-2">
                        {r.badge && <TrendBadge badge={r.badge} />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {answer.reportLink && (
          <a
            href={`/mls/report?project=${encodeURIComponent(answer.reportLink.project)}&bedrooms=${answer.reportLink.bedrooms}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          >
            <FileText className="h-3 w-3" />
            Open investor report
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}

        {answer.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-card-border/60 pt-3">
            {answer.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onFollowUp(s)}
                className="rounded-full border border-card-border bg-card-bg px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TrendBadge({ badge }: { badge: string }) {
  const lower = badge.toLowerCase();
  const Icon = lower.includes("surg") || lower.includes("accel") || lower.includes("buy")
    ? TrendingUp
    : lower.includes("cool") || lower.includes("avoid")
    ? TrendingDown
    : Minus;
  const color =
    lower.includes("surg") || lower.includes("accel") || lower.includes("buy")
      ? "text-positive"
      : lower.includes("cool") || lower.includes("avoid")
      ? "text-negative"
      : "text-muted";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {badge}
    </span>
  );
}
