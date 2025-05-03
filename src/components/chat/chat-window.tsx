// src/components/chat/chat-window.tsx
"use client";

import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Import Card for structure
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { generateResponse } from "@/ai/flows/generate-response";
import type { GenerateResponseInput } from "@/ai/flows/generate-response";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Import Avatar components
import { cn } from '@/lib/utils';
import { useAssetStore } from '@/store/asset-store'; // Import Zustand store
import { fetchChatHistory, saveChatMessage } from '@/actions/chat-history'; // Import Supabase actions
import type { MessageHistory } from "@/lib/supabase-client"; // Import the type for messages from DB
import { Button } from "@/components/ui/button"; // Import Button
// Updated icons: MessageCircle for collapsed state, ChevronRight for expanded
import { ChevronLeft, MessageCircle } from "lucide-react"; // Use ChevronLeft for collapse

// Use MessageHistory type for consistency
// Add a temporary client-side ID for rendering keys before DB ID exists
type Message = MessageHistory & { clientId?: string };

// Added props for expansion state and toggle function
interface ChatWindowProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const ChatWindow: FC<ChatWindowProps> = ({ isExpanded, onToggle }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // State for loading history
  const { toast } = useToast();
  // Use Supabase service key from environment variables
  // const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';
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
        console.log(`[ChatWindow] Successfully fetched ${result.data.length} messages from DB.`);
        // Map roles if necessary, assuming DB roles match 'user' | 'bot'
        setMessages(result.data);
      } else {
        console.error("[ChatWindow] Error fetching chat history:", result.error);
        toast({
          title: "Error Loading History",
          description: `Failed to fetch chat history: ${result.error}. Check console & Supabase RLS policies.`,
          variant: "destructive",
        });
      }
      setIsLoadingHistory(false);
    };
    loadHistory();
  }, [toast]); // Dependency array includes toast

  // Scroll to bottom effect
  useEffect(() => {
    if (viewportRef.current && isExpanded) { // Only scroll if expanded
      requestAnimationFrame(() => {
        if (viewportRef.current) {
          viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isLoading, isLoadingHistory, isExpanded]); // Include isExpanded

  const handleSendMessage = async (messageContent: string) => {
    const userMessageClientId = `user-${Date.now()}`; // Simple client ID
    const newUserMessage: Message = { role: "user", content: messageContent, clientId: userMessageClientId };

    // Immediately display the user message
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true); // Start loading for AI response

    // --- Save user message to Supabase ---
    console.log("[ChatWindow] Attempting to save user message to Supabase:", newUserMessage.clientId);
    saveChatMessage({ role: newUserMessage.role, content: newUserMessage.content })
      .then(result => {
        if (result.success) {
          console.log("[ChatWindow] User message saved successfully:", newUserMessage.clientId);
          // Optionally update the message in state with DB ID if needed, but usually not necessary
        } else {
          console.error("[ChatWindow] Failed to save user message:", newUserMessage.clientId, result.error);
          toast({ title: "Error Saving Message", description: `Could not save your message: ${result.error}. Check console & Supabase RLS policies.`, variant: "destructive" });
          // Optionally remove the message from UI if saving fails critically
          // setMessages(prev => prev.filter(m => m.clientId !== newUserMessage.clientId));
        }
      })
      .catch(err => {
        console.error("[ChatWindow] Unexpected error calling saveChatMessage for user:", err);
        toast({ title: "Error", description: "An unexpected error occurred while saving your message.", variant: "destructive" });
      });
    // --- End save user message ---


    // Prepare for AI
    const credentialsAvailable = apiKey && apiSecret;
    if (!credentialsAvailable) {
      console.warn("[ChatWindow] API credentials NOT available in store. Trading intent might fail.");
    } else {
      console.log("[ChatWindow] API credentials found in store. Passing to generateResponse flow.");
    }

    // Get history for AI (use current UI state for context, exclude clientIds)
     // Limit history sent to AI to avoid overly large context
     const recentMessagesLimit = 10; // Example limit
     const chatHistoryForAI = messages.slice(-recentMessagesLimit).map(({ role, content }) => ({
       role,
       content,
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

      const botMessageClientId = `bot-${Date.now()}`;
      const aiResponse: Message = { role: "bot", content: result.response, clientId: botMessageClientId };
      // Display AI response
      setMessages((prevMessages) => [...prevMessages, aiResponse]);

      // --- Save AI response to Supabase ---
      console.log("[ChatWindow] Attempting to save AI response to Supabase:", aiResponse.clientId);
      saveChatMessage({ role: aiResponse.role, content: aiResponse.content })
      .then(saveResult => {
        if (saveResult.success) {
          console.log("[ChatWindow] AI response saved successfully:", aiResponse.clientId);
        } else {
          console.error("[ChatWindow] Failed to save AI response:", aiResponse.clientId, saveResult.error);
          toast({ title: "Error Saving Response", description: `Could not save the bot's response: ${saveResult.error}. Check console & Supabase RLS policies.`, variant: "destructive" });
        }
      })
      .catch(err => {
        console.error("[ChatWindow] Unexpected error calling saveChatMessage for AI:", err);
        toast({ title: "Error", description: "An unexpected error occurred while saving the bot's response.", variant: "destructive" });
      });
      // --- End save AI response ---


    } catch (error: any) {
      console.error("[ChatWindow] Error generating AI response:", error);
      const errorMessage = error?.message || "Failed to get response from AI. Please try again.";
       // Check if the error message contains the specific JSON schema validation failure
       let displayError = errorMessage;
       if (errorMessage.includes("Schema validation failed") && errorMessage.includes('"response":')) {
           displayError = "The AI returned an invalid response format. Please try rephrasing your request.";
           console.error("[ChatWindow] AI returned null or malformed output, expected { response: string }");
       }

      toast({
        title: "Error Generating Response",
        description: displayError, // Show potentially simplified error
        variant: "destructive",
      });
       // Remove the user message if AI fails? Optional.
       // setMessages((prevMessages) => prevMessages.filter(m => m.clientId !== newUserMessage.clientId));

    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  return (
    // Use Card for consistent styling with other panels
    <Card className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 ease-in-out border border-border shadow-md bg-card"
    )}>
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        {/* Show title only when expanded */}
        <CardTitle className={cn(
          "text-lg font-medium text-foreground transition-opacity duration-300 ease-in-out",
          !isExpanded && "opacity-0 w-0 overflow-hidden" // Hide title when collapsed
        )}>
          YINSEN
        </CardTitle>
        {/* Toggle Button */}
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-foreground flex-shrink-0">
           {/* Show ChevronLeft when expanded (to indicate collapse), MessageCircle when collapsed (to indicate expand) */}
           {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
           <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Chat</span>
        </Button>
      </CardHeader>

      {/* Conditionally render content based on isExpanded */}
      <CardContent className={cn(
        "flex-1 p-0 overflow-hidden flex flex-col", // Use flex-col for inner structure
        // Ensure content visibility matches expansion state
        !isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
         {isExpanded ? (
           <>
            {/* Enable horizontal and vertical scrolling */}
            <ScrollArea className="flex-1" viewportRef={viewportRef} orientation="both">
              {/* Wrap messages in a div that can expand horizontally */}
              <div className="space-y-1 p-3 min-w-max"> {/* Use min-w-max */}
                {isLoadingHistory && (
                  <>
                    {/* Skeletons for loading state */}
                     <div className="flex items-start gap-2 justify-end pt-1">
                        <Skeleton className="h-10 rounded-lg p-2.5 w-3/4 bg-muted rounded-br-none" />
                        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-accent"></AvatarFallback>
                        </Avatar>
                     </div>
                      <div className="flex items-start gap-2 justify-start pt-1">
                        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-accent"></AvatarFallback>
                        </Avatar>
                        <Skeleton className="h-12 rounded-lg p-2.5 w-4/5 bg-muted rounded-bl-none" />
                     </div>
                     <div className="flex items-start gap-2 justify-end pt-1">
                        <Skeleton className="h-10 rounded-lg p-2.5 w-2/3 bg-muted rounded-br-none" />
                        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-accent"></AvatarFallback>
                        </Avatar>
                     </div>
                  </>
                )}
                {!isLoadingHistory && messages.map((msg) => (
                  <ChatMessage key={msg.id ?? msg.clientId} role={msg.role} content={msg.content} />
                ))}
                {isLoading && (
                  <div className="flex items-start gap-2 justify-start pt-1"> {/* Loading indicator for bot response */}
                    <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1">
                      <AvatarFallback className="bg-accent"></AvatarFallback>
                    </Avatar>
                    <Skeleton className="h-10 rounded-lg p-2.5 w-1/2 bg-muted rounded-bl-none" />
                  </div>
                )}
              </div>
            </ScrollArea>
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
           </>
         ) : (
            // When collapsed, content is effectively hidden by the parent CardContent opacity styles.
            // The toggle button remains in the CardHeader.
            null // Render nothing inside CardContent when collapsed
         )}
      </CardContent>
    </Card>
  );
};
