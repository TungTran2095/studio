import type {Metadata} from 'next';
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
  title: 'YINSEN', // Updated title
  description: 'An AI powered chatbot and asset viewer inspired by Firebase Studio', // Updated description
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1', // Thêm cấu hình viewport
};

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
