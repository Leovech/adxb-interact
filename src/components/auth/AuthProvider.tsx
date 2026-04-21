"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Session,
  User,
  readSession,
  stubSignIn,
  stubSignUp,
  stubSignOut,
  updateCurrentUser,
  SignUpInput,
} from "@/lib/auth/session";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const s = readSession();
    setSession(s);
    setStatus(s ? "authenticated" : "unauthenticated");
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const s = await stubSignIn(email, password);
    setSession(s);
    setStatus("authenticated");
    return s.user;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const s = await stubSignUp(input);
    setSession(s);
    setStatus("authenticated");
    return s.user;
  }, []);

  const signOut = useCallback(() => {
    stubSignOut();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    const s = updateCurrentUser(patch);
    if (s) setSession(s);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
      updateUser,
    }),
    [status, session, signIn, signUp, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Provide a sensible fallback so pages that forget to wrap with the
    // provider don't crash — they'll just see "unauthenticated".
    return {
      status: "unauthenticated",
      user: null,
      signIn: async () => { throw new Error("AuthProvider missing"); },
      signUp: async () => { throw new Error("AuthProvider missing"); },
      signOut: () => {},
      updateUser: () => {},
    };
  }
  return ctx;
}
