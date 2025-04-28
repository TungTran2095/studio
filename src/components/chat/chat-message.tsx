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
        "flex items-end gap-2", // Use items-end for potential tail alignment, adjust gap
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar outside the bubble for bot messages */}
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Bubble container */}
      <div
        className={cn(
          "rounded-lg p-2.5 shadow-sm", // Adjusted padding
          // Let the chat bubble take up to 80% width, text should wrap inside
          "max-w-[80%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none" // User bubble color (using theme primary), slight shape adjustment
            : "bg-secondary text-secondary-foreground rounded-bl-none" // Bot bubble color (using theme secondary), slight shape adjustment
        )}
      >
        {/* Text content */}
        <p className="text-sm whitespace-pre-wrap break-words text-current">
          {content}
        </p>
      </div>

       {/* Avatar outside the bubble for user messages */}
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
