'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { WorkLogEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar as CalendarIcon, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { WorkEntryDetailDialog } from '@/components/work-entry-detail-dialog';

type WorkCalendarProps = {
  entries: WorkLogEntry[];
};

export function WorkCalendar({ entries }: WorkCalendarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<WorkLogEntry | null>(null);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const inSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (!dateRange?.from) return inSearch;
      const entryDate = new Date(e.timestamp);
      const fromDate = new Date(dateRange.from.setHours(0, 0, 0, 0));
      const toDate = dateRange.to
        ? new Date(dateRange.to.setHours(23, 59, 59, 999))
        : new Date(dateRange.from.setHours(23, 59, 59, 999));
      return inSearch && entryDate >= fromDate && entryDate <= toDate;
    });
  }, [entries, dateRange, searchTerm]);

  // Nhóm theo ngày (yyyy-MM-dd)
  const groupedByDay = useMemo(() => {
    const groups: Record<string, WorkLogEntry[]> = {};
    for (const e of filtered) {
      const key = format(new Date(e.timestamp), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filtered]);

  // Tạo set ngày có việc để render dot trong ô ngày
  const daysWithEntries = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      set.add(format(new Date(e.timestamp), 'yyyy-MM-dd'));
    }
    return set;
  }, [entries]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Lịch làm việc</CardTitle>
        <CardDescription>Chọn khoảng thời gian để xem công việc đã ghi nhận.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Input
              placeholder="Tìm theo tên công việc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn('w-full sm:w-[300px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy', { locale: vi })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: vi })}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-1">
            <Calendar
              mode="single"
              selected={dateRange?.from}
              onSelect={(d) => setDateRange(d ? { from: d, to: d } : undefined)}
              locale={vi}
              numberOfMonths={1}
              classNames={{
                day: 'relative h-10 w-10 p-0 font-medium aria-selected:opacity-100',
                cell: 'h-10 w-10 text-center text-sm p-0 relative',
                head_cell: 'text-muted-foreground w-10 font-normal text-[0.75rem]'
              }}
              components={{
                DayContent: (props) => {
                  const date = props.date as unknown as Date;
                  const key = format(date, 'yyyy-MM-dd');
                  const has = daysWithEntries.has(key);
                  return (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="relative">
                        <span>{date.getDate()}</span>
                        {has && (
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 block h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  );
                },
              }}
            />
          </div>
          <ScrollArea className="md:col-span-1 h-[480px] pr-4">
            {groupedByDay.length === 0 ? (
              <div className="text-sm text-muted-foreground">Không có công việc nào trong khoảng đã chọn.</div>
            ) : (
              <div className="space-y-4">
                {groupedByDay.map(([day, items]) => (
                  <div key={day} className="space-y-2">
                    <div className="text-sm font-medium">
                      {format(new Date(day), 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </div>
                    <div className="space-y-2">
                      {items.map((e) => (
                        <div key={e.id} className="p-3 border rounded-md">
                          <div className="flex justify-between items-start">
                            <div className="font-semibold text-sm">{e.title}</div>
                            <div className="flex items-center gap-2">
                              <button
                                aria-label="Xem chi tiết"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => { setSelected(e); setOpen(true); }}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <Badge variant="secondary">{e.category}</Badge>
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" /> {e.start_time} - {e.end_time}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {e.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <WorkEntryDetailDialog open={open} onOpenChange={setOpen} entry={selected} />
        </div>
      </CardContent>
    </Card>
  );
}


