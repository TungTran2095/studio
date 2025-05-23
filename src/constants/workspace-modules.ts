import { WorkspaceModule } from '@/types/workspace';

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Chung',
    description: 'Tổng quan tài sản và thị trường',
    icon: 'LayoutDashboard',
    path: '/workspace/dashboard'
  },
  {
    id: 'market-data',
    name: 'Thu thập dữ liệu thị trường',
    description: 'Thu thập và xử lý dữ liệu thị trường real-time',
    icon: 'Database',
    path: '/workspace/market-data'
  },
  {
    id: 'quant-research',
    name: 'Nghiên cứu và phát triển mô hình Quant',
    description: 'Phát triển và kiểm tra các mô hình định lượng',
    icon: 'Brain',
    path: '/workspace/quant-research'
  },
  {
    id: 'algorithm-optimization',
    name: 'Theo dõi và tối ưu hóa thuật toán',
    description: 'Giám sát và tối ưu hóa hiệu suất thuật toán',
    icon: 'Settings',
    path: '/workspace/algorithm-optimization'
  },
  {
    id: 'risk-management',
    name: 'Quản lý rủi ro',
    description: 'Đánh giá và quản lý rủi ro đầu tư',
    icon: 'Shield',
    path: '/workspace/risk-management'
  },
  {
    id: 'market-news',
    name: 'Cập nhật thị trường và tin tức',
    description: 'Theo dõi tin tức và cập nhật thị trường',
    icon: 'Newspaper',
    path: '/workspace/market-news'
  },
  {
    id: 'reports',
    name: 'Các báo cáo',
    description: 'Tạo và quản lý báo cáo phân tích',
    icon: 'FileText',
    path: '/workspace/reports'
  },
  {
    id: 'research-library',
    name: 'Nghiên cứu và thư viện',
    description: 'Thư viện tài liệu và nghiên cứu',
    icon: 'BookOpen',
    path: '/workspace/research-library'
  }
]; 