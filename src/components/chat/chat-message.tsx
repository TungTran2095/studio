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
        <Avatar className="h-8 w-8 border border-border">
           {/* Use secondary for bot avatar fallback background */}
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-lg p-3 shadow-sm", // Use theme's radius and shadow
          isUser
            ? "bg-primary text-primary-foreground" // User message uses primary color
            : "bg-card text-card-foreground" // Bot message uses card background
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
       {isUser && (
        <Avatar className="h-8 w-8 border border-border">
           {/* Use muted for user avatar fallback background */}
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
