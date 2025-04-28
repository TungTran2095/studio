import type {Metadata} from 'next';
import { Roboto } from 'next/font/google'; // Import Roboto
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

// Configure Roboto font
const roboto = Roboto({
  weight: ['400', '500', '700'], // Include desired weights
  subsets: ['latin'],
  variable: '--font-roboto', // Define CSS variable
  display: 'swap',
});


export const metadata: Metadata = {
  title: 'EchoBot',
  description: 'An AI powered chatbot inspired by Firebase Studio', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       {/* Apply Roboto font variable */}
      <body className={`${roboto.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
