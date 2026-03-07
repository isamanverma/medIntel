"use client";

/**
 * SecureChat — Phase 5c rewrite
 *
 * Improvements over the original:
 *  - useReducer for atomic state transitions (optimistic send, confirm, fail)
 *  - Enriched sidebar: participant name, role badge, last-message preview,
 *    unread count, relative time label
 *  - Smart scroll: only auto-scrolls when already near the bottom, or when
 *    the current user sends a message; shows a "New messages ↓" badge otherwise
 *  - Optimistic messaging: message appears instantly with a "sending" indicator;
 *    replaced by the confirmed server message or marked "Failed · Retry"
 *  - User-search room creation: debounced combobox replaces the UUID text input
 *  - Load-more button for older messages (cursor pagination via `before` param)
 *  - System message pills: SYSTEM-type messages render as centred grey pills
 *    instead of chat bubbles
 *  - Visibility-aware polling via useChatPolling (imported from sibling file)
 *  - initialRoomId prop: parent dashboards can pre-select a room (e.g. from
 *    a "Chat with Patient" button)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ChevronUp,
  Info,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/components/providers/SessionProvider";
import {
  createChatRoom,
  deleteChatMessage,
  getChatMessages,
  getChatMessagesPage,
  getChatRooms,
  markRoomRead,
  searchChatUsers,
  sendChatMessage,
} from "@/lib/api-client";
import {
  formatChatTime,
  isOptimistic,
  type ChatMessage,
  type ChatRoomEnriched,
  type ChatUserResult,
  type DisplayMessage,
  type OptimisticMessage,
} from "@/lib/types";

import { useChatPolling } from "./useChatPolling";

// ─────────────────────────────────────────────────────────────────────────────
//  Component props
// ─────────────────────────────────────────────────────────────────────────────

export interface SecureChatProps {
  /**
   * When provided, the chat component will switch to this room immediately
   * after loading.  Passed by the doctor/patient dashboard when the user
   * clicks a "Chat with …" button on the patient/doctor list.
   */
  initialRoomId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  State shape & reducer
// ─────────────────────────────────────────────────────────────────────────────

interface ChatState {
  rooms: ChatRoomEnriched[];
  activeRoomId: string | null;
  /** Per-room confirmed message cache. */
  messagesByRoom: Record<string, ChatMessage[]>;
  /** Per-room optimistic (pending / failed) messages. */
  pendingByRoom: Record<string, OptimisticMessage[]>;
  /** Rooms for which we have loaded at least one page of messages. */
  loadedRooms: Set<string>;
  /** Rooms for which the server returned a full page (hasMore = true). */
  hasMoreByRoom: Record<string, boolean>;
  /** Whether the initial room list is being fetched. */
  initialLoading: boolean;
  /** Per-room message-area loading state. */
  roomLoading: Record<string, boolean>;
  /** Per-room "loading older" state (load-more button). */
  loadingMoreByRoom: Record<string, boolean>;
  ui: {
    showNewRoom: boolean;
  };
}

type ChatAction =
  | { type: "ROOMS_LOADED"; rooms: ChatRoomEnriched[] }
  | { type: "ROOM_PREPENDED"; room: ChatRoomEnriched }
  | { type: "ROOM_SELECTED"; roomId: string }
  | { type: "ROOM_LOADING"; roomId: string }
  | {
      type: "MESSAGES_LOADED";
      roomId: string;
      messages: ChatMessage[];
      limit: number;
    }
  | {
      type: "MESSAGES_PREPENDED";
      roomId: string;
      messages: ChatMessage[];
      hasMore: boolean;
    }
  | { type: "MESSAGES_APPENDED"; roomId: string; messages: ChatMessage[] }
  | { type: "MESSAGE_PENDING"; roomId: string; msg: OptimisticMessage }
  | {
      type: "MESSAGE_CONFIRMED";
      roomId: string;
      tempId: string;
      real: ChatMessage;
    }
  | { type: "MESSAGE_FAILED"; roomId: string; tempId: string }
  | { type: "MESSAGE_RETRIED"; roomId: string; tempId: string }
  | { type: "MESSAGE_DELETED"; roomId: string; msgId: string }
  | { type: "ROOM_MARKED_READ"; roomId: string }
  | { type: "LOADING_MORE"; roomId: string; value: boolean }
  | { type: "UI_TOGGLE_NEW_ROOM"; value: boolean };

const PAGE_SIZE = 50;

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "ROOMS_LOADED":
      return {
        ...state,
        rooms: action.rooms,
        initialLoading: false,
      };

    case "ROOM_PREPENDED": {
      // If the room already exists (idempotent create), just update it
      const exists = state.rooms.some((r) => r.id === action.room.id);
      const rooms = exists
        ? state.rooms.map((r) => (r.id === action.room.id ? action.room : r))
        : [action.room, ...state.rooms];
      return { ...state, rooms };
    }

    case "ROOM_SELECTED":
      return { ...state, activeRoomId: action.roomId };

    case "ROOM_LOADING":
      return {
        ...state,
        roomLoading: { ...state.roomLoading, [action.roomId]: true },
      };

    case "MESSAGES_LOADED": {
      const reversed = [...action.messages]; // already oldest-first from server
      return {
        ...state,
        messagesByRoom: { ...state.messagesByRoom, [action.roomId]: reversed },
        loadedRooms: new Set([...state.loadedRooms, action.roomId]),
        roomLoading: { ...state.roomLoading, [action.roomId]: false },
        hasMoreByRoom: {
          ...state.hasMoreByRoom,
          [action.roomId]: action.messages.length >= action.limit,
        },
      };
    }

    case "MESSAGES_PREPENDED": {
      const existing = state.messagesByRoom[action.roomId] ?? [];
      // Deduplicate by id
      const existingIds = new Set(existing.map((m) => m.id));
      const fresh = action.messages.filter((m) => !existingIds.has(m.id));
      return {
        ...state,
        messagesByRoom: {
          ...state.messagesByRoom,
          [action.roomId]: [...fresh, ...existing],
        },
        loadingMoreByRoom: {
          ...state.loadingMoreByRoom,
          [action.roomId]: false,
        },
        hasMoreByRoom: {
          ...state.hasMoreByRoom,
          [action.roomId]: action.hasMore,
        },
      };
    }

    case "MESSAGES_APPENDED": {
      const existing = state.messagesByRoom[action.roomId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const fresh = action.messages.filter((m) => !existingIds.has(m.id));
      if (fresh.length === 0) return state;
      return {
        ...state,
        messagesByRoom: {
          ...state.messagesByRoom,
          [action.roomId]: [...existing, ...fresh],
        },
      };
    }

    case "MESSAGE_PENDING": {
      const existing = state.pendingByRoom[action.roomId] ?? [];
      return {
        ...state,
        pendingByRoom: {
          ...state.pendingByRoom,
          [action.roomId]: [...existing, action.msg],
        },
      };
    }

    case "MESSAGE_CONFIRMED": {
      const pending = (state.pendingByRoom[action.roomId] ?? []).filter(
        (m) => m.tempId !== action.tempId,
      );
      const confirmed = state.messagesByRoom[action.roomId] ?? [];
      // Avoid double-adding if the poll already picked up this message
      const alreadyIn = confirmed.some((m) => m.id === action.real.id);
      return {
        ...state,
        pendingByRoom: { ...state.pendingByRoom, [action.roomId]: pending },
        messagesByRoom: {
          ...state.messagesByRoom,
          [action.roomId]: alreadyIn ? confirmed : [...confirmed, action.real],
        },
      };
    }

    case "MESSAGE_FAILED": {
      const pending = (state.pendingByRoom[action.roomId] ?? []).map((m) =>
        m.tempId === action.tempId ? { ...m, status: "failed" as const } : m,
      );
      return {
        ...state,
        pendingByRoom: { ...state.pendingByRoom, [action.roomId]: pending },
      };
    }

    case "MESSAGE_RETRIED": {
      const pending = (state.pendingByRoom[action.roomId] ?? []).map((m) =>
        m.tempId === action.tempId ? { ...m, status: "sending" as const } : m,
      );
      return {
        ...state,
        pendingByRoom: { ...state.pendingByRoom, [action.roomId]: pending },
      };
    }

    case "MESSAGE_DELETED": {
      const msgs = (state.messagesByRoom[action.roomId] ?? []).map((m) =>
        m.id === action.msgId
          ? { ...m, is_deleted: true, content: "[message deleted]" }
          : m,
      );
      return {
        ...state,
        messagesByRoom: { ...state.messagesByRoom, [action.roomId]: msgs },
      };
    }

    case "ROOM_MARKED_READ": {
      // Zero the unread badge locally without waiting for a re-fetch
      const rooms = state.rooms.map((r) =>
        r.id === action.roomId ? { ...r, unread_count: 0 } : r,
      );
      return { ...state, rooms };
    }

    case "LOADING_MORE":
      return {
        ...state,
        loadingMoreByRoom: {
          ...state.loadingMoreByRoom,
          [action.roomId]: action.value,
        },
      };

    case "UI_TOGGLE_NEW_ROOM":
      return { ...state, ui: { ...state.ui, showNewRoom: action.value } };

    default:
      return state;
  }
}

const initialState: ChatState = {
  rooms: [],
  activeRoomId: null,
  messagesByRoom: {},
  pendingByRoom: {},
  loadedRooms: new Set(),
  hasMoreByRoom: {},
  initialLoading: true,
  roomLoading: {},
  loadingMoreByRoom: {},
  ui: { showNewRoom: false },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────

export function SecureChat({ initialRoomId }: SecureChatProps = {}) {
  const { session } = useAuth();
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [draft, setDraft] = useState("");
  const [showScrollBadge, setShowScrollBadge] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // ── Derived helpers ────────────────────────────────────────────────────────

  const activeRoom = useMemo(
    () => state.rooms.find((r) => r.id === state.activeRoomId) ?? null,
    [state.rooms, state.activeRoomId],
  );

  const confirmedMessages: ChatMessage[] =
    (state.activeRoomId ? state.messagesByRoom[state.activeRoomId] : null) ??
    [];

  const pendingMessages: OptimisticMessage[] =
    (state.activeRoomId ? state.pendingByRoom[state.activeRoomId] : null) ?? [];

  /** Full ordered display list: confirmed real messages then optimistic ones. */
  const displayMessages: DisplayMessage[] = [
    ...confirmedMessages,
    ...pendingMessages,
  ];

  const isRoomLoading = state.activeRoomId
    ? (state.roomLoading[state.activeRoomId] ?? false)
    : false;

  const isLoadingMore = state.activeRoomId
    ? (state.loadingMoreByRoom[state.activeRoomId] ?? false)
    : false;

  const hasMoreMessages = state.activeRoomId
    ? (state.hasMoreByRoom[state.activeRoomId] ?? false)
    : false;

  /** ISO timestamp of the last confirmed message — used as the polling cursor. */
  const lastMessageTimestamp = confirmedMessages.length
    ? confirmedMessages[confirmedMessages.length - 1].created_at
    : null;

  const totalUnread = state.rooms.reduce(
    (sum, r) => sum + (r.unread_count ?? 0),
    0,
  );

  // ── Initial data load ──────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const rooms = await getChatRooms();
        dispatch({ type: "ROOMS_LOADED", rooms });

        // Pre-select: prefer initialRoomId, then the first room
        const target = initialRoomId ?? rooms[0]?.id ?? null;
        if (target) {
          dispatch({ type: "ROOM_SELECTED", roomId: target });
        }
      } catch {
        dispatch({ type: "ROOMS_LOADED", rooms: [] });
      }
    })();
  }, [initialRoomId]);

  // ── Load messages when active room changes ─────────────────────────────────

  useEffect(() => {
    if (!state.activeRoomId) return;
    const roomId = state.activeRoomId;

    // Skip if already loaded (cache hit)
    if (state.loadedRooms.has(roomId)) {
      // Still mark as read
      markRoomRead(roomId).catch(() => {});
      dispatch({ type: "ROOM_MARKED_READ", roomId });
      return;
    }

    dispatch({ type: "ROOM_LOADING", roomId });

    (async () => {
      try {
        const msgs = await getChatMessages(roomId);
        dispatch({
          type: "MESSAGES_LOADED",
          roomId,
          messages: msgs,
          limit: PAGE_SIZE,
        });
        markRoomRead(roomId).catch(() => {});
        dispatch({ type: "ROOM_MARKED_READ", roomId });
      } catch {
        dispatch({
          type: "MESSAGES_LOADED",
          roomId,
          messages: [],
          limit: PAGE_SIZE,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeRoomId]);

  // ── Smart scroll logic ─────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < 120;
    if (isAtBottomRef.current) setShowScrollBadge(false);
  }

  // Scroll when messages change: only if already near the bottom or the last
  // message was sent by the current user.
  useEffect(() => {
    if (!displayMessages.length) return;
    const last = displayMessages[displayMessages.length - 1];
    const isMyMsg = isOptimistic(last)
      ? last.sender_id === session?.user.id
      : last.sender_id === session?.user.id;

    if (isAtBottomRef.current || isMyMsg) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollBadge(false);
    } else {
      setShowScrollBadge(true);
    }
    // Only re-run when the count changes, not on every referential update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMessages.length]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    isAtBottomRef.current = true;
    setShowScrollBadge(false);
    // Also mark room as read when user manually scrolls down
    if (state.activeRoomId) {
      markRoomRead(state.activeRoomId).catch(() => {});
      dispatch({ type: "ROOM_MARKED_READ", roomId: state.activeRoomId });
    }
  }

  // ── Polling ────────────────────────────────────────────────────────────────

  const handleNewMessages = useCallback(
    (fresh: ChatMessage[]) => {
      if (!state.activeRoomId) return;
      dispatch({
        type: "MESSAGES_APPENDED",
        roomId: state.activeRoomId,
        messages: fresh,
      });
      // If the user is at the bottom, mark the room as read
      if (isAtBottomRef.current) {
        markRoomRead(state.activeRoomId).catch(() => {});
        dispatch({ type: "ROOM_MARKED_READ", roomId: state.activeRoomId });
      }
    },
    [state.activeRoomId],
  );

  useChatPolling({
    roomId: state.activeRoomId,
    sinceTimestamp: lastMessageTimestamp,
    onNewMessages: handleNewMessages,
    intervalMs: 5_000,
  });

  // ── Send message ───────────────────────────────────────────────────────────

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !state.activeRoomId) return;

    const content = draft.trim();
    const tempId = crypto.randomUUID();
    const roomId = state.activeRoomId;

    setDraft("");

    const optimistic: OptimisticMessage = {
      tempId,
      room_id: roomId,
      sender_id: session?.user.id ?? "",
      sender_name: session?.user.name ?? null,
      content,
      created_at: new Date().toISOString(),
      is_deleted: false,
      message_type: "TEXT",
      status: "sending",
    };

    dispatch({ type: "MESSAGE_PENDING", roomId, msg: optimistic });

    try {
      const real = await sendChatMessage(roomId, content);
      dispatch({ type: "MESSAGE_CONFIRMED", roomId, tempId, real });
    } catch {
      dispatch({ type: "MESSAGE_FAILED", roomId, tempId });
    }
  }

  // ── Retry failed message ───────────────────────────────────────────────────

  async function handleRetry(tempId: string, content: string) {
    if (!state.activeRoomId) return;
    const roomId = state.activeRoomId;
    dispatch({ type: "MESSAGE_RETRIED", roomId, tempId });
    try {
      const real = await sendChatMessage(roomId, content);
      dispatch({ type: "MESSAGE_CONFIRMED", roomId, tempId, real });
    } catch {
      dispatch({ type: "MESSAGE_FAILED", roomId, tempId });
    }
  }

  // ── Delete message (admin only) ────────────────────────────────────────────

  async function handleDeleteMessage(msgId: string) {
    if (!state.activeRoomId || session?.user?.role !== "ADMIN") return;
    if (
      !confirm(
        "Are you sure you want to delete this message? This is permanent and will show as deleted to all users.",
      )
    )
      return;
    try {
      await deleteChatMessage(state.activeRoomId, msgId);
      dispatch({
        type: "MESSAGE_DELETED",
        roomId: state.activeRoomId,
        msgId,
      });
    } catch {
      // silently ignore — the admin can retry
    }
  }

  // ── Select room ────────────────────────────────────────────────────────────

  function handleSelectRoom(roomId: string) {
    dispatch({ type: "ROOM_SELECTED", roomId });
    dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: false });
    setShowScrollBadge(false);
    isAtBottomRef.current = true;
  }

  // ── Load more (older messages) ─────────────────────────────────────────────

  async function handleLoadMore() {
    if (!state.activeRoomId || isLoadingMore) return;
    const oldest = confirmedMessages[0];
    if (!oldest) return;
    const roomId = state.activeRoomId;
    dispatch({ type: "LOADING_MORE", roomId, value: true });
    try {
      const older = await getChatMessagesPage(roomId, oldest.created_at);
      dispatch({
        type: "MESSAGES_PREPENDED",
        roomId,
        messages: older,
        hasMore: older.length >= PAGE_SIZE,
      });
    } catch {
      dispatch({ type: "LOADING_MORE", roomId, value: false });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────

  if (state.initialLoading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm">Loading secure chat…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <RoomSidebar
        rooms={state.rooms}
        activeRoomId={state.activeRoomId}
        totalUnread={totalUnread}
        showNewRoom={state.ui.showNewRoom}
        myId={session?.user.id ?? ""}
        onSelectRoom={handleSelectRoom}
        onOpenNewRoom={() =>
          dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: true })
        }
        onRoomCreated={(room) => {
          dispatch({ type: "ROOM_PREPENDED", room });
          dispatch({ type: "ROOM_SELECTED", roomId: room.id });
          dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: false });
        }}
      />

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-card relative overflow-hidden">
        {state.ui.showNewRoom ? (
          <NewRoomPanel
            myRole={session?.user.role ?? "PATIENT"}
            myName={session?.user.name ?? ""}
            onCancel={() =>
              dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: false })
            }
            onRoomCreated={(room) => {
              dispatch({ type: "ROOM_PREPENDED", room });
              dispatch({ type: "ROOM_SELECTED", roomId: room.id });
              dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: false });
            }}
          />
        ) : activeRoom ? (
          <>
            {/* Header */}
            <ChatHeader room={activeRoom} />

            {/* Message list */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-1 bg-muted/10 relative"
            >
              {/* Load more */}
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Load earlier messages
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Messages */}
              {isRoomLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 opacity-20" />
                  <p className="text-sm">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                displayMessages.map((msg) => (
                  <MessageBubble
                    key={isOptimistic(msg) ? msg.tempId : msg.id}
                    msg={msg}
                    myId={session?.user.id ?? ""}
                    isAdmin={session?.user.role === "ADMIN"}
                    onDelete={handleDeleteMessage}
                    onRetry={handleRetry}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* New-messages scroll badge */}
            {showScrollBadge && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1.5
                           rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white
                           shadow-lg hover:bg-primary/90 transition-all animate-bounce"
              >
                <ArrowDown className="h-3 w-3" /> New messages
              </button>
            )}

            {/* Input */}
            <div className="border-t border-border bg-card p-3">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a secure message…"
                  maxLength={4000}
                  className="flex-1 rounded-full border border-input bg-background px-4 py-2
                             text-sm focus:border-primary focus:outline-none focus:ring-1
                             focus:ring-primary disabled:opacity-50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                             bg-primary text-white hover:bg-primary/90 disabled:opacity-40
                             transition-colors"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </button>
              </form>
              {draft.length > 3600 && (
                <p className="mt-1 text-right text-[10px] text-muted-foreground">
                  {4000 - draft.length} chars remaining
                </p>
              )}
            </div>
          </>
        ) : (
          /* Empty state — no room selected */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">No chat selected</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Pick a conversation or start a new one.
              </p>
            </div>
            <button
              onClick={() =>
                dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: true })
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white
                         hover:bg-primary/90 transition-colors"
            >
              + Start Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RoomSidebar
// ─────────────────────────────────────────────────────────────────────────────

interface RoomSidebarProps {
  rooms: ChatRoomEnriched[];
  activeRoomId: string | null;
  totalUnread: number;
  showNewRoom: boolean;
  myId: string;
  onSelectRoom: (id: string) => void;
  onOpenNewRoom: () => void;
  onRoomCreated: (room: ChatRoomEnriched) => void;
}

function RoomSidebar({
  rooms,
  activeRoomId,
  totalUnread,
  onSelectRoom,
  onOpenNewRoom,
}: RoomSidebarProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-border bg-muted/10">
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-card-foreground">
            Chats
          </span>
          {totalUnread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
        <button
          onClick={onOpenNewRoom}
          className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary
                     hover:bg-primary/20 transition-colors"
        >
          + New
        </button>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              No active chats.
              <br />
              Click &quot;+ New&quot; to start one.
            </p>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomListItem
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              onClick={() => onSelectRoom(room.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RoomListItem
// ─────────────────────────────────────────────────────────────────────────────

function RoomListItem({
  room,
  isActive,
  onClick,
}: {
  room: ChatRoomEnriched;
  isActive: boolean;
  onClick: () => void;
}) {
  const displayName =
    room.room_type === "DIRECT"
      ? (room.other_participant_name ?? "Unknown User")
      : (room.name ?? `Group (${room.participant_count})`);

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isDoctor = room.other_participant_role === "DOCTOR";
  const timeLabel = formatChatTime(room.last_message_at ?? room.created_at);

  return (
    <button
      onClick={onClick}
      className={`w-full border-b border-border px-3 py-3 text-left transition-colors
                  hover:bg-muted/50 flex items-center gap-3
                  ${isActive ? "bg-muted shadow-[inset_3px_0_0_0_var(--color-primary)]" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold
                    ${
                      room.room_type === "GROUP"
                        ? "bg-accent/10 text-accent"
                        : isDoctor
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "bg-secondary/10 text-secondary ring-1 ring-secondary/20"
                    }`}
      >
        {room.room_type === "GROUP" ? (
          <Users className="h-4 w-4" />
        ) : (
          initials || <User className="h-4 w-4" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p
            className={`truncate text-sm ${isActive ? "font-semibold text-card-foreground" : "font-medium text-card-foreground"}`}
          >
            {displayName}
          </p>
          <span className="ml-1 shrink-0 text-[10px] text-muted-foreground">
            {timeLabel}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1">
          <p className="truncate text-[11px] text-muted-foreground">
            {room.last_message_preview ?? (
              <span className="italic">No messages yet</span>
            )}
          </p>
          {room.unread_count > 0 && (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {room.unread_count > 99 ? "99+" : room.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ChatHeader
// ─────────────────────────────────────────────────────────────────────────────

function ChatHeader({ room }: { room: ChatRoomEnriched }) {
  const displayName =
    room.room_type === "DIRECT"
      ? (room.other_participant_name ?? "Direct Message")
      : (room.name ?? `Group Chat`);

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isDoctor = room.other_participant_role === "DOCTOR";
  const isGroup = room.room_type === "GROUP";

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm z-10">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold
                      ${
                        isGroup
                          ? "bg-accent/10 text-accent"
                          : isDoctor
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/10 text-secondary"
                      }`}
        >
          {isGroup ? (
            <Users className="h-4 w-4" />
          ) : (
            initials || <User className="h-4 w-4" />
          )}
        </div>

        {/* Name + role + status */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-card-foreground leading-tight">
              {displayName}
            </h3>
            {room.other_participant_role && !isGroup && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium
                            ${
                              isDoctor
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary/10 text-secondary"
                            }`}
              >
                {isDoctor ? "Doctor" : "Patient"}
              </span>
            )}
            {isGroup && (
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                Group · {room.participant_count} members
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
            Secure · Immutable · Audit-logged
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MessageBubble
// ─────────────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: DisplayMessage;
  myId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onRetry: (tempId: string, content: string) => void;
}

function MessageBubble({
  msg,
  myId,
  isAdmin,
  onDelete,
  onRetry,
}: MessageBubbleProps) {
  // ── System pill ──────────────────────────────────────────────────────────
  if (!isOptimistic(msg) && msg.message_type === "SYSTEM") {
    return (
      <div className="flex justify-center py-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          {msg.content}
        </span>
      </div>
    );
  }

  const isMe = msg.sender_id === myId;
  const isPending = isOptimistic(msg);
  const isFailed = isPending && msg.status === "failed";
  const isSending = isPending && msg.status === "sending";
  const isDeleted = !isPending && msg.is_deleted;

  // Display name: resolved server-side for confirmed messages
  const senderLabel = !isMe ? (msg.sender_name ?? "Unknown") : null;

  return (
    <div
      className={`flex group ${isMe ? "justify-end" : "justify-start"} relative mb-1`}
    >
      {/* Non-me avatar initial */}
      {!isMe && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {(senderLabel ?? "?").slice(0, 2).toUpperCase()}
        </div>
      )}

      <div
        className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}
      >
        {/* Sender name (other party only) */}
        {!isMe && senderLabel && (
          <p className="mb-0.5 ml-1 text-[10px] font-medium text-muted-foreground">
            {senderLabel}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed
                      ${
                        isMe
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm border border-border bg-card text-foreground shadow-sm"
                      }
                      ${isDeleted ? "opacity-60 italic" : ""}
                      ${isFailed ? "border border-destructive/40 bg-destructive/5 text-foreground" : ""}
                      `}
        >
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>

          {/* Timestamp + status row */}
          <div
            className={`mt-1 flex items-center justify-end gap-1.5 text-[10px]
                        ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}
          >
            <span>{formatChatTime(msg.created_at)}</span>

            {/* Optimistic status indicator */}
            {isSending && (
              <span className="flex gap-0.5">
                <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary-foreground/60 [animation-delay:0ms]" />
                <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary-foreground/60 [animation-delay:150ms]" />
                <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary-foreground/60 [animation-delay:300ms]" />
              </span>
            )}
            {!isPending && !isDeleted && isMe && (
              <span className="text-primary-foreground/70">✓</span>
            )}
          </div>
        </div>

        {/* Failed retry prompt */}
        {isFailed && (
          <button
            onClick={() => onRetry(msg.tempId, msg.content)}
            className="mt-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Failed · Tap to retry
          </button>
        )}
      </div>

      {/* Admin delete (hover, only for confirmed, non-deleted, non-system messages) */}
      {isAdmin && !isPending && !isDeleted && (
        <button
          onClick={() => onDelete((msg as ChatMessage).id)}
          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                      transition-opacity p-1.5 text-destructive hover:bg-destructive/10
                      rounded-full ${isMe ? "-left-9" : "-right-9"}`}
          title="Admin: Delete message"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  NewRoomPanel — user search combobox replaces the old UUID input
// ─────────────────────────────────────────────────────────────────────────────

interface NewRoomPanelProps {
  myRole: string;
  myName: string;
  onCancel: () => void;
  onRoomCreated: (room: ChatRoomEnriched) => void;
}

function NewRoomPanel({ myRole, onCancel, onRoomCreated }: NewRoomPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ChatUserResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setError(null);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);

    if (val.trim().length < 1) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchChatUsers(val.trim());
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleSelect(user: ChatUserResult) {
    setSelected(user);
    setQuery(user.display_label);
    setResults([]);
    setError(null);
  }

  function handleClear() {
    setQuery("");
    setSelected(null);
    setResults([]);
    setError(null);
  }

  async function handleCreate() {
    if (!selected) return;
    setCreating(true);
    setError(null);
    try {
      const room = await createChatRoom({
        room_type: "DIRECT",
        participant_ids: [selected.id],
      });
      onRoomCreated(room);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create chat room.",
      );
    } finally {
      setCreating(false);
    }
  }

  const contextLabel =
    myRole === "PATIENT"
      ? "Search your linked doctors by name."
      : myRole === "DOCTOR"
        ? "Search your patients or other doctors."
        : "Search any active user.";

  return (
    <div className="flex h-full flex-col p-6">
      {/* Title row */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-card-foreground">
          Start New Secure Chat
        </h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-5 text-xs text-muted-foreground">
        {contextLabel} Messages are immutable once sent.
      </p>

      {/* Search field */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Type a name to search…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-8 text-sm
                     focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
        {(query || selected) && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Dropdown results */}
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {results.map((user) => {
              const isDoctor = user.role === "DOCTOR";
              return (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold
                                  ${isDoctor ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}
                    >
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground leading-tight">
                        {user.display_label.split("·")[0].trim()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {user.display_label.includes("·")
                          ? user.display_label
                              .split("·")
                              .slice(1)
                              .join("·")
                              .trim()
                          : user.role}
                      </p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium
                                  ${isDoctor ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}
                    >
                      {isDoctor
                        ? "Doctor"
                        : user.role === "ADMIN"
                          ? "Admin"
                          : "Patient"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* No results */}
        {searching && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-center text-xs text-muted-foreground shadow-lg">
            <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1.5" />
            Searching…
          </div>
        )}
        {!searching &&
          query.trim().length >= 1 &&
          results.length === 0 &&
          !selected && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-center text-xs text-muted-foreground shadow-lg">
              No contacts found for &quot;{query}&quot;
            </div>
          )}
      </div>

      {/* Selected user chip */}
      {selected && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {selected.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-card-foreground">
              {selected.display_label.split("·")[0].trim()}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {selected.display_label.includes("·")
                ? selected.display_label.split("·").slice(1).join("·").trim()
                : selected.role}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {/* Actions */}
      <div className="mt-auto flex gap-2 pt-6">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm
                     font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!selected || creating}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white
                     hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {creating ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening…
            </span>
          ) : (
            "Start Chat"
          )}
        </button>
      </div>
    </div>
  );
}
