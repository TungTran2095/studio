'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createWorkLogEntry } from '@/app/actions';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ClipboardPenLine, Loader2, Upload } from 'lucide-react';
import type { WorkLogEntry } from '@/lib/types';

const formSchema = z.object({
  title: z.string().min(1, 'Tên công việc không được để trống.'),
  description: z.string().min(1, 'Chi tiết công việc không được để trống.'),
  file: z.any().optional(),
});

type WorkLogFormProps = {
  onAddEntry: (entry: WorkLogEntry) => void;
};

export function WorkLogForm({ onAddEntry }: WorkLogFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [fileName, setFileName] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      file: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const data = {
        title: values.title,
        description: values.description,
        fileName: fileName,
      };
      const result = await createWorkLogEntry(data);

      if (result.success && result.newEntry) {
        onAddEntry(result.newEntry);
        toast({
          title: 'Thành công!',
          description: 'Đã ghi nhận công việc của bạn.',
        });
        form.reset();
        setFileName('');
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } else {
        toast({
          variant: 'destructive',
          title: 'Có lỗi xảy ra',
          description: result.error || 'Không thể ghi nhận công việc. Vui lòng thử lại.',
        });
      }
    });
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileName(event.target.files[0].name);
    } else {
      setFileName('');
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <ClipboardPenLine className="h-6 w-6 text-accent" />
          Báo cáo công việc
        </CardTitle>
        <CardDescription>
          Điền thông tin chi tiết về công việc bạn đã hoàn thành.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên công việc</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Thiết kế giao diện trang chủ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chi tiết công việc</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả các bước đã thực hiện, kết quả đạt được..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormLabel>Tệp đính kèm (nếu có)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Button type="button" variant="outline" asChild>
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Tải tệp lên
                        </label>
                      </Button>
                      <Input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="*/*"
                      />
                    </div>
                  </FormControl>
                  {fileName && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Tệp đã chọn: {fileName}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
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
