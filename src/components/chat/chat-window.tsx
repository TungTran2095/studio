"use client";

import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { generateResponse } from "@/ai/flows/generate-response";
import type { GenerateResponseInput } from "@/ai/flows/generate-response";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";


interface Message {
  role: "user" | "bot";
  content: string;
}

export const ChatWindow: FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Attempt to find the viewport element within the ScrollArea
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        // Use requestAnimationFrame to ensure scrolling happens after DOM updates
        requestAnimationFrame(() => {
            scrollViewport.scrollTop = scrollViewport.scrollHeight;
        });
      } else {
         // Fallback if viewport selector doesn't work (might depend on ShadCN version)
         requestAnimationFrame(() => {
             if(scrollAreaRef.current) {
                scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
             }
         });
      }
    }
  }, [messages, isLoading]); // Add isLoading dependency to scroll after skeleton disappears


  const handleSendMessage = async (messageContent: string) => {
    const newUserMessage: Message = { role: "user", content: messageContent };
    // Immediately add user message and set loading state
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    // Prepare history *before* adding the new user message for the AI request
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
       // Add AI response *after* the API call completes
       // Use functional update to ensure we're working with the latest state
       setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error) {
      console.error("Error generating AI response:", error);
       toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });
       // Optionally remove the user's message if the AI fails
      // setMessages((prevMessages) => prevMessages.filter(msg => msg !== newUserMessage));
    } finally {
       // Set loading to false *after* AI response is added or error occurs
      setIsLoading(false);
    }
  };

  return (
    // Use card styling, match Firebase Studio's less pronounced shadow/border
    <Card className="flex flex-col h-[calc(100vh-4rem)] max-h-[800px] w-full max-w-4xl mx-auto my-4 rounded-lg overflow-hidden bg-card border shadow-md"> {/* Slightly wider, less margin, subtle shadow */}
      <CardHeader className="border-b">
        <CardTitle className="text-center text-lg font-medium text-foreground">EchoBot</CardTitle> {/* Adjusted font weight */}
      </CardHeader>
       {/* Content area should match the card's background */}
      <CardContent className="flex-1 p-0 overflow-hidden bg-card"> {/* Changed to bg-card */}
        <ScrollArea className="h-full" ref={scrollAreaRef}>
           {/* Add padding within the scroll area content */}
          <div className="space-y-4 p-4">
            {messages.map((msg, index) => (
              <ChatMessage key={index} role={msg.role} content={msg.content} />
            ))}
             {isLoading && (
                <div className="flex items-start gap-3 justify-start">
                   {/* Use muted for skeleton bg */}
                   <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                   {/* Use secondary for bot message skeleton */}
                   <Skeleton className="h-10 rounded-lg p-3 w-1/4 bg-secondary" />
              </div>
             )}
          </div>
        </ScrollArea>
      </CardContent>
      {/* Input area uses card styling */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </Card>
  );
};
