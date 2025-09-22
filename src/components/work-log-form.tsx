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
import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        const { title, description, startTime, endTime, attachment } = values;

        // Call AI to classify the entry in parallel
        const classificationPromise = classifyWorkLogEntry({ title, description });

        let fileUrl: string | undefined;
        let fileName: string | undefined;

        // Handle file upload if an attachment is provided
        if (attachment && attachment.size > 0) {
          const storageRef = ref(storage, `attachments/${userId}/${Date.now()}_${attachment.name}`);
          const uploadTask = uploadBytesResumable(storageRef, attachment);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                // Optional: handle progress
              },
              (error) => {
                console.error("Upload failed:", error);
                reject(new Error('Không thể tải tệp lên. Vui lòng kiểm tra lại cấu hình CORS của Firebase Storage.'));
              },
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  fileUrl = downloadURL;
                  fileName = attachment.name;
                  resolve();
                } catch (error) {
                   reject(new Error('Không thể lấy URL của tệp đã tải lên.'));
                }
              }
            );
          });
        }
        
        // Wait for AI classification result
        const classificationResult = await classificationPromise;
        const category = classificationResult.category || 'Other';


        const docData = {
          userId,
          title,
          description,
          startTime,
          endTime,
          category,
          timestamp: serverTimestamp(),
          ...(fileUrl && { fileUrl }),
          ...(fileName && { fileName }),
        };

        const docRef = await addDoc(collection(db, 'worklogs'), docData);

        const newEntry: WorkLogEntry = {
          id: docRef.id,
          ...values,
          category: category,
          timestamp: new Date(), // Use client-side date for immediate UI update
          fileUrl,
          fileName,
        };
        
        onAddEntry(newEntry);
        toast({
          title: 'Thành công!',
          description: 'Đã ghi nhận công việc của bạn.',
        });
        form.reset();

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
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Tệp đính kèm</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      disabled={isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file);
                      }}
                      {...rest}
                    />
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
