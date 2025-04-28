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
import { useAssetStore } from '@/store/asset-store'; // Import Zustand store


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
  // Access credentials from Zustand store using a selector
  const { apiKey, apiSecret, isTestnet } = useAssetStore(state => ({
    apiKey: state.apiKey,
    apiSecret: state.apiSecret,
    isTestnet: state.isTestnet,
  }));

  const viewportRef = useRef<HTMLDivElement>(null); // Ref for the ScrollArea viewport

  // Scroll to bottom when messages change or isLoading changes
  useEffect(() => {
    if (isExpanded && viewportRef.current) {
      // Use requestAnimationFrame for smoother scrolling after render
      requestAnimationFrame(() => {
        if (viewportRef.current) {
           viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isLoading, isExpanded]); // Dependencies include isLoading

  const handleSendMessage = async (messageContent: string) => {
    const newUserMessage: Message = { role: "user", content: messageContent };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    // Check if API keys are available from the store
    const credentialsAvailable = apiKey && apiSecret;
     if (!credentialsAvailable) {
        console.warn("API Keys not found in store. Trading functions will not work unless configured in 'Binance Account'.");
        // The AI prompt instructs the bot to inform the user if credentials are required but missing.
    } else {
         console.log("API Keys found in store. Passing to generateResponse flow.");
    }

    const chatHistoryForAI = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Prepare input for the flow, including credentials from the store IF they exist
    const input: GenerateResponseInput = {
      message: messageContent,
      chatHistory: chatHistoryForAI,
      // Conditionally include credentials only if they exist
      ...(credentialsAvailable && { apiKey, apiSecret }),
       // Pass isTestnet status regardless (defaults to false in schema if undefined)
       isTestnet: isTestnet ?? false,
    };

    try {
      // Call the flow function (which now might use tools)
      const result = await generateResponse(input);
      const aiResponse: Message = { role: "bot", content: result.response };
       setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error: any) {
      console.error("Error generating AI response:", error);
      const errorMessage = error?.message || "Failed to get response from AI. Please try again.";
       toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Optionally keep the user message even if the bot fails, for context
      // setMessages((prevMessages) => prevMessages.filter(msg => msg !== newUserMessage)); // Example: Remove the specific user message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Ensure the container takes full height of its parent div and uses flex column layout
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header remains, adjust padding and border */}
      <CardHeader className="border-b border-border flex-shrink-0 p-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">YINSEN</CardTitle>
         <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-foreground">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
             <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Chat</span>
        </Button>
      </CardHeader>

      {/* Conditionally render content based on isExpanded */}
      {isExpanded && (
        <>
          {/* Content container takes remaining space, adjust padding */}
          {/* Use p-0 on CardContent and apply padding within ScrollArea viewport */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            {/* Ensure ScrollArea uses theme colors and takes full height */}
            <ScrollArea className="h-full" viewportRef={viewportRef}>
                {/* Add padding directly to the container inside viewport */}
              <div className="space-y-4 p-3">
                {messages.map((msg, index) => (
                  <ChatMessage key={index} role={msg.role} content={msg.content} />
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                      {/* Use theme colors for skeletons */}
                      <Skeleton className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                      <Skeleton className="h-10 rounded-lg p-3 w-3/4 bg-muted" />
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          {/* ChatInput already uses theme colors */}
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </>
      )}
    </div>
  );
};
