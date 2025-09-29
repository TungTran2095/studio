'use client';

import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendChatMessage, getConversationMessages, listConversations } from '@/app/chat-actions';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

type Message = { 
  role: 'user' | 'assistant'; 
  content: string; 
  hasData?: boolean;
  timestamp?: Date;
};

type ChatPanelProps = {
  conversationId?: number | null;
};

export function ChatPanel({ conversationId: externalConvId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(externalConvId ?? undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const suggestedQuestions = [
    "Hôm nay tôi làm được bao nhiêu việc rồi?",
    "Thống kê công việc tuần này",
    "Công việc gần đây nhất của tôi",
    "Tìm kiếm công việc về 'thiết kế'",
    "Báo cáo tổng quan tháng này"
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, []);

  useEffect(() => {
    // Load conversations
    async function loadConversations() {
      if (!userId) return;
      const res = await listConversations(userId);
      if ((res as any).conversations) {
        setConversations((res as any).conversations);
      }
    }
    loadConversations();
  }, [userId]);

  useEffect(() => {
    // Load messages when external conversation changes
    async function load() {
      if (!externalConvId || !userId) return;
      const res = await getConversationMessages(externalConvId, userId);
      if ((res as any).messages) {
        const msgs = (res as any).messages as Array<{role:'user'|'assistant'; content:string; created_at: string}>;
        setMessages(msgs.map(m => ({ 
          role: m.role, 
          content: m.content,
          timestamp: new Date(m.created_at)
        })));
        setConversationId(externalConvId);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalConvId, userId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = async () => {
    const content = input.trim();
    if (!content || !userId) return;
    
    setMessages((prev) => [...prev, { 
      role: 'user', 
      content,
      timestamp: new Date()
    }]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await sendChatMessage({ userId, conversationId, prompt: content });
      if ((res as any).error) throw new Error((res as any).error);
      const reply = (res as any).reply as string;
      const hasData = (res as any).hasData as boolean;
      const convId = (res as any).conversationId as number;
      
      setConversationId(convId);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: reply,
        hasData,
        timestamp: new Date()
      }]);
      
      // Reload conversations to update list
      const convRes = await listConversations(userId);
      if ((convRes as any).conversations) {
        setConversations((convRes as any).conversations);
      }
    } catch (e: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Lỗi', 
        description: e.message || 'Không thể gửi tin nhắn.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (convId: number) => {
    if (!userId) return;
    const res = await getConversationMessages(convId, userId);
    if ((res as any).messages) {
      const msgs = (res as any).messages as Array<{role:'user'|'assistant'; content:string; created_at: string}>;
      setMessages(msgs.map(m => ({ 
        role: m.role, 
        content: m.content,
        timestamp: new Date(m.created_at)
      })));
      setConversationId(convId);
    }
  };

  return (
    <div className="flex h-screen w-[370px]">
      {/* History Sidebar */}
      {showHistory && (
        <div className="w-80 border-r bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Lịch sử hội thoại</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(false)}
            >
              ✕
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)] pr-2">
            <div className="space-y-2 pb-4">
              {conversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant={conversationId === conv.id ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm truncate w-full">
                      {conv.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col w-full h-full rounded-xl border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages - Scrollable Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: '720px' }}>
          <div className="p-1 space-y-1">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Chào bạn!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tôi có thể giúp bạn tìm hiểu về công việc của mình.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Câu hỏi gợi ý:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {suggestedQuestions.map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setInput(question)}
                          className="text-xs"
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Demo messages hidden */}
                  {false && (
                    <div className="mt-8 space-y-4 text-left">
                      <p className="text-xs text-muted-foreground text-center">Demo scroll (sẽ tự động ẩn khi có tin nhắn thật):</p>
                      {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
                          {i % 2 === 1 && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            i % 2 === 0 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            <div className="whitespace-pre-wrap">
                              Tin nhắn demo {i + 1} - Đây là nội dung dài để test scroll. 
                              Khi có nhiều tin nhắn, bạn sẽ thấy thanh scroll xuất hiện ở bên phải.
                              Tin nhắn này được tạo ra để kiểm tra tính năng scroll của chat.
                            </div>
                          </div>
                          {i % 2 === 0 && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm break-words ${
                    m.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs">
                        {m.role === 'user' ? 'Bạn' : 'AI Assistant'}
                      </span>
                      {m.hasData && (
                        <Badge variant="secondary" className="text-xs">
                          Có dữ liệu
                        </Badge>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.timestamp && (
                      <div className="text-xs opacity-70 mt-1">
                        {m.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Đang xử lý...</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Auto scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input - Fixed at bottom */}
        <div className="p-2 flex-shrink-0 bg-background border-t">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Hỏi tôi về công việc của bạn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
              disabled={loading}
              className="rounded-full h-8"
            />
            <Button 
              onClick={onSend} 
              disabled={loading || !input.trim()} 
              className="rounded-full px-3 h-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}