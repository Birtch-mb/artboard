import type { Metadata } from 'next';
import { Courier_Prime } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/session-provider';

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-courier-prime',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Artboard — Art Department Management',
  description: 'Film and television art department management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${courierPrime.variable} bg-gray-950 text-gray-100 antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
