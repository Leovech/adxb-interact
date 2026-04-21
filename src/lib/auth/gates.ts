/**
 * Feature gates. Single source of truth for "who can see what".
 *
 * Pages and components call `canAccess(feature, userTier)` instead of
 * hardcoding tier checks, so tier rules change in one place.
 *
 * Current policy (demo phase):
 *   public:     dashboard, trends, mls, mls/report, market-analysis
 *   registered: + watchlist, alerts, feedback history
 *   pro:        + saved recommendations, portfolio tracker
 */

import { UserTier } from "./session";

export type Feature =
  | "dashboard"
  | "trends"
  | "mls_compare"
  | "investor_report"
  | "market_analysis"
  | "feedback_submit"
  | "watchlist"
  | "alerts"
  | "saved_recommendations"
  | "portfolio_tracker"
  | "export_data";

const TIER_ORDER: UserTier[] = ["public", "registered", "pro"];

/**
 * Minimum tier required for each feature. Add new features here.
 * During the demo most things are `public` so friends can explore without
 * signing in.
 */
export const FEATURE_MIN_TIER: Record<Feature, UserTier> = {
  // Public — available to everyone during the demo phase
  dashboard: "public",
  trends: "public",
  mls_compare: "public",
  investor_report: "public",
  market_analysis: "public",
  feedback_submit: "public",

  // Registered — require an account (stubbed today)
  watchlist: "registered",
  alerts: "registered",
  saved_recommendations: "registered",
  export_data: "registered",

  // Pro — future paid tier
  portfolio_tracker: "pro",
};

export function canAccess(feature: Feature, tier: UserTier | null): boolean {
  const required = FEATURE_MIN_TIER[feature];
  const userIdx = tier ? TIER_ORDER.indexOf(tier) : 0;
  const reqIdx = TIER_ORDER.indexOf(required);
  return userIdx >= reqIdx;
}

export function requiredTier(feature: Feature): UserTier {
  return FEATURE_MIN_TIER[feature];
}

/**
 * Human-readable reason shown on the upsell card when a feature is gated.
 */
export const TIER_PROMOS: Record<UserTier, { title: string; cta: string }> = {
  public: { title: "Available for everyone", cta: "" },
  registered: {
    title: "Sign in to unlock this",
    cta: "Sign in / create account — free",
  },
  pro: {
    title: "Part of the Pro plan",
    cta: "Upgrade to Pro",
  },
};
