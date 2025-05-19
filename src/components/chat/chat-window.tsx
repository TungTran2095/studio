// src/components/chat/chat-window.tsx
"use client";

import type { FC, MouseEvent, TouchEvent } from "react"; // Added touch event
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { generateResponse } from "@/ai/flows/generate-response";
import type { GenerateResponseInput } from "@/ai/flows/generate-response";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { useAssetStore } from '@/store/asset-store';
import { fetchChatHistory, saveChatMessage } from '@/actions/chat-history';
import type { MessageHistory } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bot as BotIcon, MessageSquare, ArrowDown } from "lucide-react";
import { Bot } from "lucide-react";
import { executeChatTrade } from "@/actions/chat-trade";

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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { toast } = useToast();
  
  // Use credentials from the Zustand store
  const { apiKey, apiSecret, isTestnet, isConnected } = useAssetStore(state => ({
    apiKey: state.apiKey,
    apiSecret: state.apiSecret,
    isTestnet: state.isTestnet,
    isConnected: state.isConnected, // Get connection status
  }));

  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Kiểm tra vị trí cuộn để hiển thị nút cuộn xuống
  const checkScrollPosition = () => {
    if (!viewportRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

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
      // Sử dụng smooth scroll
      const scrollToBottom = () => {
        if (viewportRef.current) {
          viewportRef.current.scrollTo({
            top: viewportRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      };

      // Nếu đang tải hoặc vừa thêm tin nhắn mới, cuộn xuống
      if (isLoading || messages.length > 0) {
        scrollToBottom();
        // Sau khi cuộn, ẩn nút scroll down
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          setShowScrollButton(false);
        }, 500);
      }
    }
  }, [messages, isLoading, isLoadingHistory, isExpanded]);

  // Theo dõi sự kiện cuộn
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      checkScrollPosition();
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Hàm cuộn xuống dưới cùng khi nhấn nút
  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setShowScrollButton(false);
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    const userMessageClientId = `user-${Date.now()}`; // Simple client ID
    const newUserMessage: Message = { role: "user", content: messageContent, clientId: userMessageClientId, id: -1, created_at: new Date().toISOString() }; // Add dummy id/created_at

    // Immediately display the user message
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true); // Start loading for AI response

    // --- Save user message to Supabase ---
    console.log("[ChatWindow] Attempting to save user message to Supabase:", newUserMessage.clientId);
    saveChatMessage({ role: newUserMessage.role, content: newUserMessage.content })
      .then(result => {
        if (result.success) {
          console.log("[ChatWindow] User message saved successfully:", newUserMessage.clientId);
        } else {
          console.error("[ChatWindow] Failed to save user message:", newUserMessage.clientId, result.error);
          toast({ title: "Error Saving Message", description: `Could not save your message: ${result.error}. Check console & Supabase RLS policies.`, variant: "destructive" });
        }
      })
      .catch(err => {
        console.error("[ChatWindow] Unexpected error calling saveChatMessage for user:", err);
        toast({ title: "Error", description: "An unexpected error occurred while saving your message.", variant: "destructive" });
      });

    // Prepare for AI
    const credentialsAvailable = isConnected && apiKey && apiSecret;
    if (!credentialsAvailable) {
      console.warn("[ChatWindow] Binance not connected or API credentials NOT available in store. Trading intent might fail.");
    } else {
      console.log("[ChatWindow] Binance connected and API credentials found in store. Passing to generateResponse flow.");
    }

    // Get history for AI (use current UI state for context, exclude clientIds)
    const recentMessagesLimit = 15; // Tăng từ 10 lên 15 tin nhắn gần nhất
    const chatHistoryForAI = messages.slice(-recentMessagesLimit).map(({ role, content }) => ({
      role: (role as any) === "model" ? "bot" : role,
      content,
    }));

    // Pass credentials from store to the AI flow input
    const input: GenerateResponseInput = {
      message: messageContent,
      chatHistory: chatHistoryForAI,
      // Truyền API credentials cho trading nếu có
      apiKey: apiKey,
      apiSecret: apiSecret,
      isTestnet: isTestnet,
    };

    try {
      console.log("[ChatWindow] Calling generateResponse with input:", { 
        message: input.message, 
        chatHistoryLength: input.chatHistory?.length 
      });
      const result = await generateResponse(input);
      console.log("[ChatWindow] Received response from generateResponse:", result);

      // Kiểm tra nếu AI phát hiện ý định giao dịch
      if (result.tradingIntent && result.tradingIntent.detected && isConnected && apiKey && apiSecret) {
        console.log("[ChatWindow] Phát hiện ý định giao dịch, thực hiện giao dịch...");
        const tradeResult = await executeChatTrade(
          result, 
          apiKey as string, 
          apiSecret as string, 
          isTestnet
        );
        
        // Thêm kết quả giao dịch vào phản hồi
        if (tradeResult.success) {
          result.response += `\n\n✅ Đã thực hiện giao dịch thành công! ${tradeResult.message}`;
        } else {
          result.response += `\n\n❌ Không thể thực hiện giao dịch: ${tradeResult.message}`;
        }
      } else if (result.tradingIntent && result.tradingIntent.detected && (!isConnected || !apiKey || !apiSecret)) {
        result.response += `\n\n❌ Không thể thực hiện giao dịch vì bạn chưa kết nối tài khoản Binance. Vui lòng kết nối trong phần "Binance Account".`;
      }

      const botMessageClientId = `bot-${Date.now()}`;
      // Luôn gán role là 'bot' cho message AI
      const aiResponse: Message = { role: "bot", content: result.response, clientId: botMessageClientId, id: -2, created_at: new Date().toISOString() };
      
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
    } catch (error: any) {
      console.error("[ChatWindow] Error generating AI response:", error);
      let displayError = error?.message || "Failed to get response from AI. Please try again.";
      
      // Check for the specific schema validation error from Genkit
      if (error.message && error.message.includes("Schema validation failed") && error.message.includes('Expected object, received null')) {
        displayError = "The AI returned an invalid response format (null). Please try again.";
        console.error("[ChatWindow] AI returned null output, expected { response: string }");
      } else if (error.message && (
        error.message.includes("I need your API Key and API Secret") || 
        error.message.includes("I do not have access to your API Key")
      )) {
        displayError = "Connect your Binance account in the 'Binance Account' panel to use trading features.";
      }

      toast({
        title: "Error Generating Response",
        description: displayError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  return (
    <Card className={cn(
      "flex flex-col h-full w-full overflow-hidden border-l shadow-md transition-all duration-200 ease-in-out",
      isExpanded ? "border bg-card" : "border-0 bg-card/95 backdrop-blur-sm"
    )}>
      <CardHeader className="p-3 border-b flex-shrink-0 flex flex-row items-center justify-between bg-card">
        <CardTitle className={cn(
          "text-sm font-medium flex items-center gap-1.5 transition-all",
          isExpanded ? "opacity-100" : "opacity-0 w-0"
        )}>
          <Bot className="h-4 w-4 text-primary" />
          YINSEN
        </CardTitle>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle} 
          className={cn(
            "h-7 w-7 flex-shrink-0 rounded-full",
            !isExpanded && "bg-primary/10 hover:bg-primary/20 text-primary"
          )}
        >
           {isExpanded ? <ChevronRight className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
           <span className="sr-only">{isExpanded ? 'Thu gọn' : 'Mở rộng'} Chat</span>
        </Button>
      </CardHeader>

      <CardContent className={cn(
        "flex-1 p-0 overflow-hidden flex flex-col",
        !isExpanded && "opacity-0 p-0 h-0"
      )}>
        <ScrollArea 
          className="flex-1 w-full relative" 
          viewportRef={viewportRef}
          type="auto"
        >
          <div className={cn(
            "w-full min-h-full", 
            !isExpanded && "hidden"
          )}>
            {/* Tin nhắn chào mừng */}
            {messages.length === 0 && !isLoadingHistory && (
              <div className="p-4 text-center flex flex-col items-center justify-center h-full gap-3">
                <Avatar className="h-12 w-12 border bg-primary/10">
                  <AvatarFallback className="bg-primary/20">
                    <Bot className="h-6 w-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-md space-y-2">
                  <h3 className="text-base font-medium">YINSEN - Trợ lý giao dịch của bạn</h3>
                  <p className="text-sm text-muted-foreground">
                    Trò chuyện với YINSEN để nhận trợ giúp về giao dịch crypto và các thông tin thị trường.
                  </p>
                </div>
              </div>
            )}
            
            {/* Loading skeleton */}
            {isLoadingHistory && (
              <>
                {/* Skeleton messages in new style */}
                <div className="py-4 px-4 border-b border-border/20">
                  <div className="flex gap-3 items-start">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-20 bg-muted" />
                      <Skeleton className="h-16 w-full bg-muted" />
                    </div>
                  </div>
                </div>
                <div className="py-4 px-4 border-b border-border/20 bg-muted/30">
                  <div className="flex gap-3 items-start">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-20 bg-muted" />
                      <Skeleton className="h-20 w-full bg-muted" />
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Messages */}
            {messages.length > 0 && messages.map((message) => (
              <ChatMessage
                key={message.clientId || message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            
            {/* Loading indicator for new message */}
            {isLoading && (
              <div className="px-4 py-5 flex gap-4 border-b border-border/20 bg-muted/30 animate-pulse">
                <div className="flex-shrink-0 pt-1">
                  <Avatar className="h-8 w-8 border bg-primary/10">
                    <AvatarFallback className="bg-primary/20">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-16 bg-muted" />
                  <Skeleton className="h-4 w-3/4 bg-muted" />
                  <Skeleton className="h-4 w-1/2 bg-muted" />
                </div>
              </div>
            )}
          </div>
          
          {/* Nút cuộn xuống */}
          {showScrollButton && (
            <Button
              size="icon"
              variant="outline"
              className="absolute bottom-4 right-4 h-8 w-8 rounded-full shadow-md bg-background/90 backdrop-blur-sm"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-4 w-4" />
              <span className="sr-only">Cuộn xuống</span>
            </Button>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className={cn(
        "p-2 border-t mt-auto flex-shrink-0 bg-card",
        !isExpanded && "opacity-0 p-0 h-0"
      )}>
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </CardFooter>
    </Card>
  );
};
