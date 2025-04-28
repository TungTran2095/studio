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
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);


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
       // Optionally remove the user's message if the AI fails
      // setMessages((prevMessages) => prevMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-4rem)] max-h-[800px] w-full max-w-2xl mx-auto my-8 shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="text-center text-lg font-semibold">EchoBot</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <ChatMessage key={index} role={msg.role} content={msg.content} />
            ))}
             {isLoading && (
                <div className="flex items-start gap-3 justify-start">
                  <Skeleton className="h-8 w-8 rounded-full border border-border" />
                  <Skeleton className="h-10 rounded-lg p-3 shadow-sm w-1/4" />
              </div>
             )}
          </div>
        </ScrollArea>
      </CardContent>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </Card>
  );
};
