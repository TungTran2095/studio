// src/components/chat/chat-message.tsx
"use client";

import type { FC } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "bot";
  content: string;
}

export const ChatMessage: FC<ChatMessageProps> = ({ role, content }) => {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3", // Keep gap for spacing between messages
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Bubble container */}
      <div
        className={cn(
          "rounded-lg p-3 shadow-sm flex items-start gap-2", // Add flex, items-start, gap-2 here
          // Let the chat bubble take up to 70% width, text should wrap inside
          "max-w-[80%]", // Allow slightly more width if needed
          isUser
            ? "bg-primary-gradient text-primary-foreground flex-row-reverse" // Reverse order for user
            : "bg-secondary text-secondary-foreground flex-row" // Standard order for bot
        )}
      >
        {/* Avatar now inside the bubble */}
        <Avatar className="h-8 w-8 border border-border flex-shrink-0">
          <AvatarFallback className="bg-accent text-accent-foreground">
            {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>

        {/* Text content */}
        <p className="text-sm whitespace-pre-wrap break-words text-current flex-1 pt-0.5"> {/* Add pt-0.5 for slight vertical alignment */}
          {content}
        </p>
      </div>
    </div>
  );
};
