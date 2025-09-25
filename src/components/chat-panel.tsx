'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendChatMessage, getConversationMessages } from '@/app/chat-actions';
import { supabase } from '@/lib/supabase';

type Message = { role: 'user' | 'assistant'; content: string };

type ChatPanelProps = {
  conversationId?: number | null;
};

export function ChatPanel({ conversationId: externalConvId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(externalConvId ?? undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, []);

  useEffect(() => {
    // Load messages when external conversation changes
    async function load() {
      if (!externalConvId || !userId) return;
      const res = await getConversationMessages(externalConvId, userId);
      if ((res as any).messages) {
        const msgs = (res as any).messages as Array<{role:'user'|'assistant'; content:string}>;
        setMessages(msgs.map(m => ({ role: m.role, content: m.content })));
        setConversationId(externalConvId);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalConvId, userId]);

  const onSend = async () => {
    const content = input.trim();
    if (!content) return;
    if (!userId) {
      toast({ variant: 'destructive', title: 'Chưa đăng nhập', description: 'Vui lòng đăng nhập để sử dụng chat.' });
      return;
    }
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChatMessage({ userId, conversationId, prompt: content });
      if ((res as any).error) throw new Error((res as any).error);
      const reply = (res as any).reply as string;
      const convId = (res as any).conversationId as number;
      setConversationId(convId);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: e.message || 'Không thể gửi tin nhắn.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex flex-col w-full h-full rounded-xl border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="flex-1 min-h-0 p-2">
          <ScrollArea className="h-full w-full pr-2">
            <div className="space-y-4 p-2">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-12">
                  Hãy bắt đầu cuộc trò chuyện với AI.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {m.content}
                  </div>
                  {m.role === 'user' && (
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="border-t p-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
              disabled={loading}
              className="rounded-full"
            />
            <Button onClick={onSend} disabled={loading || !input.trim()} className="rounded-full px-3">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


