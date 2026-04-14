"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, CheckCircle } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

type FormState = "form" | "sending" | "sent";

export default function ChatWidget() {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking the toggle button
        const target = e.target as HTMLElement;
        if (target.closest("[data-chat-toggle]")) return;
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setFormState("sending");

    // Simulate sending (in production, connect to an API endpoint)
    setTimeout(() => {
      // Store feedback locally for now
      const feedbacks = JSON.parse(localStorage.getItem("adxb-feedbacks") || "[]");
      feedbacks.push({
        name,
        email,
        message,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("adxb-feedbacks", JSON.stringify(feedbacks));

      setFormState("sent");
    }, 1000);
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setMessage("");
    setFormState("form");
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        data-chat-toggle
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
          isOpen
            ? "bg-card-border text-foreground end-6"
            : "bg-accent text-background hover:bg-accent-hover hover:scale-110 end-6"
        }`}
        style={{ right: undefined }}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 z-[60] w-[340px] animate-fade-in rounded-2xl border border-card-border bg-card-bg shadow-2xl shadow-black/30 end-6"
          style={{ right: undefined }}
        >
          {/* Header */}
          <div className="rounded-t-2xl bg-accent/10 px-5 py-4 border-b border-card-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20">
                <MessageCircle className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("chat_title")}
                </h3>
                <p className="text-[11px] text-muted">
                  {t("chat_subtitle")}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            {formState === "sent" ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-positive/10">
                  <CheckCircle className="h-7 w-7 text-positive" />
                </div>
                <h4 className="text-base font-bold text-foreground">
                  {t("chat_thank_you")}
                </h4>
                <p className="mt-2 text-xs text-muted leading-relaxed">
                  {t("chat_thank_you_msg")}
                </p>
                <button
                  onClick={handleReset}
                  className="mt-4 rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
                >
                  {t("chat_new_message")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("chat_name")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("chat_email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("chat_message")}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={3}
                    placeholder={t("chat_placeholder")}
                    className="w-full resize-none rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={formState === "sending"}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  {formState === "sending" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      {t("chat_send")}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
