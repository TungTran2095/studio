'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { WorkLogEntry } from '@/lib/types';
import { WorkLogForm } from '@/components/work-log-form';
import { WorkHistory } from '@/components/work-history';
import { Skeleton } from '@/components/ui/skeleton';


// Sample data to show the history component's functionality on first load
const initialEntries: WorkLogEntry[] = [
  {
    id: '1',
    title: 'Hoàn thành báo cáo quý',
    description: 'Tổng hợp dữ liệu kinh doanh và viết báo cáo tổng kết cho quý 2. Báo cáo đã được gửi cho ban giám đốc.',
    category: 'Project Management',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    fileName: 'BaoCaoQuy2.pdf',
    startTime: '09:00',
    endTime: '11:00',
  },
  {
    id: '2',
    title: 'Sửa lỗi hiển thị trên mobile',
    description: 'Fix lỗi giao diện vỡ trên màn hình điện thoại cho trang sản phẩm. Đã kiểm tra trên nhiều thiết bị và trình duyệt.',
    category: 'Software Development',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    startTime: '14:00',
    endTime: '15:30',
  }
]


export default function Home() {
  const [entries, setEntries] = useState<WorkLogEntry[]>(initialEntries);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    
    // Cleanup subscription on unmount
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
          <WorkLogForm onAddEntry={handleAddEntry} />
        </div>
        <div className="md:col-span-3">
          <WorkHistory entries={entries} />
        </div>
      </div>
    </main>
  );
}
