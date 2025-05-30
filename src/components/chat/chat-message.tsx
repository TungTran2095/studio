// src/components/chat/chat-message.tsx
"use client";

import type { FC } from "react";
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "bot";
  content: string;
}

export const ChatMessage: FC<ChatMessageProps> = ({ role, content }) => {
  const isUser = role === "user";
  // Role chỉ có thể là "user" hoặc "bot"
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Tham chiếu đến tin nhắn để xử lý cắt khoảng trắng và định dạng
  useEffect(() => {
    if (contentRef.current) {
      // Đảm bảo rằng tin nhắn dài được hiển thị đầy đủ bất kể độ dài
      contentRef.current.style.minHeight = "auto";
      contentRef.current.style.maxHeight = "none"; // Không giới hạn chiều cao tối đa
      contentRef.current.style.wordBreak = "break-word"; // Đảm bảo từ dài sẽ được ngắt xuống dòng
    }
  }, [content]);
  
  // Định dạng nội dung văn bản thông thường (không phải code)
  const formatTextContent = (text: string) => {
    // Đảm bảo text đầy đủ, không bị cắt
    if (!text) return '';
    
    // Xử lý xuống dòng
    const withLineBreaks = text.replace(/\n/g, '<br/>');
    
    // Xử lý nhiều dòng trống liên tiếp
    const withCleanLineBreaks = withLineBreaks.replace(/(<br\/>){3,}/g, '<br/><br/>');
    
    // Thay thế các URL bằng links có thể click
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const withLinks = withCleanLineBreaks.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-words">${url}</a>`;
    });
    
    return withLinks;
  };
  
  // Nhận diện và định dạng nội dung có chứa mã
  const hasCodeBlock = content.includes("```") || (content.includes("{") && content.includes("}"));
  
  // Xử lý nội dung để hiển thị
  const processContent = () => {
    if (hasCodeBlock) {
      // Định dạng mã
      const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g;
      let formattedContent = content;
      
      // Xử lý các khối mã với cú pháp Markdown
      formattedContent = formattedContent.replace(codeBlockRegex, (_, language, code) => {
        const lang = language ? language.toLowerCase() : '';
        return `<div class="bg-muted rounded-md my-3 p-3 overflow-auto max-w-full">
          <div class="flex items-center justify-between mb-1">
            <div class="text-xs text-muted-foreground">${lang || 'code'}</div>
          </div>
          <pre class="text-xs md:text-sm font-mono whitespace-pre overflow-x-auto">${code}</pre>
        </div>`;
      });
      
      // Xử lý JSON nếu có
      if (formattedContent.includes("{") && formattedContent.includes("}") && !formattedContent.includes("```")) {
        const jsonRegex = /{[\s\S]*?}/g;
        formattedContent = formattedContent.replace(jsonRegex, (match) => {
          try {
            // Cố gắng định dạng JSON
            const parsed = JSON.parse(match);
            const formattedJson = JSON.stringify(parsed, null, 2);
            return `<div class="bg-muted rounded-md my-3 p-3 overflow-auto max-w-full">
              <div class="flex items-center justify-between mb-1">
                <div class="text-xs text-muted-foreground">json</div>
              </div>
              <pre class="text-xs md:text-sm font-mono whitespace-pre overflow-x-auto">${formattedJson}</pre>
            </div>`;
          } catch {
            return match;
          }
        });
      }
      
      // Định dạng các đoạn văn bản thường xen kẽ với mã
      const parts = formattedContent.split(/(<div class="bg-muted.*?<\/div>)/g);
      formattedContent = parts.map(part => {
        if (part.startsWith('<div class="bg-muted')) {
          return part;
        }
        if (part.trim()) {
          return formatTextContent(part);
        }
        return part;
      }).join('');
      
      return { __html: formattedContent };
    }
    
    // Nếu không phải mã, xử lý tin nhắn thông thường
    return { __html: formatTextContent(content) };
  };

  return (
    <div className={cn(
      "border-b border-border/20 last:border-0 transition-all duration-200",
      isUser ? "bg-card/30 backdrop-blur-sm" : "bg-muted/20 backdrop-blur-sm"
    )}>
      <div className="px-4 py-5 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-1">
          <Avatar className={cn(
            "h-8 w-8 border border-border/20 transition-all duration-200",
            isUser ? "bg-background/50 backdrop-blur-sm" : "bg-primary/10 backdrop-blur-sm"
          )}>
            <AvatarFallback className={isUser ? "bg-primary/10" : "bg-primary/20"}>
              {isUser ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-primary" />}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Nội dung tin nhắn */}
        <div className="flex-1 overflow-hidden min-w-0">
          {/* Tiêu đề tin nhắn */}
          <div className="font-medium text-sm mb-2">
            {isUser ? "Bạn" : "YINSEN"}
          </div>
          
          {/* Nội dung tin nhắn */}
          <div 
            ref={contentRef}
            className={cn(
              "text-sm leading-relaxed text-foreground/90 break-words whitespace-pre-line",
              "prose prose-sm max-w-none overflow-visible",
              "prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-lg",
              "prose-p:my-1.5 prose-strong:font-semibold prose-strong:text-foreground",
              "transition-all duration-200"
            )}
            dangerouslySetInnerHTML={processContent()}
          />
        </div>
      </div>
    </div>
  );
};
