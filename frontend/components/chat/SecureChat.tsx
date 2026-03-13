"use client";

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
  Plus,
  RotateCcw,
  Search,
  Send,
  Shield,
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
  formatBubbleTime,
  formatChatTime,
  isOptimistic,
  type ChatMessage,
  type ChatRoomEnriched,
  type ChatUserResult,
  type DisplayMessage,
  type OptimisticMessage,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { useChatPolling } from "./useChatPolling";

// ─────────────────────────────────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────────────────────────────────

export interface SecureChatProps {
  initialRoomId?: string | null;
  switchTrigger?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  State / reducer (unchanged logic, purely state management)
// ─────────────────────────────────────────────────────────────────────────────

interface ChatState {
  rooms: ChatRoomEnriched[];
  activeRoomId: string | null;
  messagesByRoom: Record<string, ChatMessage[]>;
  pendingByRoom: Record<string, OptimisticMessage[]>;
  loadedRooms: Set<string>;
  hasMoreByRoom: Record<string, boolean>;
  initialLoading: boolean;
  roomLoading: Record<string, boolean>;
  loadingMoreByRoom: Record<string, boolean>;
  ui: { showNewRoom: boolean };
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
      return { ...state, rooms: action.rooms, initialLoading: false };

    case "ROOM_PREPENDED": {
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
      const reversed = action.messages.filter(
        (m) => m.room_id === action.roomId,
      );
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
      const existingIds = new Set(existing.map((m) => m.id));
      const fresh = action.messages.filter(
        (m) => m.room_id === action.roomId && !existingIds.has(m.id),
      );
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
      const fresh = action.messages.filter(
        (m) => m.room_id === action.roomId && !existingIds.has(m.id),
      );
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
//  Avatar color palette (deterministic by name)
// ─────────────────────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  "bg-indigo-500/20 text-indigo-400",
  "bg-violet-500/20 text-violet-400",
  "bg-sky-500/20 text-sky-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400",
] as const;

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function nameInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────

export function SecureChat({
  initialRoomId,
  switchTrigger = 0,
}: SecureChatProps = {}) {
  const { session } = useAuth();
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [draft, setDraft] = useState("");
  const [showScrollBadge, setShowScrollBadge] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeRoom = useMemo(
    () => state.rooms.find((r) => r.id === state.activeRoomId) ?? null,
    [state.rooms, state.activeRoomId],
  );

  const confirmedMessages: ChatMessage[] =
    (state.activeRoomId ? state.messagesByRoom[state.activeRoomId] : null) ??
    [];

  const pendingMessages: OptimisticMessage[] =
    (state.activeRoomId ? state.pendingByRoom[state.activeRoomId] : null) ?? [];

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

  const lastMessageTimestamp = confirmedMessages.length
    ? confirmedMessages[confirmedMessages.length - 1].created_at
    : null;

  const totalUnread = state.rooms.reduce(
    (sum, r) => sum + (r.unread_count ?? 0),
    0,
  );

  // ── Refs ──────────────────────────────────────────────────────────────────

  const roomsRef = useRef<ChatRoomEnriched[]>([]);
  useEffect(() => {
    roomsRef.current = state.rooms;
  }, [state.rooms]);

  const lastHandledTriggerRef = useRef<number>(-1);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Initial room list load
  useEffect(() => {
    (async () => {
      try {
        const rooms = await getChatRooms();
        roomsRef.current = rooms;
        dispatch({ type: "ROOMS_LOADED", rooms });
        const target = initialRoomId ?? rooms[0]?.id ?? null;
        if (target) dispatch({ type: "ROOM_SELECTED", roomId: target });
        lastHandledTriggerRef.current = switchTrigger;
      } catch {
        dispatch({ type: "ROOMS_LOADED", rooms: [] });
        lastHandledTriggerRef.current = switchTrigger;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Room-switch on trigger increment
  useEffect(() => {
    if (switchTrigger === 0 || switchTrigger === lastHandledTriggerRef.current)
      return;
    if (!initialRoomId) return;
    lastHandledTriggerRef.current = switchTrigger;

    const alreadyLoaded = roomsRef.current.some((r) => r.id === initialRoomId);
    if (alreadyLoaded) {
      dispatch({ type: "ROOM_SELECTED", roomId: initialRoomId });
    } else {
      (async () => {
        try {
          const rooms = await getChatRooms();
          roomsRef.current = rooms;
          dispatch({ type: "ROOMS_LOADED", rooms });
          dispatch({ type: "ROOM_SELECTED", roomId: initialRoomId });
        } catch {}
      })();
    }
  }, [switchTrigger, initialRoomId]);

  // Load messages when active room changes
  useEffect(() => {
    if (!state.activeRoomId) return;
    const roomId = state.activeRoomId;

    if (state.loadedRooms.has(roomId)) {
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

  // ── Scroll logic ──────────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < 80;
    if (isAtBottomRef.current) setShowScrollBadge(false);
  }

  // Auto-scroll on new messages
  useEffect(() => {
    const last = displayMessages[displayMessages.length - 1];
    const isMyMsg =
      last &&
      isOptimistic(last) &&
      last.sender_id === session?.user.id &&
      last.status === "sending";

    if (isAtBottomRef.current || isMyMsg) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollBadge(false);
    } else if (last && !isOptimistic(last)) {
      setShowScrollBadge(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMessages.length]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBadge(false);
    if (state.activeRoomId) {
      dispatch({ type: "ROOM_MARKED_READ", roomId: state.activeRoomId });
    }
  }, [state.activeRoomId]);

  // ── Polling ───────────────────────────────────────────────────────────────

  const handleNewMessages = useCallback(
    (roomId: string, messages: ChatMessage[]) => {
      if (!messages.length) return;
      dispatch({ type: "MESSAGES_APPENDED", roomId, messages });
      if (state.activeRoomId === roomId && isAtBottomRef.current) {
        markRoomRead(roomId).catch(() => {});
        dispatch({ type: "ROOM_MARKED_READ", roomId });
      }
    },
    [state.activeRoomId],
  );

  useChatPolling({
    roomId: state.activeRoomId,
    sinceTimestamp: lastMessageTimestamp,
    onNewMessages: handleNewMessages,
    intervalMs: 3000,
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !state.activeRoomId) return;
    const tempId = `temp-${Date.now()}`;
    const roomId = state.activeRoomId;
    setDraft("");

    const optimistic: OptimisticMessage = {
      tempId,
      room_id: roomId,
      sender_id: session?.user.id ?? "",
      sender_name: session?.user.name ?? "Me",
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

  async function handleDeleteMessage(msgId: string) {
    if (!state.activeRoomId) return;
    const roomId = state.activeRoomId;
    try {
      await deleteChatMessage(roomId, msgId);
      dispatch({ type: "MESSAGE_DELETED", roomId, msgId });
    } catch {}
  }

  function handleSelectRoom(id: string) {
    dispatch({ type: "ROOM_SELECTED", roomId: id });
    dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: false });
  }

  async function handleLoadMore() {
    if (!state.activeRoomId) return;
    const oldest = confirmedMessages[0];
    const roomId = state.activeRoomId;
    dispatch({ type: "LOADING_MORE", roomId, value: true });
    try {
      const older = await getChatMessagesPage(
        roomId,
        oldest?.created_at ?? new Date(0).toISOString(),
      );
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
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-6 w-6 animate-pulse text-primary" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading secure chat…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* ── Rooms sidebar ─────────────────────────────────────────────────── */}
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

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden border-l border-border bg-card">
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
            {/* Chat header */}
            <ChatHeader room={activeRoom} />

            {/* Message list */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="relative flex-1 overflow-y-auto"
            >
              <div className="flex flex-col gap-1 p-4 pb-2">
                {/* Load more */}
                {hasMoreMessages && (
                  <div className="flex justify-center pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="h-7 gap-1.5 rounded-full text-xs"
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
                    </Button>
                  </div>
                )}

                {/* Messages */}
                {isRoomLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                  </div>
                ) : displayMessages.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-5 w-5 opacity-30" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="mt-0.5 text-xs text-muted-foreground/60">
                        Start the conversation below.
                      </p>
                    </div>
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
                <div ref={messagesEndRef} className="h-1" />
              </div>
            </div>

            {/* Scroll-to-bottom badge */}
            {showScrollBadge && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2
                           flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5
                           text-xs font-semibold text-primary-foreground shadow-lg
                           hover:bg-primary/90 transition-all animate-bounce"
              >
                <ArrowDown className="h-3 w-3" />
                New messages
              </button>
            )}

            {/* Input bar */}
            <div className="border-t border-border bg-card/80 p-3 backdrop-blur-sm">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a secure message…"
                  maxLength={4000}
                  autoComplete="off"
                  className="h-9 flex-1 rounded-full border-border bg-muted/50 px-4 text-sm
                             placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim()}
                  className="h-9 w-9 shrink-0 rounded-full shadow-sm"
                >
                  <Send className="h-4 w-4 translate-x-px" />
                </Button>
              </form>
              {draft.length > 3600 && (
                <p className="mt-1 text-right text-[10px] text-muted-foreground/60">
                  {4000 - draft.length} chars remaining
                </p>
              )}
            </div>
          </>
        ) : (
          /* No room selected */
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="h-7 w-7 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                No conversation selected
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Pick a conversation from the sidebar or start a new one.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                dispatch({ type: "UI_TOGGLE_NEW_ROOM", value: true })
              }
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Start New Chat
            </Button>
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
  const [search, setSearch] = useState("");

  const filtered = rooms.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name =
      r.room_type === "DIRECT"
        ? (r.other_participant_name ?? "")
        : (r.name ?? "");
    return name.toLowerCase().includes(q);
  });

  return (
    <div className="flex w-72 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">
            Messages
          </span>
          {totalUnread > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-[9px] font-bold bg-primary/80">
              {totalUnread > 99 ? "99+" : totalUnread}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenNewRoom}
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          title="New chat"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Search */}
      {rooms.length > 0 && (
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 bg-sidebar-accent/50 border-sidebar-border pl-7 text-xs
                         placeholder:text-muted-foreground/40 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      )}

      {/* Room list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-4 w-4 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {search ? `No results for "${search}"` : "No conversations yet"}
              </p>
              {!search && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                  Click + to start one.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((room) => (
              <RoomListItem
                key={room.id}
                room={room}
                isActive={room.id === activeRoomId}
                onClick={() => onSelectRoom(room.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
          <Shield className="h-2.5 w-2.5 shrink-0" />
          <span>End-to-end encrypted · Audit-logged</span>
        </div>
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

  const isDoctor = room.other_participant_role === "DOCTOR";
  const isGroup = room.room_type === "GROUP";
  const timeLabel = formatChatTime(room.last_message_at ?? room.created_at);
  const palette = isGroup
    ? "bg-violet-500/20 text-violet-400"
    : avatarColor(displayName);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
        isActive
          ? "bg-sidebar-accent before:absolute before:left-0 before:top-1/2 before:h-8 before:-translate-y-1/2 before:w-0.5 before:rounded-r-full before:bg-primary"
          : "hover:bg-sidebar-accent/60",
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className={cn("text-xs font-semibold", palette)}>
            {isGroup ? (
              <Users className="h-4 w-4" />
            ) : (
              nameInitials(displayName)
            )}
          </AvatarFallback>
        </Avatar>
        {/* Online dot — decorative */}
        {!isGroup && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-sidebar border-[1.5px] border-sidebar">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isDoctor ? "bg-primary" : "bg-emerald-500",
              )}
            />
          </span>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p
            className={cn(
              "truncate text-sm leading-tight",
              isActive
                ? "font-semibold text-sidebar-foreground"
                : "font-medium text-sidebar-foreground/80",
            )}
          >
            {displayName}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground/50">
            {timeLabel}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1">
          <p className="truncate text-[11px] text-muted-foreground/60">
            {room.last_message_preview ?? (
              <span className="italic">No messages yet</span>
            )}
          </p>
          {room.unread_count > 0 && (
            <Badge className="h-4 min-w-4 shrink-0 px-1 text-[9px] font-bold bg-primary/80">
              {room.unread_count > 99 ? "99+" : room.unread_count}
            </Badge>
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
      : (room.name ?? "Group Chat");

  const isDoctor = room.other_participant_role === "DOCTOR";
  const isGroup = room.room_type === "GROUP";
  const palette = isGroup
    ? "bg-violet-500/20 text-violet-400"
    : avatarColor(displayName);

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className={cn("text-xs font-semibold", palette)}>
          {isGroup ? <Users className="h-4 w-4" /> : nameInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
            {displayName}
          </h3>
          {!isGroup && room.other_participant_role && (
            <Badge
              variant="outline"
              className={cn(
                "h-4 px-1.5 text-[9px] font-semibold shrink-0",
                isDoctor
                  ? "border-primary/30 text-primary bg-primary/5"
                  : "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
              )}
            >
              {isDoctor ? "Doctor" : "Patient"}
            </Badge>
          )}
          {isGroup && (
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[9px] font-semibold shrink-0 border-violet-500/30 text-violet-400 bg-violet-500/5"
            >
              {room.participant_count} members
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Secure · Immutable · Audit-logged
        </p>
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
  // System pill
  if (!isOptimistic(msg) && msg.message_type === "SYSTEM") {
    return (
      <div className="flex justify-center py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
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
  const senderLabel = !isMe ? (msg.sender_name ?? "Unknown") : null;
  const senderPalette = senderLabel ? avatarColor(senderLabel) : "";

  return (
    <div
      className={cn(
        "group relative mb-1 flex items-end gap-2",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      {/* Other-party avatar */}
      {!isMe && (
        <Avatar className="mb-0.5 h-6 w-6 shrink-0 self-end">
          <AvatarFallback className={cn("text-[9px] font-bold", senderPalette)}>
            {nameInitials(senderLabel ?? "?")}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "flex flex-col gap-0.5",
          isMe ? "items-end" : "items-start",
          "max-w-[72%]",
        )}
      >
        {/* Sender name (other party only) */}
        {!isMe && senderLabel && (
          <p className="ml-1 text-[10px] font-medium text-muted-foreground/70">
            {senderLabel}
          </p>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
            isMe
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm border border-border bg-card text-foreground",
            isDeleted && "opacity-50 italic",
            isFailed &&
              "border-destructive/40 bg-destructive/10 text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>

          {/* Timestamp + status */}
          <div
            className={cn(
              "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
              isMe ? "text-primary-foreground/50" : "text-muted-foreground/60",
            )}
          >
            <span>{formatBubbleTime(msg.created_at)}</span>
            {isSending && (
              <span className="flex gap-0.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary-foreground/50"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            )}
            {!isPending && !isDeleted && isMe && (
              <span className="text-primary-foreground/60">✓</span>
            )}
          </div>
        </div>

        {/* Failed retry */}
        {isFailed && isPending && (
          <button
            type="button"
            onClick={() => onRetry(msg.tempId, msg.content)}
            className="mt-0.5 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Failed · Tap to retry
          </button>
        )}
      </div>

      {/* Admin delete (hover) */}
      {isAdmin && !isPending && !isDeleted && (
        <button
          type="button"
          onClick={() => onDelete((msg as ChatMessage).id)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100",
            "rounded-full p-1.5 text-destructive hover:bg-destructive/10 transition-all",
            isMe ? "-left-8" : "-right-8",
          )}
          title="Admin: Delete message"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  NewRoomPanel
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Start a new chat
            </h3>
            <p className="text-[11px] text-muted-foreground/70">
              {contextLabel}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-7 w-7 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by name…"
            autoFocus
            className="pl-9 pr-8 bg-muted/40 border-border focus-visible:ring-primary/40"
          />
          {(query || selected) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Dropdown */}
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
              {results.map((user) => {
                const isDoctor = user.role === "DOCTOR";
                const palette = avatarColor(user.name);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(user)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={cn("text-xs font-semibold", palette)}
                        >
                          {nameInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground leading-tight">
                          {user.display_label.split("·")[0].trim()}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70">
                          {user.display_label.includes("·")
                            ? user.display_label
                                .split("·")
                                .slice(1)
                                .join("·")
                                .trim()
                            : user.role}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 shrink-0 px-1.5 text-[9px] font-semibold",
                          isDoctor
                            ? "border-primary/30 text-primary bg-primary/5"
                            : user.role === "ADMIN"
                              ? "border-violet-500/30 text-violet-400 bg-violet-500/5"
                              : "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
                        )}
                      >
                        {isDoctor
                          ? "Doctor"
                          : user.role === "ADMIN"
                            ? "Admin"
                            : "Patient"}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Searching */}
          {searching && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover px-4 py-3 text-center text-xs text-muted-foreground shadow-xl">
              <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          )}

          {/* No results */}
          {!searching &&
            query.trim().length >= 1 &&
            results.length === 0 &&
            !selected && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover px-4 py-3 text-center text-xs text-muted-foreground shadow-xl">
                No contacts found for &ldquo;{query}&rdquo;
              </div>
            )}
        </div>

        {/* Selected chip */}
        {selected && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback
                className={cn(
                  "text-xs font-semibold",
                  avatarColor(selected.name),
                )}
              >
                {nameInitials(selected.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {selected.display_label.split("·")[0].trim()}
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                {selected.display_label.includes("·")
                  ? selected.display_label.split("·").slice(1).join("·").trim()
                  : selected.role}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-7 w-7 text-muted-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Info note */}
        <div className="mt-auto rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              Messages are{" "}
              <strong className="text-foreground/80">immutable</strong> once
              sent and stored in an audit log. This ensures full accountability
              for all communications.
            </p>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 border-t border-border bg-card/80 p-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!selected || creating}
          className="flex-1 gap-1.5"
        >
          {creating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Opening…
            </>
          ) : (
            <>
              <MessageSquare className="h-3.5 w-3.5" />
              Start Chat
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
