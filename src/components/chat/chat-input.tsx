"use client";

import type { FC, FormEvent, KeyboardEvent } from "react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowUp, Bot, Lightbulb } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PromptSuggestions } from "./prompt-suggestions";
import { InlineSuggestions } from "./inline-suggestions";
import { usePromptSuggestions } from "@/hooks/use-prompt-suggestions";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = "Nhập tin nhắn..."
}) => {
  const [inputValue, setInputValue] = useState("");
  const [rows, setRows] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = isLoading || disabled;
  
  // Sử dụng hook gợi ý prompt
  const inlineSuggestions = usePromptSuggestions(inputValue);
  const [showInlineSuggestions, setShowInlineSuggestions] = useState(false);
  
  // Ẩn gợi ý inline khi không nhập trong 5 giây
  useEffect(() => {
    if (inlineSuggestions.length > 0) {
      setShowInlineSuggestions(true);
      
      const timer = setTimeout(() => {
        setShowInlineSuggestions(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowInlineSuggestions(false);
    }
  }, [inlineSuggestions]);

  // Tự động điều chỉnh số dòng dựa trên nội dung
  useEffect(() => {
    if (!textareaRef.current) return;

    const calculateRows = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height để tính toán chính xác
      textarea.style.height = 'auto';
      
      // Số dòng dựa trên số xuống dòng và chiều dài
      const newLines = (inputValue.match(/\n/g) || []).length;
      const calculatedRows = Math.min(Math.max(1, newLines + 1), 5);
      
      // Cập nhật chiều cao
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      
      setRows(calculatedRows);
    };

    calculateRows();
  }, [inputValue]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isDisabled) return;
    
    onSendMessage(trimmedMessage);
    setInputValue("");
    setShowSuggestions(false);
    setShowInlineSuggestions(false);
    
    // Focus lại và reset chiều cao
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      setRows(1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Gửi tin nhắn khi nhấn Enter (không phải Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Ngăn xuống dòng mặc định
      handleSubmit();
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    setInputValue(prompt);
    setShowSuggestions(false);
    setShowInlineSuggestions(false);
    
    // Focus lại vào textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const toggleSuggestions = () => {
    setShowSuggestions(prev => !prev);
    setShowInlineSuggestions(false);
  };

  return (
    <div className="w-full">
      <PromptSuggestions 
        onSelectPrompt={handleSelectPrompt} 
        isVisible={showSuggestions} 
      />
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex items-center rounded-md shadow-sm bg-background">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute left-1.5 h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
            onClick={toggleSuggestions}
          >
            <Lightbulb className="h-4 w-4" />
            <span className="sr-only">Gợi ý prompt</span>
          </Button>
          
          <div className="relative w-full">
            {showInlineSuggestions && (
              <InlineSuggestions
                suggestions={inlineSuggestions}
                onSelectSuggestion={handleSelectPrompt}
              />
            )}
            
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={rows}
              className={cn(
                "flex w-full rounded-md border border-input bg-transparent py-3 pr-10 pl-10",
                "text-sm ring-offset-background placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "resize-none min-h-[44px] max-h-[160px] overflow-y-auto",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={isDisabled}
            />
          </div>

          <Button 
            type="submit" 
            size="icon"
            className={cn(
              "absolute right-1.5 h-8 w-8 rounded-full", 
              inputValue.trim() && !isDisabled ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground bg-muted hover:bg-muted-foreground/10"
            )}
            disabled={!inputValue.trim() || isDisabled} 
          >
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Gửi tin nhắn</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
