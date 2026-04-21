/**
 * Session + user model.
 *
 * Today: stubbed localStorage-backed identity. No real security, no hashing,
 * no server-side session — the goal here is to lock down the shape of User
 * and the interface surface (signIn / signUp / signOut / useAuth) so that
 * when we swap in Auth.js (NextAuth v5) or Clerk in Phase 2 the call sites
 * on every page don't change.
 *
 * Migration path:
 *   1. Install `next-auth@beta` and `@auth/prisma-adapter`.
 *   2. Add `src/auth.ts` with NextAuth config + providers.
 *   3. Replace the body of `signIn/signUp/signOut` with NextAuth calls.
 *   4. Replace `useAuth` with a wrapper around `useSession()`.
 *   5. Leave every component untouched.
 */

export type UserType = "investor" | "broker" | "agent" | "developer" | "other";
export type UserTier = "public" | "registered" | "pro";

export interface User {
  id: string;
  email: string;
  name?: string;
  userType: UserType;
  /** Free-text "what I'm looking for" captured at signup. */
  interests: string[];
  /** Preferred districts / property types, for personalized recommendations. */
  preferredDistricts: string[];
  preferredPropertyTypes: string[];
  preferredBedrooms: string[];
  tier: UserTier;
  createdAt: string;
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  investor: "Investor",
  broker: "Broker",
  agent: "Agent",
  developer: "Developer",
  other: "Other",
};

export const USER_TIER_LABELS: Record<UserTier, string> = {
  public: "Public",
  registered: "Registered",
  pro: "Pro",
};

export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}

const STORAGE_KEY = "adxb-session-v1";

/**
 * Read the current session from localStorage. Returns null on SSR or when
 * no user is signed in.
 */
export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// --- stub API --------------------------------------------------------------

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function newSession(user: User): Session {
  // 30-day sliding expiry — good enough for a stub.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return {
    user,
    token: uid("tok"),
    expiresAt: expiresAt.toISOString(),
  };
}

export interface SignUpInput {
  email: string;
  password: string;
  name?: string;
  userType: UserType;
  interests?: string[];
  preferredDistricts?: string[];
  preferredPropertyTypes?: string[];
  preferredBedrooms?: string[];
}

/**
 * Stubbed sign-up. Creates a User locally. A real implementation hits
 * `/api/auth/signup` which hashes the password and inserts a row.
 */
export async function stubSignUp(input: SignUpInput): Promise<Session> {
  if (!input.email.includes("@")) throw new Error("Invalid email");
  if (input.password.length < 6) throw new Error("Password must be ≥6 characters");

  const user: User = {
    id: uid("usr"),
    email: input.email.toLowerCase(),
    name: input.name,
    userType: input.userType,
    interests: input.interests ?? [],
    preferredDistricts: input.preferredDistricts ?? [],
    preferredPropertyTypes: input.preferredPropertyTypes ?? [],
    preferredBedrooms: input.preferredBedrooms ?? [],
    tier: "registered",
    createdAt: new Date().toISOString(),
  };
  const session = newSession(user);
  writeSession(session);
  return session;
}

/**
 * Stubbed sign-in. Any non-empty email+password works — this is a demo.
 * Real implementation verifies bcrypt hash in DB.
 */
export async function stubSignIn(email: string, password: string): Promise<Session> {
  if (!email.includes("@")) throw new Error("Invalid email");
  if (password.length < 1) throw new Error("Password required");

  // If a previous session exists for this email, reuse the user record so
  // preferences persist across sign-in/out in the demo.
  const prev = readSession();
  if (prev && prev.user.email === email.toLowerCase()) {
    const session = newSession(prev.user);
    writeSession(session);
    return session;
  }

  const user: User = {
    id: uid("usr"),
    email: email.toLowerCase(),
    userType: "investor",
    interests: [],
    preferredDistricts: [],
    preferredPropertyTypes: [],
    preferredBedrooms: [],
    tier: "registered",
    createdAt: new Date().toISOString(),
  };
  const session = newSession(user);
  writeSession(session);
  return session;
}

export function stubSignOut(): void {
  clearSession();
}

export function updateCurrentUser(patch: Partial<User>): Session | null {
  const current = readSession();
  if (!current) return null;
  const updated: Session = {
    ...current,
    user: { ...current.user, ...patch },
  };
  writeSession(updated);
  return updated;
}
