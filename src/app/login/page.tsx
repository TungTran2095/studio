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
import { Label } from '@/components/ui/label';
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
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuth = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const { email, password } = values;

    if (activeTab === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Lỗi đăng ký',
          description: error.message,
        });
      } else if (data.user) {
         if (data.user.identities && data.user.identities.length === 0) {
            toast({
              variant: 'destructive',
              title: 'Lỗi đăng ký',
              description: 'Người dùng này đã tồn tại.',
            });
         } else {
            toast({
              title: 'Đăng ký thành công!',
              description:
                'Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.',
            });
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
        router.refresh(); 
      }
    }

    setLoading(false);
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
              <TabsContent value="login">
                <CardContent className="space-y-4">
                   <Alert variant="destructive" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Lưu ý quan trọng</AlertTitle>
                    <AlertDescription>
                      Nếu bạn vừa đăng ký, vui lòng xác thực tài khoản qua email trước khi đăng nhập.
                    </AlertDescription>
                  </Alert>
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
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>
              <TabsContent value="signup">
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
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>
              <div className="p-6 pt-0">
                 <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </Button>
              </div>
            </form>
          </Form>
        </Card>
      </Tabs>
    </main>
  );
}
