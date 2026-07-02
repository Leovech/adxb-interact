"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import PageGuide from "@/components/PageGuide";
import SparkAreaChart from "@/components/ui/SparkAreaChart";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import {
  buildAssistantContext,
  answerQuery,
  AssistantAnswer,
  AssistantContext,
} from "@/lib/assistant/query-engine";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  FileText,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type ChatMessage =
  | { role: "user"; id: string; text: string }
  | { role: "assistant"; id: string; answer: AssistantAnswer };

const EXAMPLE_QUERIES = [
  "Cheapest studio in Yas Island",
  "2BR with yield above 7% in Al Reem Island",
  "What's trending right now?",
  "Best investment in Al Reem Island",
  "Average price of villas in Al Saadiyat Island",
  "How many transactions in Yas Island",
];

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `m${msgCounter}`;
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

function AssistantContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [txRes, hierRes] = await Promise.all([
          fetch("/data/transactions.json", { cache: "no-cache" }),
          fetch("/data/hierarchy.json", { cache: "no-cache" }),
        ]);
        if (!txRes.ok || !hierRes.ok) throw new Error("Failed to load data");
        const [txJson, hierJson] = await Promise.all([txRes.json(), hierRes.json()]);
        if (cancelled) return;
        setTransactions(decodeTransactions(txJson));
        setHierarchy(hierJson as Hierarchy);
      } catch (e) {
        if (!cancelled) setDataError(e instanceof Error ? e.message : "Failed to load market data");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Heavy cross-project analytics computed once when data lands. Chat
  // messages then filter/rank these precomputed structures — no
  // re-deriving comparative stats per keystroke.
  const context: AssistantContext | null = useMemo(() => {
    if (!transactions.length || !hierarchy) return null;
    return buildAssistantContext(transactions, hierarchy);
  }, [transactions, hierarchy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const runQuery = (text: string) => {
    const q = text.trim();
    if (!q || !context) return;

    setMessages((prev) => [...prev, { role: "user", id: nextId(), text: q }]);
    setInput("");
    setThinking(true);

    // Tiny delay so the "thinking" state is visible — the actual compute
    // is synchronous and near-instant (filtering precomputed arrays).
    setTimeout(() => {
      const answer = answerQuery(q, context);
      setMessages((prev) => [...prev, { role: "assistant", id: nextId(), answer }]);
      setThinking(false);
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runQuery(input);
  };

  if (dataLoading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-muted">Loading market data…</p>
        </div>
      </>
    );
  }

  if (dataError || !context) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-sm text-negative">{dataError || "Failed to prepare assistant"}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 py-6 lg:px-8">
        <PageGuide
          storageKey="assistant"
          title="AI Real Estate Assistant — Ask in plain English (DEMO)"
          description="This assistant answers questions about Abu Dhabi real estate directly from ADREC transaction data — no external AI API, fully deterministic and traceable. Ask about prices, yields, trends, or get a recommendation."
          steps={[
            { icon: "💬", text: "Type a question like 'cheapest studio in Yas Island' or '2BR with yield above 7% in Al Reem Island'." },
            { icon: "🎯", text: "The assistant detects your intent (find / cheapest / average / trend / recommend) and filters (district, project, bedrooms, price, yield)." },
            { icon: "📊", text: "Answers include real numbers: stats, ranked project tables, and a price-trend chart where relevant." },
            { icon: "📄", text: "Click 'Open investor report' on any answer to get the full one-page brief for that project." },
            { icon: "💡", text: "Try the example chips below to get started, or combine filters: 'apartments under 2m with yield above 6% in Al Reem Island'." },
            { icon: "💬", text: "DEMO — this runs entirely on our own data + rules, no external AI call. Tell us if an answer feels wrong!" },
          ]}
          feedbackNote="Ask a question that gives a confusing or wrong answer? Tell us the exact phrase you typed — that helps us tune the parser."
        />

        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
            <Sparkles className="h-4.5 w-4.5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">AI Assistant</h1>
            <p className="text-xs text-muted">Ask anything about the Abu Dhabi market</p>
          </div>
        </div>

        {/* Message list */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-card-border bg-card-bg/40 p-4"
          style={{ minHeight: "50vh", maxHeight: "65vh" }}
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-10 text-center">
              <Bot className="h-10 w-10 text-accent/60" />
              <p className="max-w-sm text-sm text-muted">
                Ask me about prices, yields, trends, or the best places to invest — I&rsquo;ll answer
                straight from ADREC transaction data.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => runQuery(q)}
                    className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} text={m.text} />
            ) : (
              <AssistantBubble key={m.id} answer={m.answer} onFollowUp={runQuery} />
            )
          )}

          {thinking && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Bot className="h-4 w-4 text-accent" />
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about prices, yields, trends, or recommendations…"
            className="flex-1 rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </main>
    </>
  );
}

function UserBubble({ text }: { text: string }) {
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

function AssistantBubble({
  answer, onFollowUp,
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

function TrendBadge({ badge }: { badge: string }) {
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

export default function AssistantPage() {
  return <AssistantContent />;
}
