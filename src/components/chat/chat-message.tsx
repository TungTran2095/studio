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
        // Use items-start to align avatar and bubble top, ensure full width
        "flex items-start gap-2 w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar outside the bubble for bot messages */}
      {!isUser && (
        // Add slight top margin for better alignment with text bubble padding
        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Bubble container */}
      <div
        className={cn(
          "rounded-lg p-2.5 shadow-sm", // Padding inside the bubble
          // Limit width, allow vertical growth. Increased max-width slightly.
          "max-w-[85%]", // Slightly increased max-width to give more space
          "min-w-[40px]", // Optional: minimum width
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none" // User bubble color
            : "bg-secondary text-secondary-foreground rounded-bl-none" // Bot bubble color
        )}
      >
        {/* Text content - Ensure wrapping and correct alignment */}
        <p className="text-sm whitespace-pre-wrap break-words text-left text-current"> {/* Explicitly set text-left */}
          {content}
        </p>
      </div>

       {/* Avatar outside the bubble for user messages */}
       {isUser && (
         // Add slight top margin for better alignment
        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
          <AvatarFallback className="bg-accent text-accent-foreground">
             <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
