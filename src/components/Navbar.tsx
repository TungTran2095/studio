import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart, 
  BookOpen, 
  DollarSign, 
  LineChart, 
  Settings, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

// Helper to detect cream theme (client-side only)
function useCreamTheme() {
  const [isCream, setIsCream] = React.useState(false);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const check = () => setIsCream(document.body.classList.contains('cream-theme'));
      check();
      window.addEventListener('themechange', check);
      return () => window.removeEventListener('themechange', check);
    }
  }, []);
  return isCream;
}

// Menu items
const menuItems = [
  { 
    title: 'Dashboard Chung', 
    href: '/', 
    icon: BarChart 
  },
  { 
    title: 'Thu thập dữ liệu thị trường', 
    href: '/market-data', 
    icon: DollarSign 
  },
  { 
    title: 'Nghiên cứu Định lượng & Phân tích', 
    href: '/quant-research', 
    icon: LineChart,
    submenu: [
      { title: 'Binance API', href: '/trading/binance-api' },
      { title: 'Chiến lược giao dịch', href: '/trading/strategy', highlight: true },
    ]
  },
  { 
    title: 'Theo dõi và tối ưu hóa thuật toán', 
    href: '/monitoring', 
    icon: TrendingUp 
  },
  { 
    title: 'Quản lý rủi ro', 
    href: '/risk', 
    icon: AlertTriangle 
  },
  { 
    title: 'Cập nhật thị trường và tin tức', 
    href: '/news', 
    icon: BookOpen 
  },
  { 
    title: 'Các báo cáo', 
    href: '/reports', 
    icon: Settings 
  },
  { 
    title: 'Nghiên cứu và thư viện', 
    href: '/library', 
    icon: BookOpen 
  },
];

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>('/trading');
  const isCreamTheme = useCreamTheme();

  const iconProps = { color: 'black', stroke: 'black', className: 'w-4 h-4 mr-2' };

  const toggleSubmenu = (href: string) => {
    if (openSubmenu === href) {
      setOpenSubmenu(null);
    } else {
      setOpenSubmenu(href);
    }
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <nav className="flex flex-col h-full glass-card text-white w-64 px-4 py-6 border-r border-white/20 cream-theme:glass-card-cream cream-theme:text-gray-800 cream-theme:border-orange-200/30">
      <div className="flex items-center mb-8 px-2">
        <div className="w-8 h-8 mr-3 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center cream-theme:from-orange-400 cream-theme:to-red-500">
          <TrendingUp {...(isCreamTheme ? { color: 'black', stroke: 'black', className: 'w-5 h-5' } : { className: 'w-5 h-5 text-white' })} />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cream-theme:from-orange-500 cream-theme:to-red-600">
          Quant Trading
        </span>
      </div>
      
      <div className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.href} className="relative">
              {item.submenu ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.href)}
                    className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                      isActive(item.href)
                        ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm cream-theme:bg-orange-100/70 cream-theme:text-gray-900 cream-theme:shadow-orange-200/50'
                        : 'text-white hover:bg-white/10 hover:text-white hover:shadow-md cream-theme:text-gray-900 cream-theme:hover:bg-orange-100/50 cream-theme:hover:text-gray-900'
                    }`}
                  >
                    <Icon {...iconProps} className="w-4 h-4 mr-2 !text-black" style={{ color: 'black' }} />
                    <span className="flex-1">{item.title}</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isCreamTheme ? '!text-black !stroke-black !opacity-100' : ''
                      } ${openSubmenu === item.href ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke={isCreamTheme ? 'black' : 'currentColor'}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {openSubmenu === item.href && (
                    <div className="pl-10 mt-1 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                            isActive(subItem.href)
                              ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm cream-theme:bg-orange-100/70 cream-theme:text-gray-900 cream-theme:shadow-orange-200/50'
                              : subItem.highlight 
                                ? 'text-blue-300 font-semibold hover:bg-white/10 hover:text-white hover:shadow-md cream-theme:text-orange-600 cream-theme:hover:bg-orange-100/50 cream-theme:hover:text-orange-700'
                                : 'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md cream-theme:text-gray-900 cream-theme:hover:bg-orange-100/50 cream-theme:hover:text-gray-900'
                          }`}
                        >
                          {subItem.highlight && <span className="text-blue-400 mr-1 cream-theme:text-orange-500">→</span>}
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm cream-theme:bg-orange-100/70 cream-theme:text-gray-900 cream-theme:shadow-orange-200/50'
                      : 'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md cream-theme:text-gray-900 cream-theme:hover:bg-orange-100/50 cream-theme:hover:text-gray-900'
                  }`}
                >
                  <Icon {...iconProps} className="w-4 h-4 mr-2 !text-black" style={{ color: 'black' }} />
                  <span>{item.title}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-auto pt-4 border-t border-white/20 cream-theme:border-orange-200/30">
        <div className="px-3 py-2 text-xs text-white/60 cream-theme:text-gray-600">
          <p>Quant Trading Platform</p>
          <p>Phiên bản 1.0.0</p>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 