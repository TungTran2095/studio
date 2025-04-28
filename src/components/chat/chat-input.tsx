"use client";

import type { FC, FormEvent } from "react";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput: FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading) return;
    onSendMessage(trimmedMessage);
    setInputValue("");
    inputRef.current?.focus(); // Keep focus on input after sending
  };

  return (
    // Use background color for the form container, apply top border matching the theme
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t bg-background border-border"> {/* Use theme background, adjusted padding */}
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Type your message..."
        // Use input theme color, ensure text/placeholder/border/ring use theme colors
        className="flex-1 bg-input text-foreground placeholder:text-muted-foreground border-border focus-visible:ring-ring"
        disabled={isLoading}
        aria-label="Chat message input"
      />
      <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} aria-label="Send message">
        <Send className="h-5 w-5" /> {/* Ensure icon size is appropriate */}
      </Button>
    </form>
  );
};
