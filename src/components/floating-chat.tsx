'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, PanelLeftClose, PanelRightOpen } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChatPanel } from '@/components/chat-panel';
import { listConversations, getConversationMessages } from '@/app/chat-actions';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<{id:number; title:string; created_at:string}>>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        const res = await listConversations(uid);
        if ((res as any).conversations) setConversations((res as any).conversations);
      }
    });
  }, [open]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[420px] sm:w-[820px] p-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
            <SheetHeader>
              <SheetTitle className="text-base">Chat với AI</SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(v => !v)} title="Lịch sử hội thoại">
                {showHistory ? <PanelLeftClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-3 grid grid-cols-3 gap-3">
            {showHistory && (
            <div className="col-span-1 border rounded-lg overflow-hidden">
              <div className="p-2 border-b text-sm font-medium">Cuộc hội thoại</div>
              <div className="max-h-[72vh] overflow-auto">
                {conversations.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-3">Chưa có cuộc hội thoại</div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${activeConv === c.id ? 'bg-accent' : ''}`}
                      onClick={() => setActiveConv(c.id)}
                    >
                      {c.title || `Cuộc hội thoại #${c.id}`}
                    </button>
                  ))
                )}
              </div>
            </div>
            )}
            <div className={showHistory ? 'col-span-2' : 'col-span-3'}>
              <div className="h-full">
                <ChatPanel conversationId={activeConv ?? undefined} />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Button
        aria-label="Mở chat"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    </>
  );
}


