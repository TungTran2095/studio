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
    <nav className="flex flex-col h-full bg-slate-900 text-white w-64 px-4 py-6">
      <div className="flex items-center mb-8 px-2">
        <TrendingUp className="w-6 h-6 mr-2 text-blue-400" />
        <span className="text-xl font-bold">Quant Trading</span>
      </div>
      
      <div className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <div key={item.href} className="relative">
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleSubmenu(item.href)}
                  className={`flex items-center w-full px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.title}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
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
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive(subItem.href)
                            ? 'bg-slate-700 text-white'
                            : subItem.highlight 
                              ? 'text-blue-300 font-semibold hover:bg-slate-800 hover:text-white'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-auto pt-4 border-t border-slate-700">
        <div className="px-3 py-2 text-xs text-slate-400">
          <p>Quant Trading Platform</p>
          <p>Phiên bản 1.0.0</p>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 