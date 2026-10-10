"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";
import { getSupabaseEnv } from "./config";

type AuthState = {
  status: "loading" | "ready";
  user: User | null;
  session: Session | null;
  configured: boolean;
};

type AuthContextValue = AuthState & {
  /** Sign out the current user. No-op when there is no session. */
  signOut: () => Promise<void>;
  /** Force a refresh of the auth state. Useful after server actions. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provides the current session to client components.
 *
 * The provider always renders — it never throws when Supabase is
 * not configured. Consumers can read `configured` to decide
 * whether to display the live UI or a "service not configured"
 * state. The initial state is `loading` so we don't flash a
 * logged-out state during hydration.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    session: null,
    configured: getSupabaseEnv() !== null,
  });

  const refresh = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setState({
        status: "ready",
        user: null,
        session: null,
        configured: false,
      });
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (error) {
      setState({
        status: "ready",
        user: null,
        session: null,
        configured: true,
      });
      return;
    }
    setState({
      status: "ready",
      user: data.session?.user ?? null,
      session: data.session ?? null,
      configured: true,
    });
  }, []);

  useEffect(() => {
    const configured = getSupabaseEnv() !== null;
    if (!configured) {
      setState({
        status: "ready",
        user: null,
        session: null,
        configured: false,
      });
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setState({
        status: "ready",
        user: null,
        session: null,
        configured: false,
      });
      return;
    }
    refresh();
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setState({
        status: "ready",
        user: session?.user ?? null,
        session,
        configured: true,
      });
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    await client.auth.signOut();
    setState({
      status: "ready",
      user: null,
      session: null,
      configured: true,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, refresh, signOut }),
    [state, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
