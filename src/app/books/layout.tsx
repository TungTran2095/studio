import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Thư viện sách | Yinsen AI",
  description: "Quản lý và đọc sách từ kho lưu trữ Supabase",
};

export default function BooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
} 