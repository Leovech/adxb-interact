"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Bot, ArrowUpRight } from "lucide-react";
import { AssistantAnswerCard, UserBubble } from "@/components/assistant/AssistantAnswerCard";
import { Transaction, Hierarchy } from "@/data/abu-dhabi";
import {
  buildAssistantContext,
  answerQuery,
  AssistantAnswer,
  AssistantContext,
} from "@/lib/assistant/query-engine";
import { SkeletonPage } from "@/components/ui/Skeleton";

type ChatMessage =
  | { role: "user"; id: string; text: string }
  | { role: "assistant"; id: string; answer: AssistantAnswer };

const EXAMPLE_QUERIES = [
  "Cheapest studio in Yas Island",
  "Best investment in Al Reem Island",
  "2BR with yield above 7%",
  "What's trending right now?",
];

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `landing-m${msgCounter}`;
}

interface Props {
  transactions: Transaction[];
  hierarchy: Hierarchy | null;
  loading: boolean;
}

/** Compact, fully working version of the AI assistant embedded directly on
 *  the landing page — the same query engine as /assistant, just a smaller
 *  shell so visitors can try a real question before ever navigating away. */
export default function LandingAssistant({ transactions, hierarchy, loading }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-card-bg">
      <div
        className="pointer-events-none absolute -inset-20 -z-10"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 60%)",
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-card-border px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
            <Sparkles className="h-4.5 w-4.5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Ask the AI assistant</h3>
            <p className="text-xs text-muted">Real answers from real ADREC data — try it now</p>
          </div>
        </div>
        <a
          href="/assistant"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Open full assistant <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="px-5 py-5 sm:px-7">
        {loading ? (
          <SkeletonPage cards={2} />
        ) : !context ? (
          <p className="rounded-lg border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
            Couldn&rsquo;t load market data for the assistant right now — try{" "}
            <a href="/assistant" className="text-accent link-underline">the full page</a> instead.
          </p>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="space-y-4 overflow-y-auto rounded-xl border border-card-border bg-background/40 p-4"
              style={{ minHeight: "220px", maxHeight: "420px" }}
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 px-2 py-6 text-center">
                  <Bot className="h-8 w-8 text-accent/60" />
                  <p className="max-w-sm text-sm text-muted">
                    Ask about prices, yields, trends, or the best places to invest.
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
          </>
        )}
      </div>
    </div>
  );
}
