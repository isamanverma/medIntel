"use client";

/**
 * useCometChatSession
 *
 * Tied to the <AuthProvider> / SessionProvider session lifecycle:
 *   • When the user is authenticated  → initialise CometChat SDK, login with backend-issued token
 *   • When the user logs out          → logout of CometChat and tear down the SDK state
 *
 * Returns stable references so consumers can depend on `isReady` to gate
 * call operations.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { CometChat as CometChatType } from "@cometchat/chat-sdk-javascript";
import type { VideoTokenResponse } from "@/lib/api-client";
import { getVideoToken } from "@/lib/api-client";
import { useAuth } from "@/components/providers/SessionProvider";

// ---------------------------------------------------------------------------

export type CometChatSessionStatus =
  | "idle"        // not yet started (unauthenticated)
  | "initialising"// SDK init / login in progress
  | "ready"       // fully logged in, calls can be made
  | "error";      // initialisation failed

export interface CometChatSessionState {
  status: CometChatSessionStatus;
  /** The logged-in user's CometChat UID (= our app's user UUID string). */
  cometChatUid: string | null;
  /** The CometChat auth token — pass to the Calls SDK for session tokens. */
  authToken: string | null;
  /** True only when `status === "ready"`. Convenience alias. */
  isReady: boolean;
  /** Set when initialisation failed. */
  error: string | null;
  /** Re-trigger the init sequence (e.g. after a network error). */
  retry: () => void;
}

// ---------------------------------------------------------------------------
//  Module-level init guard so we never call CometChat.init() twice in
//  the same browser session (React Strict Mode double-invoke protection).
// ---------------------------------------------------------------------------

type SDKState = "uninit" | "initialising" | "ready";
let sdkState: SDKState = "uninit";
// Store the init promise so concurrent callers can await the same result
let sdkInitPromise: Promise<boolean> | null = null;

async function getCometChat(): Promise<typeof CometChatType> {
  const mod = await import("@cometchat/chat-sdk-javascript");
  return mod.CometChat;
}

async function ensureSDKInit(appId: string, region: string): Promise<boolean> {
  if (sdkState === "ready") return true;
  if (sdkInitPromise) return sdkInitPromise;

  sdkState = "initialising";
  sdkInitPromise = (async () => {
    const CometChat = await getCometChat();
    const appSettings = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(region)
      .autoEstablishSocketConnection(true)
      .build();

    const success: boolean = await CometChat.init(appId, appSettings);
    if (success) {
      sdkState = "ready";
    } else {
      sdkState = "uninit";
      sdkInitPromise = null;
    }
    return success;
  })();

  return sdkInitPromise;
}

// ---------------------------------------------------------------------------
//  Hook
// ---------------------------------------------------------------------------

export function useCometChatSession(): CometChatSessionState {
  const { session, status: authStatus } = useAuth();

  const [status, setStatus] = useState<CometChatSessionStatus>("idle");
  const [cometChatUid, setCometChatUid] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Avoid double-init races in Strict Mode
  const activeRef = useRef(true);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  useEffect(() => {
    // Not authenticated yet — nothing to do
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated" || !session) {
      setStatus("idle");
      setCometChatUid(null);
      setAuthToken(null);
      setError(null);

      // Log out of CometChat if the user signed out
      getCometChat()
        .then((CometChat) => CometChat.getLoggedinUser())
        .then((user) => {
          if (user) return getCometChat().then((CC) => CC.logout());
        })
        .catch(() => {/* ignore */});

      return;
    }

    // ── Authenticated ─────────────────────────────────────────────────────

    activeRef.current = true;
    setStatus("initialising");
    setError(null);

    const APP_ID =
      process.env.NEXT_PUBLIC_COMETCHAT_APP_ID ?? "";
    const REGION =
      process.env.NEXT_PUBLIC_COMETCHAT_REGION ?? "us";

    (async () => {
      try {
        // ── 1. Ensure SDK is initialised ──────────────────────────────────
        const initOk = await ensureSDKInit(APP_ID, REGION);
        if (!initOk) throw new Error("CometChat SDK failed to initialise.");
        if (!activeRef.current) return;

        // ── 2. Check if already logged in (reuse existing session) ────────
        const CometChat = await getCometChat();
        const existingUser = await CometChat.getLoggedinUser();
        if (activeRef.current && existingUser) {
          // Already logged in — fetch a fresh token for the Calls SDK
          const tokenResp: VideoTokenResponse = await getVideoToken();
          if (!activeRef.current) return;
          setCometChatUid(tokenResp.cometchat_uid);
          setAuthToken(tokenResp.auth_token);
          setStatus("ready");
          return;
        }

        // ── 3. Get an auth token from the backend (provisions CC user) ─────
        const tokenResp: VideoTokenResponse = await getVideoToken();
        if (!activeRef.current) return;

        // ── 4. Login to CometChat with the backend-issued auth token ───────
        await CometChat.login(tokenResp.auth_token);
        if (!activeRef.current) return;

        setCometChatUid(tokenResp.cometchat_uid);
        setAuthToken(tokenResp.auth_token);
        setStatus("ready");
      } catch (err: unknown) {
        if (!activeRef.current) return;
        const msg =
          err instanceof Error ? err.message : "CometChat session failed.";
        setError(msg);
        setStatus("error");
      }
    })();

    return () => {
      activeRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, retryToken]);

  return {
    status,
    cometChatUid,
    authToken,
    isReady: status === "ready",
    error,
    retry,
  };
}
