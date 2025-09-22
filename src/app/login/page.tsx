'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { LogIn, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent, authType: 'login' | 'signup') => {
    e.preventDefault();
    setLoading(true);
    
    let error;
    if (authType === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
      });
      error = signUpError;

      // Handle successful signup
      if (data.user && !error) {
        toast({
         title: 'Đăng ký thành công!',
         description: 'Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.',
       });
       // We don't redirect here, user needs to confirm email first.
       setLoading(false);
       return;
      }
    }

    if (error) {
       toast({
        variant: 'destructive',
        title: 'Lỗi xác thực',
        description: error.message,
      });
    } else {
       // On successful login, the auth state change listener will handle the redirect.
       router.push('/');
       router.refresh();
    }
    
    setLoading(false);
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <Tabs defaultValue="login" className="w-full max-w-sm">
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
          <TabsContent value="login">
            <CardContent>
              <form onSubmit={(e) => handleAuth(e, 'login')} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">Mật khẩu</Label>
                  <Input 
                    id="password-login" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Đăng nhập
                </Button>
              </form>
            </CardContent>
          </TabsContent>
          <TabsContent value="signup">
            <CardContent>
              <form onSubmit={(e) => handleAuth(e, 'signup')} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="email@example.com"
                    required
                     value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Mật khẩu</Label>
                  <Input 
                    id="password-signup" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Đăng ký
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </main>
  );
}
