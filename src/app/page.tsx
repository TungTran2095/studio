'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { WorkLogEntry } from '@/lib/types';
import { WorkLogForm } from '@/components/work-log-form';
import { WorkHistory } from '@/components/work-history';
import { WorkCalendar } from '@/components/work-calendar';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ClipboardPenLine, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChangePasswordDialog } from '@/components/change-password-dialog';

export default function Home() {
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [activeView, setActiveView] = useState<'report' | 'calendar'>('report');
  const [openChangePassword, setOpenChangePassword] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchEntries(currentUser.id);
      } else {
        router.push('/login');
      }
      setAuthLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (event === 'SIGNED_OUT' || !currentUser) {
          router.push('/login');
        } else if (event === 'SIGNED_IN') {
           fetchEntries(currentUser.id);
           router.push('/');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function fetchEntries(userId: string) {
    setLoadingEntries(true);
    try {
      const { data: worklogs, error } = await supabase
        .from('worklogs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      
      const fetchedEntries: WorkLogEntry[] = worklogs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp),
      })) as WorkLogEntry[];
      
      setEntries(fetchedEntries);
    } catch (error) {
      console.error("Error fetching work logs:", error);
    } finally {
      setLoadingEntries(false);
    }
  }


  const handleAddEntry = (newEntry: WorkLogEntry) => {
    setEntries((prevEntries) => {
      const exists = prevEntries.some(e => String(e.id) === String(newEntry.id));
      return exists ? prevEntries : [newEntry, ...prevEntries];
    });
    if (user?.id) {
      fetchEntries(user.id);
    }
  };

  if (authLoading) {
    return (
      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto mt-4" />
        </div>
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <Skeleton className="h-[500px] w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </main>
    );
  }

  return (
    user && (
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <div className="px-2 py-1 font-semibold flex items-center justify-between">
              <span className="group-data-[collapsible=icon]:hidden">WorkLog</span>
              <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeView === 'report'}
                    onClick={() => setActiveView('report')}
                    tooltip="Báo cáo công việc"
                  >
                    <ClipboardPenLine className="h-4 w-4" />
                    <span>Báo cáo công việc</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeView === 'calendar'}
                    onClick={() => setActiveView('calendar')}
                    tooltip="Lịch làm việc"
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span>Lịch làm việc</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="container mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">WorkLog</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Tài khoản" className="rounded-full outline-none focus:ring-2 focus:ring-ring">
                    <Avatar>
                      <AvatarFallback>{(user?.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>{user?.email || 'Người dùng'}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setOpenChangePassword(true)}>Đổi mật khẩu</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push('/login');
                    }}
                  >
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {activeView === 'report' ? (
              <div className="grid md:grid-cols-5 gap-8">
                <div className="md:col-span-2">
                  <div className="h-[650px] overflow-hidden">
                    <WorkLogForm onAddEntry={handleAddEntry} userId={user.id} className="h-full" />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <div className="h-[650px] overflow-hidden">
                    <WorkHistory entries={entries} loading={loadingEntries} />
                  </div>
                </div>
              </div>
            ) : (
              <WorkCalendar entries={entries} />
            )}
          </div>
        </SidebarInset>
        <ChangePasswordDialog open={openChangePassword} onOpenChange={setOpenChangePassword} />
      </SidebarProvider>
    )
  );
}
