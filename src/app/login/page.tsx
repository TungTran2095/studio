'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
  fullName: z.string().optional(),
  employeeId: z.string().optional(),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      employeeId: '',
    },
  });

  const handleAuth = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setShowConfirmationMessage(false);
    const { email, password } = values;

    if (activeTab === 'signup') {
      if (!values.fullName || !values.employeeId) {
        toast({
          variant: 'destructive',
          title: 'Thiếu thông tin',
          description: 'Vui lòng nhập Họ và tên và Mã nhân viên.',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: values.fullName,
            employee_id: values.employeeId,
          },
        },
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Lỗi đăng ký',
          description: error.message,
        });
      } else if (data.user) {
         // This case handles when the user already exists but email confirmation is not enabled.
         // With email confirmation ON, a new user requires verification.
         if (data.user.identities && data.user.identities.length === 0) {
            toast({
              variant: 'destructive',
              title: 'Lỗi đăng ký',
              description: 'Người dùng này đã tồn tại.',
            });
         } else {
            setShowConfirmationMessage(true);
            toast({
              title: 'Đăng ký thành công!',
              description: 'Vui lòng kiểm tra email để xác thực tài khoản.',
            });
            form.reset(); // Reset form after successful signup
         }
      }
    } else {
      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Lỗi đăng nhập',
          description: error.message,
        });
      } else {
        router.push('/');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Thiếu email',
        description: 'Vui lòng nhập email để nhận liên kết đặt lại mật khẩu.',
      });
      return;
    }
    try {
      setResetSending(true);
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast({ title: 'Đã gửi email', description: 'Vui lòng kiểm tra hộp thư để đặt lại mật khẩu.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Không thể gửi email', description: err.message });
    } finally {
      setResetSending(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}
        className="w-full max-w-sm"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Đăng nhập</TabsTrigger>
          <TabsTrigger value="signup">Đăng ký</TabsTrigger>
        </TabsList>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary text-primary-foreground rounded-full p-3">
                <LogIn className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl">Chào mừng bạn</CardTitle>
            <CardDescription>
              Nhập thông tin để truy cập vào WorkLog
            </CardDescription>
          </CardHeader>
          {showConfirmationMessage ? (
              <div className="px-6 pb-4">
                <Alert variant="destructive" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300 [&>svg]:text-green-600 dark:[&>svg]:text-green-400">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Hoàn tất đăng ký!</AlertTitle>
                    <AlertDescription>
                      Một email xác thực đã được gửi đến địa chỉ của bạn. Vui lòng kiểm tra hộp thư đến và nhấp vào liên kết để kích hoạt tài khoản trước khi đăng nhập.
                    </AlertDescription>
                </Alert>
              </div>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-0">
              <TabsContent value="login">
                <CardContent className="space-y-4">
                   <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <div className="px-6 pb-2 text-right">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                    onClick={handleForgotPassword}
                    disabled={resetSending || loading}
                  >
                    {resetSending ? 'Đang gửi...' : 'Quên mật khẩu?'}
                  </button>
                </div>
              </TabsContent>
              <TabsContent value="signup">
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ và tên</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Nguyễn Văn A"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mã nhân viên</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="VD: EMP00123"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>
              <div className="p-6 pt-2">
                 <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </Button>
              </div>
            </form>
          </Form>
          )}
        </Card>
      </Tabs>
    </main>
  );
}
