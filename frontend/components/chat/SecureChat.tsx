"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Trash2, User, Users } from "lucide-react";
import { useAuth } from "@/components/providers/SessionProvider";
import {
    getChatRooms,
    getChatMessages,
    sendChatMessage,
    createChatRoom,
    deleteChatMessage
} from "@/lib/api-client";
import type { ChatRoom, ChatMessage } from "@/lib/types";

export function SecureChat() {
    const { session } = useAuth();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // New room modal
    const [showNewRoom, setShowNewRoom] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newParticipantId, setNewParticipantId] = useState("");

    useEffect(() => {
        loadRooms();
    }, []);

    useEffect(() => {
        if (activeRoom) {
            loadMessages(activeRoom.id);
            // Simple polling for new messages every 5 seconds (in a real app, use WebSockets)
            const interval = setInterval(() => loadMessages(activeRoom.id, false), 5000);
            return () => clearInterval(interval);
        }
    }, [activeRoom]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function loadRooms() {
        try {
            setLoading(true);
            const data = await getChatRooms();
            setRooms(data);
            if (data.length > 0 && !activeRoom) {
                setActiveRoom(data[0]);
            }
        } catch (error) {
            console.error("Failed to load rooms:", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadMessages(roomId: string, showLoadingIndicator = true) {
        try {
            if (showLoadingIndicator && messages.length === 0) setLoading(true);
            const data = await getChatMessages(roomId);
            setMessages(data);
        } catch (error) {
            console.error("Failed to load messages:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || !activeRoom) return;

        const content = newMessage.trim();
        setNewMessage(""); // optimistic clear

        try {
            const msg = await sendChatMessage(activeRoom.id, content);
            setMessages((prev) => [...prev, msg]);
        } catch (error) {
            console.error("Failed to send message:", error);
            // Revert optimism if needed or show error Toast
        }
    }

    async function handleCreateRoom(e: React.FormEvent) {
        e.preventDefault();
        if (!newParticipantId.trim()) return;

        try {
            const room = await createChatRoom({
                name: newRoomName.trim() || undefined,
                room_type: "DIRECT",
                participant_ids: [newParticipantId.trim()],
            });
            setRooms((prev) => [room, ...prev]);
            setActiveRoom(room);
            setShowNewRoom(false);
            setNewRoomName("");
            setNewParticipantId("");
        } catch (error) {
            console.error("Failed to create room:", error);
            alert("Failed to create chat room. Please check the Participant ID.");
        }
    }

    async function handleDeleteMessage(messageId: string) {
        if (!activeRoom || session?.user?.role !== "ADMIN") return;
        if (!confirm("Are you sure you want to delete this message? This action is permanent and will show as deleted to all users.")) return;

        try {
            await deleteChatMessage(activeRoom.id, messageId);
            setMessages((prev) =>
                prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: "[message deleted]" } : m)
            );
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    }

    if (loading && rooms.length === 0) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading secure chat...</div>;
    }

    return (
        <div className="flex h-[600px] w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Sidebar - Rooms List */}
            <div className="w-1/3 border-r border-border bg-muted/20 flex flex-col">
                <div className="p-4 border-b border-border flex justify-between items-center bg-card">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-card-foreground">Chats</span>
                    </div>
                    <button
                        onClick={() => setShowNewRoom(true)}
                        className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors"
                    >
                        + New
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {rooms.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">No active chats</div>
                    ) : (
                        rooms.map((room) => (
                            <button
                                key={room.id}
                                onClick={() => setActiveRoom(room)}
                                className={`w-full p-4 text-left flex items-start gap-3 transition-colors border-b border-border hover:bg-muted/50 ${activeRoom?.id === room.id ? "bg-muted shadow-[inset_4px_0_0_0_var(--color-primary)]" : ""
                                    }`}
                            >
                                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    {room.room_type === "GROUP" ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-medium text-sm text-card-foreground truncate">
                                        {room.name || `Chat with ${room.participant_count} members`}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(room.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-card relative">
                {showNewRoom ? (
                    <div className="p-6 h-full flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 text-card-foreground">Start New Secure Chat</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Messages in secure chat are immutable. Send a Chat ID to start a conversation.
                        </p>
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-card-foreground mb-1">Room Name (Optional)</label>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="e.g. Consult: John Doe"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-card-foreground mb-1">Participant User ID <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={newParticipantId}
                                    onChange={(e) => setNewParticipantId(e.target.value)}
                                    placeholder="Paste User ID here..."
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowNewRoom(false)}
                                    className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                                >
                                    Create Chat
                                </button>
                            </div>
                        </form>
                    </div>
                ) : activeRoom ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-border bg-card flex justify-between items-center shadow-sm z-10">
                            <div>
                                <h3 className="font-semibold text-card-foreground">
                                    {activeRoom.name || "Direct Message"}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Secure immutable transmission • {activeRoom.participant_count} participants
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                                    <MessageSquare className="h-8 w-8 opacity-20" />
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === session?.user?.id;
                                    const isAdmin = session?.user?.role === "ADMIN";

                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group relative`}>
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-white border border-border text-foreground shadow-sm rounded-tl-sm uppercase-false"
                                                } ${msg.is_deleted ? "opacity-60 italic border-destructive/30 text-muted-foreground bg-muted" : ""}`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                <div className={`text-[10px] mt-1 text-right ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"} flex justify-end gap-2 items-center`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>

                                            {/* Admin Delete Action - visible on hover */}
                                            {isAdmin && !msg.is_deleted && (
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-destructive hover:bg-destructive/10 rounded-full ${isMe ? "-left-10" : "-right-10"
                                                        }`}
                                                    title="Admin: Delete message"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 bg-card border-t border-border">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a secure message..."
                                    className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                    disabled={loading && messages.length === 0}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || (loading && messages.length === 0)}
                                    className="h-10 w-10 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    <Send className="h-4 w-4 ml-1" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                        <MessageSquare className="h-12 w-12 opacity-20" />
                        <p>Select a chat or start a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
