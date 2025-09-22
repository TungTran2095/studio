'use client';

import { useState } from 'react';
import type { WorkLogEntry } from '@/lib/types';
import { WorkLogForm } from '@/components/work-log-form';
import { WorkHistory } from '@/components/work-history';

// Sample data to show the history component's functionality on first load
const initialEntries: WorkLogEntry[] = [
  {
    id: '1',
    title: 'Hoàn thành báo cáo quý',
    description: 'Tổng hợp dữ liệu kinh doanh và viết báo cáo tổng kết cho quý 2. Báo cáo đã được gửi cho ban giám đốc.',
    category: 'Project Management',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    fileName: 'BaoCaoQuy2.pdf'
  },
  {
    id: '2',
    title: 'Sửa lỗi hiển thị trên mobile',
    description: 'Fix lỗi giao diện vỡ trên màn hình điện thoại cho trang sản phẩm. Đã kiểm tra trên nhiều thiết bị và trình duyệt.',
    category: 'Software Development',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  }
]


export default function Home() {
  const [entries, setEntries] = useState<WorkLogEntry[]>(initialEntries);

  const handleAddEntry = (newEntry: WorkLogEntry) => {
    setEntries((prevEntries) => [newEntry, ...prevEntries]);
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold">WorkLog</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Ghi nhận và theo dõi tiến độ công việc của bạn một cách hiệu quả
        </p>
      </div>
      <div className="grid md:grid-cols-5 gap-8 items-start">
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
