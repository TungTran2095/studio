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
        // Align avatar and bubble to the top
        "flex items-start gap-2 w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Bot Avatar */}
      {!isUser && (
        // Consistent margin for avatar
        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Bubble */}
      <div
        className={cn(
           // Standard padding, adjusted max-width if needed
          "rounded-lg p-2.5 shadow-sm max-w-[90%]", // Consistent padding
          "min-w-[40px]",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-secondary text-secondary-foreground rounded-bl-none"
        )}
      >
        {/* Text Content */}
        <p className="text-sm whitespace-pre-wrap break-words text-left text-current">
          {content}
        </p>
      </div>

      {/* User Avatar */}
      {isUser && (
         // Consistent margin for avatar
        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
