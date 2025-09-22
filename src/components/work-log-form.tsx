'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
import { db, storage } from '@/lib/firebase';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formSchema = z.object({
  title: z.string().min(1, 'Tên công việc không được để trống.'),
  description: z.string().min(1, 'Chi tiết công việc không được để trống.'),
  startTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ (HH:mm).'),
  endTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ (HH:mm).'),
  file: z.instanceof(File).optional(),
});

type WorkLogFormProps = {
  onAddEntry: (entry: WorkLogEntry) => void;
  userId: string;
};

export function WorkLogForm({ onAddEntry, userId }: WorkLogFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [fileName, setFileName] = useState('');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      file: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { file, title, description, startTime, endTime } = values;
    
    startTransition(async () => {
      try {
        let fileUrl = '';
        let uploadedFileName = '';

        if (file) {
          // Đơn giản hóa đường dẫn, không bao gồm userId
          const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
          const uploadResult = await uploadBytes(storageRef, file);
          fileUrl = await getDownloadURL(uploadResult.ref);
          uploadedFileName = file.name;
        }

        const docData = {
          userId,
          title,
          description,
          startTime,
          endTime,
          fileName: uploadedFileName,
          fileUrl,
          category: 'Other', // You can modify this later
          timestamp: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'worklogs'), docData);

        const newEntry: WorkLogEntry = {
          id: docRef.id,
          userId,
          title,
          description,
          startTime,
          endTime,
          fileName: uploadedFileName,
          fileUrl,
          category: 'Other',
          timestamp: new Date(), // Use client-side date for immediate UI update
        };
        
        onAddEntry(newEntry);
        toast({
          title: 'Thành công!',
          description: 'Đã ghi nhận công việc của bạn.',
        });
        form.reset();
        setFileName('');
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } catch (error: any) {
        console.error("Error submitting work log:", error);
        
        let errorMessage = 'Không thể ghi nhận công việc. Vui lòng thử lại.';
        if (error.code === 'storage/unauthorized') {
            errorMessage = 'Lỗi phân quyền: Bạn không có quyền tải tệp lên. Vui lòng kiểm tra lại quy tắc bảo mật của Storage.';
        } else if (error.code === 'storage/object-not-found' || error.code === 'storage/bucket-not-found') {
             errorMessage = 'Lỗi: Không tìm thấy bucket lưu trữ hoặc không có quyền truy cập. Vui lòng kiểm tra lại cấu hình Firebase và quyền của Cloud Storage.';
        } else if (error.code === 'storage/unknown') {
            errorMessage = 'Đã xảy ra lỗi không xác định với Cloud Storage. Vui lòng kiểm tra CORS rules của bucket.'
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast({
          variant: 'destructive',
          title: 'Đã có lỗi xảy ra',
          description: errorMessage,
        });
      }
    });
  }
  
  const isSubmitting = isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPenLine className="h-6 w-6 text-primary" />
          Báo cáo công việc
        </CardTitle>
        <CardDescription>
          Điền thông tin chi tiết về công việc bạn đã hoàn thành.
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
                    <Input placeholder="Ví dụ: Thiết kế giao diện trang chủ" {...field} disabled={isSubmitting} />
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
                      <Input type="time" {...field} disabled={isSubmitting} />
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
                      <Input type="time" {...field} disabled={isSubmitting} />
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
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Tệp đính kèm</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Button type="button" variant="outline" asChild>
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex items-center gap-2 w-full justify-center"
                        >
                          <Upload className="h-4 w-4" />
                          Tải tệp lên
                        </label>
                      </Button>
                      <Input
                        {...field}
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={(event) => {
                           const file = event.target.files?.[0];
                           onChange(file);
                           setFileName(file?.name || '');
                        }}
                        accept="*/*"
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  {fileName && !isSubmitting && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Tệp đã chọn: {fileName}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
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
