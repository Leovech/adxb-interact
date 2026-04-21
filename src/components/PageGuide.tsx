"use client";

import { useState, useEffect } from "react";
import { HelpCircle, ChevronDown, ChevronUp, X } from "lucide-react";

interface Step {
  icon: string;
  text: string;
}

interface PageGuideProps {
  /** Unique key for persisting dismiss state in localStorage */
  storageKey: string;
  /** One-line description shown in the collapsed header */
  title: string;
  /** 2-3 sentence explanation of what this page does */
  description: string;
  /** Short step-by-step instructions */
  steps: Step[];
  /** Optional feedback prompt shown at the bottom */
  feedbackNote?: string;
}

export default function PageGuide({
  storageKey,
  title,
  description,
  steps,
  feedbackNote,
}: PageGuideProps) {
  const lsKey = `adxb-guide-${storageKey}`;
  const [dismissed, setDismissed] = useState(true); // default hidden until mount
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(lsKey) === "1");
  }, [lsKey]);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(lsKey, "1");
  };

  const restore = () => {
    setDismissed(false);
    localStorage.removeItem(lsKey);
  };

  if (dismissed) {
    return (
      <button
        onClick={restore}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/15 print:hidden"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        How to use this page
      </button>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card-bg to-card-bg print:hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <HelpCircle className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {!expanded && (
              <p className="truncate text-xs text-muted">{description}</p>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
          )}
        </button>
        <button
          onClick={dismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-input-bg hover:text-foreground"
          title="Dismiss (click the ? button to bring it back)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-accent/15 px-5 py-4">
          <p className="mb-4 text-sm leading-relaxed text-foreground">
            {description}
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-lg border border-card-border bg-card-bg p-3"
              >
                <span className="mt-0.5 text-lg leading-none">{step.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    Step {i + 1}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {feedbackNote && (
            <div className="mt-4 rounded-lg bg-accent/10 px-4 py-2.5 text-xs leading-relaxed text-foreground">
              <span className="font-semibold text-accent">Feedback welcome!</span>{" "}
              {feedbackNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
