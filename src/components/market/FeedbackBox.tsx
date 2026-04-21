"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Check, MessageSquare } from "lucide-react";

export type FeedbackSentiment = "up" | "down";

export interface StoredFeedback {
  itemKey: string;
  sentiment: FeedbackSentiment;
  comment?: string;
  at: string;
}

const LS_KEY = "adxb-recommendation-feedback";

function loadAll(): Record<string, StoredFeedback> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, StoredFeedback>): void {
  window.localStorage.setItem(LS_KEY, JSON.stringify(map));
}

interface Props {
  /** Unique key per recommendation — e.g. project|bedrooms */
  itemKey: string;
  /** Context sent with the feedback, useful when we later ship to the API */
  context?: Record<string, unknown>;
}

export default function FeedbackBox({ itemKey, context }: Props) {
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const existing = loadAll()[itemKey];
    if (existing) {
      setSentiment(existing.sentiment);
      setComment(existing.comment ?? "");
    }
  }, [itemKey]);

  const handleSentiment = (s: FeedbackSentiment) => {
    setSentiment(s);
    setShowComment(true);
    persist(s, comment);
  };

  const persist = async (s: FeedbackSentiment, c: string) => {
    const entry: StoredFeedback = {
      itemKey,
      sentiment: s,
      comment: c || undefined,
      at: new Date().toISOString(),
    };
    const all = loadAll();
    all[itemKey] = entry;
    saveAll(all);

    // Fire-and-forget to the (stubbed) backend. Failure is ok in demo mode —
    // we still have it in localStorage.
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_key: itemKey,
          sentiment: s,
          comment: c,
          context,
        }),
      });
      setSaved(true);
      setSubmitError(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSubmitError("Saved locally — server sync failed.");
    }
  };

  const submitComment = () => {
    if (sentiment) persist(sentiment, comment);
  };

  return (
    <div className="rounded-lg border border-card-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>What do you think of this recommendation?</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSentiment("up")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              sentiment === "up"
                ? "border-positive bg-positive/15 text-positive"
                : "border-card-border text-muted hover:border-positive/40 hover:text-positive"
            }`}
            aria-label="Useful"
            title="Useful"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleSentiment("down")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              sentiment === "down"
                ? "border-negative bg-negative/15 text-negative"
                : "border-card-border text-muted hover:border-negative/40 hover:text-negative"
            }`}
            aria-label="Not useful"
            title="Not useful"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(showComment || sentiment) && (
        <div className="mt-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={submitComment}
            rows={2}
            placeholder={
              sentiment === "down"
                ? "What's off? (e.g. 'asking price is way higher than this', 'district is saturated')"
                : "What about this worked? (optional)"
            }
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px] text-muted">
              Stored locally for now — we'll aggregate feedback once the API is live.
            </p>
            {saved && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-positive">
                <Check className="h-3 w-3" /> Saved
              </p>
            )}
            {submitError && (
              <p className="text-[10px] text-muted">{submitError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
