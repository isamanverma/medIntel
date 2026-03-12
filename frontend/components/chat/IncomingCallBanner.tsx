"use client";

/**
 * IncomingCallBanner
 *
 * Mounts a global CometChat call listener.  Renders a fixed-position
 * notification card when:
 *   • An incoming video/audio call arrives (`onIncomingCallReceived`)
 *   • An outgoing call we placed is accepted (`onOutgoingCallAccepted`)
 *
 * The parent dashboard shell renders this once; it is not
 * appointment-specific.
 */

import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CometChat } from "@cometchat/chat-sdk-javascript";
import { cn } from "@/lib/utils";

async function getCometChat() {
  const mod = await import("@cometchat/chat-sdk-javascript");
  return mod.CometChat;
}

const LISTENER_ID = "med_intel_global_call_listener";

export interface IncomingCallBannerProps {
  /**
   * Fired when:
   *  a) the current user accepts an incoming call, OR
   *  b) the other party accepted an outgoing call we placed.
   * The call object has a valid `sessionId` — pass it to
   * `<ActiveCallDialog>`.
   */
  onCallAccepted: (call: CometChat.Call) => void;
  /** Fired when the user declines an incoming call (optional). */
  onCallRejected?: () => void;
}

export function IncomingCallBanner({
  onCallAccepted,
  onCallRejected,
}: IncomingCallBannerProps) {
  const [incomingCall, setIncomingCall] = useState<CometChat.Call | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Stable ref so we can use it inside the listener without re-registering
  const stableOnCallAccepted = useCallback(
    (call: CometChat.Call) => onCallAccepted(call),
    [onCallAccepted],
  );

  useEffect(() => {
    let mounted = true;
    getCometChat().then((CC) => {
      if (!mounted) return;
      CC.addCallListener(
        LISTENER_ID,
        new CC.CallListener({
          // Someone is calling us
          onIncomingCallReceived: (call: CometChat.Call) => {
            setIncomingCall(call);
          },
          // Caller cancelled before we answered
          onIncomingCallCancelled: () => {
            setIncomingCall(null);
          },
          // The other party accepted a call WE initiated
          onOutgoingCallAccepted: (call: CometChat.Call) => {
            stableOnCallAccepted(call);
          },
          // The other party rejected a call WE initiated
          onOutgoingCallRejected: () => {
            setIncomingCall(null);
          },
        }),
      );
    });

    return () => {
      mounted = false;
      getCometChat().then((CC) => CC.removeCallListener(LISTENER_ID));
    };
  }, [stableOnCallAccepted]);

  async function handleAccept() {
    if (!incomingCall || accepting) return;
    setAccepting(true);
    try {
      const CC = await getCometChat();
      const acceptedCall = await CC.acceptCall(incomingCall.getSessionId());
      setIncomingCall(null);
      stableOnCallAccepted(acceptedCall);
    } catch {
      setAccepting(false);
    }
  }

  async function handleReject() {
    if (!incomingCall || rejecting) return;
    setRejecting(true);
    try {
      const CC = await getCometChat();
      await CC.rejectCall(
        incomingCall.getSessionId(),
        CC.CALL_STATUS.REJECTED,
      );
      setIncomingCall(null);
      onCallRejected?.();
    } catch {
      setRejecting(false);
    }
  }

  if (!incomingCall) return null;

  const callerName = incomingCall.getCallInitiator().getName();

  return (
    <div
      role="alertdialog"
      aria-label={`Incoming video call from ${callerName}`}
      className={cn(
        "fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl border",
        "border-border bg-card px-4 py-3 shadow-2xl",
        "animate-in slide-in-from-top-2 duration-300",
      )}
    >
      {/* Caller avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Video className="h-5 w-5" />
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {callerName}
        </p>
        <p className="text-xs text-muted-foreground">Incoming video call</p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={accepting || rejecting}
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Phone className="h-3.5 w-3.5" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReject}
          disabled={accepting || rejecting}
          className="gap-1.5"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          Decline
        </Button>
      </div>
    </div>
  );
}
