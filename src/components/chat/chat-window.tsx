// src/components/chat/chat-window.tsx
"use client";

import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from 'lucide-react'; // Import icons
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Keep Card parts for structure
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { generateResponse } from "@/ai/flows/generate-response";
import type { GenerateResponseInput } from "@/ai/flows/generate-response";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button"; // Import Button
import { cn } from '@/lib/utils';


interface Message {
  role: "user" | "bot";
  content: string;
}

// Define props including isExpanded and onToggle
interface ChatWindowProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const ChatWindow: FC<ChatWindowProps> = ({ isExpanded, onToggle }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded && scrollAreaRef.current) { // Only scroll if expanded
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        requestAnimationFrame(() => {
            scrollViewport.scrollTop = scrollViewport.scrollHeight;
        });
      } else {
         requestAnimationFrame(() => {
             if(scrollAreaRef.current) {
                scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
             }
         });
      }
    }
  }, [messages, isLoading, isExpanded]); // Add isExpanded dependency


  const handleSendMessage = async (messageContent: string) => {
    const newUserMessage: Message = { role: "user", content: messageContent };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    const chatHistoryForAI = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const input: GenerateResponseInput = {
      message: messageContent,
      chatHistory: chatHistoryForAI,
    };

    try {
      const result = await generateResponse(input);
      const aiResponse: Message = { role: "bot", content: result.response };
       setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error) {
      console.error("Error generating AI response:", error);
       toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Ensure the container takes full height of its parent div
    <div className="flex flex-col h-full w-full bg-card overflow-hidden">
      <CardHeader className="border-b flex-shrink-0 p-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">YINSEN</CardTitle>
         <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
             <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Chat</span>
        </Button>
      </CardHeader>

      {/* Conditionally render content based on isExpanded */}
      {isExpanded && (
        <>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="space-y-4 p-3">
                {messages.map((msg, index) => (
                  <ChatMessage key={index} role={msg.role} content={msg.content} />
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                      <Skeleton className="h-8 w-8 rounded-full bg-accent" />
                      <Skeleton className="h-10 rounded-lg p-3 w-3/4 bg-secondary" />
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </>
      )}
    </div>
  );
};
