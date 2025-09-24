'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  message: 'Mật khẩu nhập lại không khớp.',
  path: ['confirm'],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  useEffect(() => {
    // 1) Lắng nghe sự kiện RECOVERY khi mở từ link email
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // 2) Chủ động kiểm tra session ngay khi tải trang (trường hợp event không bắn)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      toast({ title: 'Đổi mật khẩu thành công' });
      router.push('/login');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: err.message });
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Đặt lại mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          {ready ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="text-sm">Mật khẩu mới</label>
                <Input type="password" {...form.register('password')} />
                <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
              </div>
              <div>
                <label className="text-sm">Nhập lại mật khẩu</label>
                <Input type="password" {...form.register('confirm')} />
                <p className="text-xs text-destructive">{form.formState.errors.confirm?.message}</p>
              </div>
              <Button type="submit" className="w-full">Cập nhật mật khẩu</Button>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">
              Vui lòng mở liên kết đặt lại mật khẩu từ email để tiếp tục.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}


