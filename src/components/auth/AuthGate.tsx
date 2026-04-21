"use client";

/**
 * Gate a feature behind the auth/tier wall.
 *
 * Two modes:
 *  - `mode="hide"` — render nothing (or fallback) when the user lacks access
 *  - `mode="upsell"` — render an inline upsell card explaining how to unlock
 *
 * Keep in one place so the upsell style is consistent across the app.
 */

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { canAccess, Feature, requiredTier, TIER_PROMOS } from "@/lib/auth/gates";
import { Lock, Sparkles } from "lucide-react";

interface Props {
  feature: Feature;
  mode?: "hide" | "upsell";
  fallback?: ReactNode;
  children: ReactNode;
  /** Custom CTA text. Defaults to the tier's standard promo. */
  ctaText?: string;
  /** Where to send unauthenticated users. Defaults to /sign-in. */
  ctaHref?: string;
}

export default function AuthGate({
  feature,
  mode = "upsell",
  fallback,
  children,
  ctaText,
  ctaHref = "/sign-in",
}: Props) {
  const { user } = useAuth();
  const tier = user?.tier ?? "public";

  if (canAccess(feature, tier)) return <>{children}</>;

  if (mode === "hide") return <>{fallback ?? null}</>;

  const required = requiredTier(feature);
  const promo = TIER_PROMOS[required];

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card-bg to-card-bg p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
        {required === "pro" ? (
          <Sparkles className="h-5 w-5 text-accent" />
        ) : (
          <Lock className="h-5 w-5 text-accent" />
        )}
      </div>
      <p className="mb-1 text-sm font-semibold text-foreground">{promo.title}</p>
      <p className="mb-4 text-xs text-muted">
        {required === "pro"
          ? "This feature is part of the Pro plan (coming soon)."
          : "Create a free account to unlock this — takes 30 seconds."}
      </p>
      <a
        href={ctaHref}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
      >
        {ctaText ?? promo.cta}
      </a>
    </div>
  );
}
