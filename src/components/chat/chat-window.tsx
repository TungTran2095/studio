// src/components/chat/chat-window.tsx
"use client";

import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { generateResponse } from "@/ai/flows/generate-response";
import type { GenerateResponseInput } from "@/ai/flows/generate-response";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { useAssetStore } from '@/store/asset-store'; // Import Zustand store
import { fetchChatHistory, saveChatMessage } from '@/actions/chat-history'; // Import Supabase actions
import type { MessageHistory } from "@/lib/supabase-client"; // Import the type for messages from DB


// Use MessageHistory type for consistency
type Message = MessageHistory;

interface ChatWindowProps {}

export const ChatWindow: FC<ChatWindowProps> = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // State for loading history
  const { toast } = useToast();
  const { apiKey, apiSecret, isTestnet } = useAssetStore(state => ({
    apiKey: state.apiKey,
    apiSecret: state.apiSecret,
    isTestnet: state.isTestnet,
  }));

  const viewportRef = useRef<HTMLDivElement>(null);

  // Fetch initial chat history on component mount
  useEffect(() => {
    const loadHistory = async () => {
      console.log("[ChatWindow] Fetching chat history...");
      setIsLoadingHistory(true);
      const result = await fetchChatHistory();
      if (result.success) {
        console.log(`[ChatWindow] Successfully fetched ${result.data.length} messages.`);
        // Map roles if necessary, assuming DB roles match 'user' | 'bot'
        setMessages(result.data);
      } else {
        console.error("[ChatWindow] Error fetching chat history:", result.error);
        toast({
          title: "Error Loading History",
          description: `Failed to fetch chat history: ${result.error}`,
          variant: "destructive",
        });
      }
      setIsLoadingHistory(false);
    };
    loadHistory();
  }, [toast]); // Dependency array includes toast

  // Scroll to bottom effect
  useEffect(() => {
    if (viewportRef.current) {
      requestAnimationFrame(() => {
        if (viewportRef.current) {
          viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isLoading, isLoadingHistory]); // Include isLoadingHistory

  const handleSendMessage = async (messageContent: string) => {
    const newUserMessage: Message = { role: "user", content: messageContent };
    // Immediately display the user message
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true); // Start loading for AI response

    // Save user message to Supabase (don't wait for it to finish to show AI response)
    saveChatMessage(newUserMessage).catch(err => {
      console.error("Failed to save user message:", err);
      toast({ title: "Error", description: "Could not save your message.", variant: "destructive" });
      // Optionally remove the message from UI if saving fails critically
      // setMessages(prev => prev.filter(m => m !== newUserMessage));
    });

    // Prepare for AI
    const credentialsAvailable = apiKey && apiSecret;
    if (!credentialsAvailable) {
      console.warn("[ChatWindow] API credentials NOT available in store. Trading intent might fail.");
    } else {
      console.log("[ChatWindow] API credentials found in store. Passing to generateResponse flow.");
    }

    // Get history for AI (use current UI state for context)
    const chatHistoryForAI = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const input: GenerateResponseInput = {
      message: messageContent,
      chatHistory: chatHistoryForAI,
      ...(credentialsAvailable && { apiKey: apiKey, apiSecret: apiSecret }),
      isTestnet: isTestnet ?? false,
    };

    try {
      console.log("[ChatWindow] Calling generateResponse with input:", { ...input, apiKey: input.apiKey ? '***' : undefined, apiSecret: input.apiSecret ? '***' : undefined });
      const result = await generateResponse(input);
      console.log("[ChatWindow] Received response from generateResponse:", result);

      const aiResponse: Message = { role: "bot", content: result.response };
      // Display AI response
      setMessages((prevMessages) => [...prevMessages, aiResponse]);

      // Save AI response to Supabase
      saveChatMessage(aiResponse).catch(err => {
        console.error("Failed to save AI response:", err);
        toast({ title: "Error", description: "Could not save the bot's response.", variant: "destructive" });
        // UI already shows the message, so no need to remove it on save failure typically
      });

    } catch (error: any) {
      console.error("Error generating AI response:", error);
      const errorMessage = error?.message || "Failed to get response from AI. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
       // Remove the user message if AI fails? Optional.
       // setMessages((prevMessages) => prevMessages.slice(0, -1));

    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-card">
      <CardHeader className="border-b border-border flex-shrink-0 p-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">YINSEN</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" viewportRef={viewportRef} orientation="both">
          <div className="space-y-2 p-3 min-w-max"> {/* Reduced space-y */}
            {/* Show loading skeletons for history */}
            {isLoadingHistory && (
              <>
                <Skeleton className="h-10 rounded-lg p-3 w-3/4 bg-muted ml-auto" />
                <Skeleton className="h-12 rounded-lg p-3 w-4/5 bg-muted" />
                <Skeleton className="h-10 rounded-lg p-3 w-2/3 bg-muted ml-auto" />
              </>
            )}
             {/* Render actual messages once loaded */}
            {!isLoadingHistory && messages.map((msg, index) => (
               // Use msg.id as key if available and unique, otherwise index
              <ChatMessage key={msg.id ?? index} role={msg.role} content={msg.content} />
            ))}
            {/* Loading indicator for AI response */}
            {isLoading && (
              <div className="flex items-start gap-2 justify-start pt-2"> {/* Adjusted gap and added padding */}
                <Skeleton className="h-8 w-8 rounded-full bg-muted flex-shrink-0 mt-1" />
                <Skeleton className="h-10 rounded-lg p-2.5 w-1/2 bg-muted" /> {/* Use similar padding */}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      {/* Input remains the same */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};
