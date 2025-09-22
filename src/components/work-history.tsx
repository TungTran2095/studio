'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { WorkLogEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { History, FileText, Inbox } from 'lucide-react';

type WorkHistoryProps = {
  entries: WorkLogEntry[];
};

export function WorkHistory({ entries }: WorkHistoryProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <History className="h-6 w-6 text-accent" />
          Lịch sử công việc
        </CardTitle>
        <CardDescription>Toàn bộ các công việc đã được ghi nhận.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px] pr-4">
          {entries.length > 0 ? (
            <div className="space-y-6">
              {entries.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-2 p-4 border rounded-lg bg-background/50">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-semibold text-base font-headline">
                        {entry.title}
                      </h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                        {formatDistanceToNow(entry.timestamp, {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className='bg-primary/20 text-primary-foreground border-primary/30 hover:bg-primary/30'>{entry.category}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {entry.description}
                    </p>
                    {entry.fileName && (
                      <div className="flex items-center gap-2 text-sm text-accent mt-1">
                        <FileText className="h-4 w-4" />
                        <span>{entry.fileName}</span>
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted h-[400px] text-center text-muted-foreground p-8">
              <Inbox className="h-12 w-12 mb-4" />
              <h3 className="font-semibold text-lg font-headline">Chưa có công việc nào</h3>
              <p className="text-sm">
                Hãy bắt đầu bằng cách thêm một báo cáo công việc mới.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
