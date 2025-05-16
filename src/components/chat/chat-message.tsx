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
        "flex items-start gap-2 w-full mb-1", // Add margin-bottom for spacing
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Bot Avatar */}
      {!isUser && (
        // Consistent margin for avatar, make invisible for user messages to maintain layout
        <Avatar className={cn(
            "h-8 w-8 border border-border flex-shrink-0 mt-1",
             // isUser && "invisible" // Keep space but hide for user
            )}>
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Bubble */}
      <div
        className={cn(
           // Standard padding, remove max-width to allow expansion
          "rounded-lg p-2 shadow-sm", // Adjusted padding
          "min-w-[40px]", // Minimum width for small messages
           "max-w-[75%]", // Limit max width slightly more than before
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none" // User: Primary color, rounded bottom-right none
            : "bg-secondary text-secondary-foreground rounded-bl-none" // Bot: Secondary color, rounded bottom-left none
        )}
      >
        {/* Text Content - Allow wrapping and breaking */}
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
