import { AlertsPanel } from "@/features/alerts/components/alerts-panel";

export const metadata = {
  title: "Hệ thống cảnh báo thông minh | Yinsen AI",
  description: "Tạo và quản lý cảnh báo thông minh cho giao dịch BTC/USDT",
};

export default function AlertsPage() {
  return (
    <div className="container py-6">
      <AlertsPanel />
    </div>
  );
} 