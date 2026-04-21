"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

export default function SignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signIn(email, password);
      window.location.href = "/account";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          placeholder="••••••"
          autoComplete="current-password"
          minLength={1}
        />
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
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Sign in
      </button>

      <p className="rounded-lg bg-accent/5 px-3 py-2 text-[11px] text-muted">
        <strong className="text-accent">Demo mode:</strong> any email + password
        will work. Real authentication will ship in the next phase.
      </p>

      <p className="text-center text-xs text-muted">
        New here?{" "}
        <a href="/sign-up" className="font-semibold text-accent hover:underline">
          Create an account
        </a>
      </p>
    </form>
  );
}
