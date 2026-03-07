/**
 * useChatPolling — visibility-aware delta polling hook for SecureChat.
 *
 * Improvements over a naive setInterval:
 *
 *  1. Delta-only fetches: passes `since=<lastTimestamp>` so the server only
 *     returns new messages. Zero-payload responses are the common case.
 *
 *  2. Chained setTimeout instead of setInterval: the next poll is scheduled
 *     only after the current one completes, so a slow network never causes
 *     queued-up back-to-back requests.
 *
 *  3. Visibility-aware: pauses automatically when the browser tab is hidden
 *     (document.visibilityState === "hidden") and resumes — with an immediate
 *     catch-up poll — when the tab becomes visible again.
 *
 *  4. Room-aware: clears and restarts the timer whenever `roomId` changes so
 *     switching rooms never leaks stale requests.
 *
 *  5. Stable callback ref: `onNewMessages` is stored in a ref so updating the
 *     parent's state-dispatch function never restarts the polling cycle.
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { getChatMessagesSince } from "@/lib/api-client";
import type { ChatMessage } from "@/lib/types";

// ---------------------------------------------------------------------------
//  Public interface
// ---------------------------------------------------------------------------

export interface UseChatPollingOptions {
  /** The room to poll.  Pass null/undefined to pause polling entirely. */
  roomId: string | null | undefined;

  /**
   * ISO-8601 timestamp of the most recent message already in local state.
   * The hook sends this as the `since` cursor so the server only returns
   * messages that arrived after this point.
   * Pass null to fetch everything (used after a room switch).
   */
  sinceTimestamp: string | null;

  /**
   * Called with the array of new messages whenever the poll returns one or
   * more results.  Never called with an empty array.
   * Stored in a ref internally, so changing this reference does not restart
   * the polling cycle.
   */
  onNewMessages: (messages: ChatMessage[]) => void;

  /**
   * Interval between the end of one poll and the start of the next.
   * Defaults to 5 000 ms (5 seconds).
   */
  intervalMs?: number;
}

// ---------------------------------------------------------------------------
//  Hook
// ---------------------------------------------------------------------------

export function useChatPolling({
  roomId,
  sinceTimestamp,
  onNewMessages,
  intervalMs = 5_000,
}: UseChatPollingOptions): void {
  // ── Stable refs ──────────────────────────────────────────────────────────

  // Keep the latest sinceTimestamp available inside the poll closure without
  // re-creating the closure every time it changes.
  const sinceRef = useRef<string | null>(sinceTimestamp);
  useEffect(() => {
    sinceRef.current = sinceTimestamp;
  }, [sinceTimestamp]);

  // Keep the latest callback without triggering effect restarts.
  const onNewMessagesRef = useRef(onNewMessages);
  useEffect(() => {
    onNewMessagesRef.current = onNewMessages;
  }, [onNewMessages]);

  // Whether the tab is currently visible.  Start as true — if the hook
  // mounts while the tab is hidden the visibilitychange listener will
  // flip this to false before the first poll fires.
  const isVisibleRef = useRef(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  // Timer handle so we can clear it on cleanup / room change.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flag set to true when the effect cleanup runs so that any in-flight
  // async poll knows to discard its result and not schedule the next tick.
  const cancelledRef = useRef(false);

  // ── Core poll function ────────────────────────────────────────────────────

  // poll is defined with useCallback so it has a stable identity as a
  // dependency of the main effect.  The actual work is driven by refs, so
  // it never needs to be recreated when props change.
  const poll = useCallback(async () => {
    // If the effect was torn down, stop the chain.
    if (cancelledRef.current) return;

    // Don't fire when the tab is hidden.
    if (!isVisibleRef.current) return;

    // If there is no active room, there's nothing to fetch.
    if (!roomId) return;

    try {
      // Only ask the server for messages newer than what we already have.
      // When sinceRef.current is null we fetch the full initial page (the
      // server handles that via the absence of the `since` param — but the
      // polling path should only be reached after an initial load, so null
      // here means "give me everything since the beginning", which is fine
      // for rooms that were just created and have no messages yet).
      const since = sinceRef.current ?? new Date(0).toISOString();
      const fresh = await getChatMessagesSince(roomId, since);

      if (!cancelledRef.current && fresh.length > 0) {
        onNewMessagesRef.current(fresh);
      }
    } catch {
      // Silently swallow poll errors.  The user keeps seeing their last
      // known state, which is better than flooding the UI with error
      // toasts every 5 seconds on a flaky connection.
    }

    // Schedule the next poll only after this one has fully completed.
    // This prevents request queue buildup on slow networks.
    if (!cancelledRef.current) {
      timerRef.current = setTimeout(poll, intervalMs);
    }
  }, [roomId, intervalMs]);
  // NOTE: `poll` intentionally omits sinceTimestamp and onNewMessages from
  // its deps — they are accessed via refs so the closure never goes stale
  // without re-creating the chain.

  // ── Main effect ───────────────────────────────────────────────────────────

  useEffect(() => {
    // Nothing to poll if there's no room.
    if (!roomId) return;

    // Reset the cancellation flag for this mount/room-change cycle.
    cancelledRef.current = false;

    // ── Visibility listener ──────────────────────────────────────────────

    function handleVisibilityChange() {
      const visible = document.visibilityState === "visible";
      isVisibleRef.current = visible;

      if (visible) {
        // Tab just became active.  Cancel any queued timer and poll
        // immediately so the user doesn't wait up to `intervalMs` to see
        // messages that arrived while they were away.
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        // Fire an immediate catch-up poll then restart the chain.
        poll();
      }
      // When the tab hides we don't need to clear the timer — the poll
      // function checks isVisibleRef at the top and skips the fetch, then
      // schedules the next tick.  This way the chain stays alive so it
      // can resume without any extra wiring when visibility returns.
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ── Initial delayed tick ─────────────────────────────────────────────
    // Start the first poll after one full interval.  The caller is expected
    // to have already performed the initial full load via getChatMessages(),
    // so we don't poll immediately on mount.
    timerRef.current = setTimeout(poll, intervalMs);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelledRef.current = true;

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [roomId, poll, intervalMs]);
  // Restarting the effect on roomId change ensures stale requests for the
  // previous room are cancelled and the new room starts a fresh chain.
}
