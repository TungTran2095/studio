'use client';

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { WorkLogEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  Inbox,
  Calendar as CalendarIcon,
  Search,
  Clock,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Skeleton } from './ui/skeleton';

type WorkHistoryProps = {
  entries: WorkLogEntry[];
  loading: boolean;
};

export function WorkHistory({ entries, loading }: WorkHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const isTitleMatch = entry.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const entryDate = new Date(entry.timestamp);
      // Reset time part of dates for accurate comparison
      const fromDate = dateRange?.from ? new Date(dateRange.from.setHours(0, 0, 0, 0)) : null;
      const toDate = dateRange?.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : null;
      
      const isDateMatch =
        !dateRange ||
        !dateRange.from ||
        (entryDate >= fromDate! && (!toDate || entryDate <= toDate));

      return isTitleMatch && isDateMatch;
    });
  }, [entries, searchTerm, dateRange]);
  
  const HistorySkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3 p-4 border rounded-lg">
          <div className="flex justify-between items-start">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-4">
             <Skeleton className="h-5 w-24" />
             <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Lịch sử công việc
        </CardTitle>
        <CardDescription>
          Xem lại và tìm kiếm các công việc đã được ghi nhận.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên công việc..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-full sm:w-[300px] justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy', { locale: vi })} -{' '}
                      {format(dateRange.to, 'dd/MM/yyyy', { locale: vi })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy', { locale: vi })
                  )
                ) : (
                  <span>Chọn khoảng thời gian</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={vi}
              />
            </PopoverContent>
          </Popover>
        </div>
        <ScrollArea className="flex-grow pr-4">
           {loading ? <HistorySkeleton /> :
            filteredEntries.length > 0 ? (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 p-4 border rounded-lg bg-card-background/50">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-base">{entry.title}</h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                      {formatDistanceToNow(entry.timestamp, {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </span>
                  </div>
                   <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{entry.category}</Badge>
                     {entry.startTime && entry.endTime && (
                       <div className="flex items-center gap-1">
                         <Clock className="h-3 w-3" />
                         <span>{entry.startTime} - {entry.endTime}</span>
                       </div>
                     )}
                     {entry.fileUrl && entry.fileName && (
                        <a 
                          href={entry.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>{entry.fileName}</span>
                        </a>
                     )}
                   </div>
                  <p className="text-muted-foreground text-sm">{entry.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted h-full text-center text-muted-foreground p-8">
              <Inbox className="h-12 w-12 mb-4" />
              <h3 className="font-semibold text-lg">Không có công việc nào</h3>
              <p className="text-sm">
                Bạn chưa ghi nhận công việc nào hoặc không tìm thấy kết quả phù hợp.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
