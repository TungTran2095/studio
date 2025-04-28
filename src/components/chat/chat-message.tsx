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
        "flex items-start gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "rounded-lg p-3 shadow-sm",
          // Let the chat bubble take up to 70% width, text should wrap inside
          "max-w-[70%]", // Reduced max-width slightly
          isUser
            ? "bg-primary-gradient text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {/*
         Ensure text wraps naturally and breaks long words.
         whitespace-pre-wrap: Preserves whitespace and wraps text.
         break-words: Allows long words to break and wrap to the next line.
         text-current: Inherits text color from the parent div.
        */}
        <p className="text-sm whitespace-pre-wrap break-words text-current">{content}</p>
      </div>
       {isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
