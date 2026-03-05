"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ---------------------------------------------------------------------------
//  Types — mirror the backend's UserPublic Pydantic model
// ---------------------------------------------------------------------------

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image: string | null;
  auth_provider: string;
  created_at: string;
}

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthSession {
  user: SessionUser;
}

// ---------------------------------------------------------------------------
//  Context value
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** The current session, or `null` when not authenticated. */
  session: AuthSession | null;

  /** Convenience status string (matches the old NextAuth pattern). */
  status: SessionStatus;

  /**
   * Re-fetch the session from the BFF `/api/auth/me` endpoint.
   * Useful after login / signup to refresh the context without a full
   * page reload.
   */
  refreshSession: () => Promise<void>;

  /**
   * Log out by calling the BFF `/api/auth/logout` route (which clears
   * the HttpOnly cookie) and then resetting local state.
   */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
//  Hook — the public API that components use
// ---------------------------------------------------------------------------

/**
 * Access the current auth session.
 *
 * Must be used inside an `<AuthProvider>` tree.
 *
 * @example
 * ```tsx
 * const { session, status, logout } = useAuth();
 * if (status === "loading") return <Spinner />;
 * if (!session) return <LoginPrompt />;
 * return <p>Hello, {session.user.name}</p>;
 * ```
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth() must be used within an <AuthProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
//  Provider component
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * `<AuthProvider>` replaces the old NextAuth `<SessionProvider>`.
 *
 * On mount it calls the BFF `/api/auth/me` route to check whether the
 * browser has a valid `access_token` HttpOnly cookie.  If it does, the
 * backend returns the `UserPublic` payload and we store it in React
 * state.  If not (401), we set the status to `"unauthenticated"`.
 *
 * Wrap your root layout with this provider:
 *
 * ```tsx
 * // app/layout.tsx
 * import SessionProvider from "@/components/providers/SessionProvider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <SessionProvider>{children}</SessionProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export default function SessionProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  // ── Fetch session from BFF ───────────────────────────────────────

  const refreshSession = useCallback(async () => {
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include", // send the HttpOnly cookie
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const user: SessionUser = await res.json();
        setSession({ user });
        setStatus("authenticated");
      } else {
        // 401, 403, or any non-OK → not authenticated
        setSession(null);
        setStatus("unauthenticated");
      }
    } catch {
      // Network error — assume unauthenticated
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if the request fails, clear local state so the UI
      // reflects the logged-out state.  The cookie will expire
      // naturally on its own maxAge anyway.
    }

    setSession(null);
    setStatus("unauthenticated");
  }, []);

  // ── Initial session check on mount ───────────────────────────────

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // ── Memoize the context value to avoid unnecessary re-renders ────

  const value = useMemo<AuthContextValue>(
    () => ({ session, status, refreshSession, logout }),
    [session, status, refreshSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
