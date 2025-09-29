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
  const fileUrls = useMemo(() => {
    if (!entry?.file_url) return [];
    return entry.file_url.split('|');
  }, [entry?.file_url]);

  const fileNames = useMemo(() => {
    if (!entry?.file_name) return [];
    return entry.file_name.split('|');
  }, [entry?.file_name]);

  const getFileType = (url: string) => {
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)$/i.test(url)) return 'image';
    if (/(\.pdf)$/i.test(url)) return 'pdf';
    if (/(\.(doc|docx|ppt|pptx|xls|xlsx))$/i.test(url)) return 'office';
    return 'other';
  };

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
          {fileUrls.length > 0 && (
            <div className="space-y-2">
              <div className="text-muted-foreground">Tệp đính kèm ({fileUrls.length} tệp)</div>
              <div className="space-y-4">
                {fileUrls.map((fileUrl, index) => {
                  const fileName = fileNames[index] || `Tệp ${index + 1}`;
                  const fileType = getFileType(fileUrl);
                  
                  return (
                    <div key={index} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{fileName}</span>
                        <Button asChild variant="outline" size="sm">
                          <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" /> Tải xuống
                          </a>
                        </Button>
                      </div>
                      
                      {fileType === 'image' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fileUrl} alt={fileName} className="w-full max-h-[50vh] object-contain rounded" />
                      )}
                      {fileType === 'pdf' && (
                        <iframe src={`${fileUrl}#view=fitH`} className="w-full h-[50vh] rounded" title={fileName} />
                      )}
                      {fileType === 'office' && (
                        <iframe
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                          className="w-full h-[50vh] rounded"
                          title={fileName}
                        />
                      )}
                      {fileType === 'other' && (
                        <div className="text-sm text-muted-foreground p-4 text-center">
                          Không hỗ trợ preview loại tệp này. Vui lòng tải xuống để xem.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


