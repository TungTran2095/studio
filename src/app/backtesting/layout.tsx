import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Backtesting | Yinsen AI",
  description: "Kiểm thử chiến lược giao dịch trên dữ liệu lịch sử",
};

export default function BacktestingLayout({
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