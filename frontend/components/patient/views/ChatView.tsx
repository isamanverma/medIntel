"use client";

import { SecureChat } from "@/components/chat/SecureChat";

interface ChatViewProps {
  initialRoomId: string | null;
  switchTrigger: number;
}

export function ChatView({ initialRoomId, switchTrigger }: ChatViewProps) {
  return (
    <div className="flex h-full w-full flex-1 min-h-0 overflow-hidden">
      <SecureChat initialRoomId={initialRoomId} switchTrigger={switchTrigger} />
    </div>
  );
}
