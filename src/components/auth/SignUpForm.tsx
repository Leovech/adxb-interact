"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { USER_TYPE_LABELS, UserType } from "@/lib/auth/session";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";

const INTEREST_CHIPS = [
  "Off-plan for flip",
  "Ready apartments for rental income",
  "High-yield studios",
  "Villas for family use",
  "Distress / below-market deals",
  "Long-term capital appreciation",
  "Portfolio diversification",
  "First home",
];

export default function SignUpForm() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("investor");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signUp({ email, password, name, userType, interests });
      window.location.href = "/account?welcome=1";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">I am a…</label>
          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value as UserType)}
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          >
            {(Object.entries(USER_TYPE_LABELS) as [UserType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>{label}</option>
              )
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold text-muted">
          What are you looking for? (optional)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {INTEREST_CHIPS.map((tag) => {
            const active = interests.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleInterest(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-background"
                    : "border-card-border bg-card-bg text-muted hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          We use this to surface relevant recommendations on the Market Analysis page.
        </p>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-negative/40 bg-negative/10 px-3 py-2 text-xs text-negative">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Create account
      </button>

      <p className="rounded-lg bg-accent/5 px-3 py-2 text-[11px] text-muted">
        <strong className="text-accent">Demo mode:</strong> your account lives only
        in this browser right now. A proper auth + DB will ship in Phase 2.
      </p>

      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <a href="/sign-in" className="font-semibold text-accent hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
