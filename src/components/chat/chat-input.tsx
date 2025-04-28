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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t bg-background">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Type your message..."
        className="flex-1"
        disabled={isLoading}
        aria-label="Chat message input"
      />
      <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} aria-label="Send message">
        <Send />
      </Button>
    </form>
  );
};
