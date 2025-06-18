import type {Metadata, Viewport} from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Urus Studio - AI Trading Platform',
  description: 'Platform giao dịch crypto tích hợp AI với thu thập dữ liệu real-time từ Binance API và CoinMarketCap',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply Roboto font variable and remove potentially conflicting dark class */}
      <body className={cn(roboto.variable, "font-sans antialiased")} suppressHydrationWarning={true}> {/* suppressHydrationWarning for theme */} 
        <div className="relative min-h-screen flex flex-col"> {/* Use relative positioning for toggle */} 
          {children}
          {/* ThemeToggle removed from here */}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
