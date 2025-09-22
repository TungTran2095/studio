'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { WorkLogEntry } from '@/lib/types';
import { WorkLogForm } from '@/components/work-log-form';
import { WorkHistory } from '@/components/work-history';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch entries after user is confirmed
        setLoadingEntries(true);
        const q = query(
          collection(db, 'worklogs'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedEntries: WorkLogEntry[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedEntries.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp.toDate(),
          } as WorkLogEntry);
        });
        setEntries(fetchedEntries);
        setLoadingEntries(false);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleAddEntry = (newEntry: WorkLogEntry) => {
    setEntries((prevEntries) => [newEntry, ...prevEntries]);
  };

  if (loading) {
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

  if (!user) {
    return null;
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">WorkLog</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Ghi nhận và theo dõi tiến độ công việc của bạn một cách hiệu quả
        </p>
      </div>
      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2">
          <WorkLogForm onAddEntry={handleAddEntry} userId={user.uid} />
        </div>
        <div className="md:col-span-3">
          <WorkHistory entries={entries} loading={loadingEntries} />
        </div>
      </div>
    </main>
  );
}
