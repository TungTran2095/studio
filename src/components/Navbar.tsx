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

// Menu items
const menuItems = [
  { 
    title: 'Dashboard', 
    href: '/', 
    icon: <BarChart className="w-4 h-4 mr-2" /> 
  },
  { 
    title: 'Tài sản', 
    href: '/assets', 
    icon: <DollarSign className="w-4 h-4 mr-2" /> 
  },
  { 
    title: 'Giao dịch', 
    href: '/trading', 
    icon: <LineChart className="w-4 h-4 mr-2" />,
    submenu: [
      { title: 'Binance API', href: '/trading/binance-api' },
      { title: 'Chiến lược giao dịch', href: '/trading/strategy', highlight: true },
    ]
  },
  { 
    title: 'Phân tích kỹ thuật', 
    href: '/technical', 
    icon: <TrendingUp className="w-4 h-4 mr-2" /> 
  },
  { 
    title: 'Cảnh báo', 
    href: '/alerts', 
    icon: <AlertTriangle className="w-4 h-4 mr-2" /> 
  },
  { 
    title: 'Kiến thức', 
    href: '/books', 
    icon: <BookOpen className="w-4 h-4 mr-2" /> 
  },
  { 
    title: 'Cài đặt', 
    href: '/settings', 
    icon: <Settings className="w-4 h-4 mr-2" /> 
  },
];

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>('/trading');

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
    <nav className="flex flex-col h-full glass-card text-white w-64 px-4 py-6 border-r border-white/20">
      <div className="flex items-center mb-8 px-2">
        <div className="w-8 h-8 mr-3 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Quant Trading
        </span>
      </div>
      
      <div className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <div key={item.href} className="relative">
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleSubmenu(item.href)}
                  className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.title}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${
                      openSubmenu === item.href ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
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
                            ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                            : subItem.highlight 
                              ? 'text-blue-300 font-semibold hover:bg-white/10 hover:text-white hover:shadow-md'
                              : 'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md'
                        }`}
                      >
                        {subItem.highlight && <span className="text-blue-400 mr-1">→</span>}
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
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md'
                }`}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-auto pt-4 border-t border-white/20">
        <div className="px-3 py-2 text-xs text-white/60">
          <p>Quant Trading Platform</p>
          <p>Phiên bản 1.0.0</p>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 