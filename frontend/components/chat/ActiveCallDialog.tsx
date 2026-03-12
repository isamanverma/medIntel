"use client";

/**
 * ActiveCallDialog
 *
 * Renders the live CometChat video call session in a full-screen overlay.
 *
 * Flow:
 *  1. Lazily initialises the CometChatCalls WebRTC SDK (once per session).
 *  2. Generates a short-lived call token via `CometChatCalls.generateToken`.
 *  3. Starts the call session and mounts the CometChat call widget into a
 *     managed <div> container.
 *  4. Cleans up when the call ends or the user clicks "End call".
 */

import { AlertCircle, Loader2, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CometChat } from "@cometchat/chat-sdk-javascript";
import type { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import { cn } from "@/lib/utils";
import { getVideoToken } from "@/lib/api-client";

async function getCometChat() {
  const mod = await import("@cometchat/chat-sdk-javascript");
  return mod.CometChat;
}

async function getCometChatCalls() {
  const mod = await import("@cometchat/calls-sdk-javascript");
  return mod.CometChatCalls;
}

// ── Module-level Calls SDK init guard ────────────────────────────────────────
// Ensures `CometChatCalls.init` is only called once per browser session even
// if the component mounts/unmounts multiple times.

let callsSDKState: "uninit" | "initialising" | "ready" = "uninit";
let callsSDKInitPromise: Promise<void> | null = null;

async function ensureCallsSDKInit(
  appId: string,
  region: string,
): Promise<void> {
  if (callsSDKState === "ready") return;
  if (callsSDKInitPromise) return callsSDKInitPromise;

  callsSDKState = "initialising";
  callsSDKInitPromise = (async () => {
    const CometChatCalls = await getCometChatCalls();
    const settings = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(appId)
      .setRegion(region)
      .build();
    await CometChatCalls.init(settings);
    callsSDKState = "ready";
  })();

  try {
    await callsSDKInitPromise;
  } catch (err) {
    callsSDKState = "uninit";
    callsSDKInitPromise = null;
    throw err;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ActiveCallDialogProps {
  /** The CometChat Call object (contains sessionId) */
  call: CometChat.Call;
  /** Fired when the session ends — parent should set active call to null. */
  onCallEnded: () => void;
}

export function ActiveCallDialog({ call, onCallEnded }: ActiveCallDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionId = call.getSessionId();
  const [sessionState, setSessionState] = useState<
    "loading" | "active" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unmounted = false;

    (async () => {
      try {
        // 1. Always fetch a fresh backend token + canonical app config
        const tokenResp = await getVideoToken();
        if (unmounted) return;

        // 2. Ensure Calls SDK is initialised with backend-provided app settings
        await ensureCallsSDKInit(tokenResp.app_id, tokenResp.region);
        if (unmounted) return;

        // 3. Validate CometChat user session exists
        const CometChat = await getCometChat();
        const CometChatCalls = await getCometChatCalls();
        const user = await CometChat.getLoggedinUser();
        if (!user) {
          throw new Error("CometChat user session not ready.");
        }
        if (unmounted) return;

        // 4. Generate a call-specific token using a fresh backend auth token
        const callTokenResult = await CometChatCalls.generateToken(
          sessionId,
          tokenResp.auth_token,
        );
        if (unmounted || !containerRef.current) return;

        // 5. Configure the call listener (minimal, docs-style)
        const callListener = new CometChatCalls.OngoingCallListener({
          onCallEnded: () => {
            CometChat.clearActiveCall();
            try {
              CometChatCalls.endSession();
            } catch {
              // ignore end-session errors
            }
            onCallEnded();
          },
          onCallEndButtonPressed: () => {
            CometChat.endCall(sessionId).finally(() => {
              CometChat.clearActiveCall();
              try {
                CometChatCalls.endSession();
              } catch {
                // ignore end-session errors
              }
              onCallEnded();
            });
          },
          onError: (err) => {
            setError(err?.message ?? "An error occurred during the call.");
            setSessionState("error");
          },
        });

        // 6. Build default call settings and start the session
        const callSettings = new CometChatCalls.CallSettingsBuilder()
          .enableDefaultLayout(true)
          .setIsAudioOnlyCall(false)
          .startWithAudioMuted(false)
          .startWithVideoMuted(false)
          .setCallListener(callListener)
          .build();

        await CometChatCalls.startSession(
          callTokenResult.token,
          callSettings,
          containerRef.current,
        );
        if (unmounted) return;
        setSessionState("active");
      } catch (err: unknown) {
        if (unmounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to start call session.";
        setError(msg);
        setSessionState("error");
      }
    })();

    return () => {
      unmounted = true;
      // Best-effort cleanup — endSession is idempotent
      getCometChatCalls().then((CC) => {
        try { CC.endSession(); } catch { /* ignore */ }
      }).catch(() => {/* ignore */});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function handleForceEnd() {
    Promise.all([getCometChat(), getCometChatCalls()])
      .then(([CC, Calls]) => {
        CC.endCall(call.getSessionId()).finally(() => {
          CC.clearActiveCall();
          try { Calls.endSession(); } catch { /* ignore */ }
          onCallEnded();
        });
      })
      .catch(() => onCallEnded());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Active video call"
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* ── Loading overlay ── */}
      {sessionState === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Connecting…</p>
        </div>
      )}

      {/* ── Error overlay ── */}
      {sessionState === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/90 text-white">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium">
            {error ?? "Call failed. Please try again."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onCallEnded}
            className="text-white border-white hover:bg-white/10"
          >
            Close
          </Button>
        </div>
      )}

      {/* ── CometChat call widget container ── */}
      <div ref={containerRef} className="flex-1 w-full h-full" />

      {/* ── Fallback end-call button (sits below the call widget) ── */}
      <div
        className={cn(
          "flex justify-center pb-6 pt-4",
          sessionState !== "active" && "hidden",
        )}
      >
        <Button
          size="sm"
          variant="destructive"
          onClick={handleForceEnd}
          className="gap-2 shadow-lg"
        >
          <PhoneOff className="h-4 w-4" />
          End Call
        </Button>
      </div>
    </div>
  );
}
