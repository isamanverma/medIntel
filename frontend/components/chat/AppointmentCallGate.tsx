"use client";

/**
 * AppointmentCallGate
 *
 * Checks call eligibility for a single appointment and — if the window is
 * open — renders a `<VideoCallButton>` pre-wired with the other party's
 * CometChat UID.
 *
 * Eligibility is polled every 60 seconds to automatically show / hide the
 * button as the window opens and closes.
 *
 * Precondition: `useCometChatSession` must be `isReady` in the ancestor
 *   tree (checked via the `sessionReady` prop) so we never show the button
 *   before the SDK is initialised.
 */

import { useCallback, useEffect, useState } from "react";

import type { CallEligibilityResponse } from "@/lib/api-client";
import { Clock } from "lucide-react";
import type { CometChat } from "@cometchat/chat-sdk-javascript";
import type { VideoCallButtonProps } from "./VideoCallButton";
import dynamic from "next/dynamic";
import { getCallEligibility } from "@/lib/api-client";

const VideoCallButton = dynamic<VideoCallButtonProps>(
  () => import("./VideoCallButton").then((m) => ({ default: m.VideoCallButton })),
  { ssr: false },
);

export interface AppointmentCallGateProps {
  appointmentId: string;
  /**
   * Fallback display name used on the button while the eligibility response
   * is loading or when `other_party_name` is absent.
   */
  fallbackName: string;
  /**
   * Whether the CometChat session is ready (SDK initialised + logged in).
   * Gate the button so it is never interactive before the SDK is ready.
   */
  sessionReady: boolean;
  /** Fired when a call has been successfully initiated (optional). */
  onCallInitiated?: (call: CometChat.Call) => void;
  /** Optional error handler (e.g. surface a toast). */
  onError?: (message: string) => void;
}

export function AppointmentCallGate({
  appointmentId,
  fallbackName,
  sessionReady,
  onCallInitiated = () => {},
  onError,
}: AppointmentCallGateProps) {
  const [eligibility, setEligibility] =
    useState<CallEligibilityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const checkEligibility = useCallback(async () => {
    try {
      const res = await getCallEligibility(appointmentId);
      setEligibility(res);
    } catch {
      // Swallow — gate simply renders nothing on error
      setEligibility(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    checkEligibility();
    // Re-check every 60 s so the button appears/disappears as the window opens
    const timer = setInterval(checkEligibility, 60_000);
    return () => clearInterval(timer);
  }, [checkEligibility]);

  // Nothing to show yet
  if (loading || !eligibility) return null;

  // Ineligible — show contextual hints
  if (!eligibility.eligible) {
    const r = eligibility.reason.toLowerCase();

    // Call window is upcoming — show a friendly date label
    if (r === "call_window_future" || r.startsWith("call window opens in")) {
      const apptDate = new Date(eligibility.scheduled_time);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      let label: string;
      if (sameDay(apptDate, tomorrow)) {
        label = "Call opens tomorrow";
      } else {
        label = `Call opens ${apptDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }

      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <Clock className="h-3 w-3" />
          {label}
        </span>
      );
    }

    // Appointment is still PENDING — waiting for the other party to confirm
    if (r.includes("pending") || r.includes("not confirmed")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          Awaiting confirmation
        </span>
      );
    }

    // Window has passed or any other terminal reason — render nothing
    return null;
  }

  // Eligible — render the call button
  const receiverUid = eligibility.other_party_cometchat_uid;
  if (!receiverUid) return null;

  return (
    <VideoCallButton
      receiverUid={receiverUid}
      receiverName={eligibility.other_party_name ?? fallbackName}
      disabled={!sessionReady}
      onCallInitiated={onCallInitiated}
      onError={onError}
    />
  );
}
