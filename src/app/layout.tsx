import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Toaster } from '@/components/ui/toaster';
import { MainNavigation } from '@/components/main-navigation';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'WorkLog',
  description: 'Một app cho phép người dùng báo cáo công việc',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <MainNavigation />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
