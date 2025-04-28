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
        <Avatar className="h-8 w-8 border border-border flex-shrink-0"> {/* Added flex-shrink-0 */}
           {/* Use accent for bot avatar fallback background to contrast with bot message */}
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "rounded-lg p-3 shadow-sm", // Use theme's radius and shadow
           // Reduced max-width from 75% to 70%
          "max-w-[70%]",
          isUser
            ? "bg-primary-gradient text-primary-foreground" // User message uses gradient
            : "bg-secondary text-secondary-foreground" // Bot message uses secondary theme color
        )}
      >
         {/* Use foreground color for text within the bubble, let the parent div set the correct color */}
         {/* Added break-words to ensure long words wrap */}
        <p className="text-sm whitespace-pre-wrap break-words text-current">{content}</p>
      </div>
       {isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0"> {/* Added flex-shrink-0 */}
           {/* Use accent for user avatar fallback background */}
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
