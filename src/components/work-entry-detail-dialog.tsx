'use client';

import { useMemo } from 'react';
import type { WorkLogEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type WorkEntryDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: WorkLogEntry | null;
};

export function WorkEntryDetailDialog({ open, onOpenChange, entry }: WorkEntryDetailDialogProps) {
  const isImage = useMemo(() => {
    if (!entry?.file_url) return false;
    return /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)$/i.test(entry.file_url);
  }, [entry?.file_url]);

  const isPDF = useMemo(() => {
    if (!entry?.file_url) return false;
    return /(\.pdf)$/i.test(entry.file_url);
  }, [entry?.file_url]);

  const isOfficeDoc = useMemo(() => {
    if (!entry?.file_url) return false;
    return /(\.(doc|docx|ppt|pptx|xls|xlsx))$/i.test(entry.file_url);
  }, [entry?.file_url]);

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{entry.title}</span>
            <Badge variant="secondary">{entry.category}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Giờ bắt đầu:</span>
            <span className="font-medium">{entry.start_time || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Giờ kết thúc:</span>
            <span className="font-medium">{entry.end_time || '-'}</span>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Chi tiết công việc</div>
            <div className="whitespace-pre-wrap">{entry.description}</div>
          </div>
          {entry.file_url && (
            <div className="space-y-2">
              <div className="text-muted-foreground">Tệp đính kèm</div>
              <div className="border rounded-md p-2 space-y-2">
                {isImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.file_url} alt={entry.file_name || 'attachment'} className="w-full max-h-[70vh] object-contain rounded" />
                )}
                {!isImage && isPDF && (
                  <iframe src={`${entry.file_url}#view=fitH`} className="w-full h-[70vh] rounded" title={entry.file_name || 'pdf'} />
                )}
                {!isImage && !isPDF && isOfficeDoc && (
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(entry.file_url)}`}
                    className="w-full h-[70vh] rounded"
                    title={entry.file_name || 'office-document'}
                  />
                )}
                {!isImage && !isPDF && !isOfficeDoc && (
                  <div className="text-sm text-muted-foreground">
                    Không hỗ trợ preview loại tệp này. Vui lòng tải xuống để xem.
                  </div>
                )}
                <div className="flex justify-end">
                  <Button asChild variant="outline" size="sm">
                    <a href={entry.file_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" /> Tải tệp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


