'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
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
  attachment: z.instanceof(File).optional(),
});

type WorkLogFormProps = {
  onAddEntry: (entry: WorkLogEntry) => void;
  userId: string;
};

export function WorkLogForm({ onAddEntry, userId }: WorkLogFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      attachment: undefined,
    },
  });

  const fileRef = form.register('attachment');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('title', values.title);
    formData.append('description', values.description);
    formData.append('startTime', values.startTime);
    formData.append('endTime', values.endTime);
    if (values.attachment && values.attachment.size > 0) {
      formData.append('attachment', values.attachment);
    }

    startTransition(async () => {
      try {
        const result = await submitWorkLog(formData);

        if (result.error) {
          throw new Error(result.error);
        }
        
        if (result.newEntry) {
          onAddEntry(result.newEntry);
          toast({
            title: 'Thành công!',
            description: 'Đã ghi nhận công việc của bạn.',
          });
          form.reset();
        } else {
           throw new Error('Không nhận được thông tin công việc đã tạo.');
        }

      } catch (error: any) {
        console.error("Error submitting work log:", error);
        toast({
          variant: 'destructive',
          title: 'Đã có lỗi xảy ra',
          description: error.message || 'Không thể ghi nhận công việc. Vui lòng thử lại.',
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPenLine className="h-6 w-6 text-primary" />
          Báo cáo công việc
        </CardTitle>
        <CardDescription>
          Điền thông tin chi tiết công việc. AI sẽ tự động phân loại. Bạn có thể đính kèm một tệp nếu cần.
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
              name="attachment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tệp đính kèm</FormLabel>
                  <FormControl>
                    <Input type="file" {...fileRef} disabled={isPending} />
                  </FormControl>
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
