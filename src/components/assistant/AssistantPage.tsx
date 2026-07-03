"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import PageGuide from "@/components/PageGuide";
import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";
import { AssistantAnswerCard, UserBubble } from "@/components/assistant/AssistantAnswerCard";
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
        <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-10 lg:px-8">
          <Skeleton className="mb-6 h-8 w-2/3" />
          <SkeletonPage cards={2} />
          <Skeleton className="mt-4 h-32 w-full" />
        </main>
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
              <AssistantAnswerCard key={m.id} answer={m.answer} onFollowUp={runQuery} />
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

export default function AssistantPage() {
  return <AssistantContent />;
}
