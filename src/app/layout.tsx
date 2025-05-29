import type {Metadata, Viewport} from 'next';
import { Roboto } from 'next/font/google'; // Import Roboto
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils'; // Import cn utility

// Configure Roboto font
const roboto = Roboto({
  weight: ['400', '500', '700'], // Include desired weights
  subsets: ['latin'],
  variable: '--font-roboto', // Define CSS variable
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
    // Removed 'dark' class here to respect system preference or allow manual toggling
    <html lang="en">
       {/* Apply Roboto font variable */}
      <body className={cn(roboto.variable, "font-sans antialiased")}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
