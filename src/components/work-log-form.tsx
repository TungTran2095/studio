'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ClipboardPenLine, Loader2 } from 'lucide-react';
import type { WorkLogEntry } from '@/lib/types';
import { submitWorkLog } from '@/app/actions';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formSchema = z.object({
  title: z.string().min(1, 'Tên công việc không được để trống.'),
  description: z.string().min(1, 'Chi tiết công việc không được để trống.'),
  startTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ (HH:mm).'),
  endTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ (HH:mm).'),
  attachments: z
    .array(z.instanceof(File))
    .min(1, 'Vui lòng chọn ít nhất một tệp đính kèm.')
    .max(5, 'Tối đa 5 tệp đính kèm.'),
});

type WorkLogFormProps = {
  onAddEntry: (entry: WorkLogEntry) => void;
  userId: string;
  className?: string;
};

export function WorkLogForm({ onAddEntry, userId, className }: WorkLogFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      attachments: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('startTime', values.startTime);
      formData.append('endTime', values.endTime);
      formData.append('userId', userId);
      
      // Append multiple files
      values.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
      formData.append('attachmentCount', values.attachments.length.toString());

      const result = await submitWorkLog(formData);

      if (result.error) {
        console.error("Error submitting work log:", result.error);
        toast({
          variant: 'destructive',
          title: 'Đã có lỗi xảy ra',
          description: result.error,
        });
      } else if (result.newEntry) {
        const entryWithDate: WorkLogEntry = {
          ...result.newEntry,
          timestamp: new Date(result.newEntry.timestamp),
        };
        onAddEntry(entryWithDate);
        toast({
          title: 'Thành công!',
          description: 'Đã ghi nhận công việc của bạn.',
        });
        form.reset();
      }
    });
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPenLine className="h-6 w-6 text-primary" />
          Báo cáo công việc
        </CardTitle>
        <CardDescription>
          Điền thông tin chi tiết công việc. AI sẽ tự động phân loại. Bạn có thể đính kèm tối đa 5 tệp nếu cần.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên công việc *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Thiết kế giao diện trang chủ" {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Giờ bắt đầu *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Giờ kết thúc *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chi tiết công việc *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả các bước đã thực hiện, kết quả đạt được..."
                      className="min-h-[120px]"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachments"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Tệp đính kèm * (Tối đa 5 tệp)</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      multiple
                      disabled={isPending}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        onChange(files);
                      }}
                      {...rest}
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground">
                    {value && value.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Đã chọn {value.length} tệp:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {value.map((file, index) => (
                            <li key={index} className="text-xs">
                              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Ghi nhận'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
