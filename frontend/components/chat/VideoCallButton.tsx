"use client";

/**
 * VideoCallButton
 *
 * Initiates an outgoing CometChat video call to a specific receiver.
 * Handles the loading state while the call is being initiated.
 *
 * Precondition: `useCometChatSession` must be `isReady` before this
 *   button is interactive — `AppointmentCallGate` enforces this.
 */

import { useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface VideoCallButtonProps {
  /** CometChat UID of the call recipient (= their app user UUID). */
  receiverUid: string;
  /** Human-readable name shown on the button tooltip. */
  receiverName: string;
  disabled?: boolean;
  className?: string;
  /** Fired when the call has been successfully initiated (but not yet answered). */
  onCallInitiated: (call: CometChat.Call) => void;
  /** Fired on initiation failure — pass a toast / error handler. */
  onError?: (message: string) => void;
}

export function VideoCallButton({
  receiverUid,
  receiverName,
  disabled = false,
  className,
  onCallInitiated,
  onError,
}: VideoCallButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleCall() {
    if (pending || disabled) return;
    setPending(true);
    try {
      const call = new CometChat.Call(
        receiverUid,
        CometChat.CALL_TYPE.VIDEO,
        CometChat.RECEIVER_TYPE.USER,
      );
      const initiated = await CometChat.initiateCall(call);
      onCallInitiated(initiated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not start call.";
      onError?.(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleCall}
      disabled={disabled || pending}
      title={`Video call ${receiverName}`}
      className={cn(
        "gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Video className="h-3.5 w-3.5" />
      )}
      {pending ? "Calling…" : "Video Call"}
    </Button>
  );
}
