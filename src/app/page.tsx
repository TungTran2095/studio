'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { WorkLogEntry } from '@/lib/types';
import { WorkLogForm } from '@/components/work-log-form';
import { WorkHistory } from '@/components/work-history';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    // Check initial auth state and listen for changes.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchEntries(currentUser.id);
        } else {
          router.push('/login');
        }
        
        if (authLoading) {
           setAuthLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, authLoading]);

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
    setEntries((prevEntries) => [newEntry, ...prevEntries]);
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
      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">WorkLog</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Ghi nhận và theo dõi tiến độ công việc của bạn một cách hiệu quả
          </p>
        </div>
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <WorkLogForm onAddEntry={handleAddEntry} userId={user.id} />
          </div>
          <div className="md:col-span-3">
            <WorkHistory entries={entries} loading={loadingEntries} />
          </div>
        </div>
      </main>
    )
  );
}
