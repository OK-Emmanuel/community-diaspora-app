import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthProvider';
import DynamicBranding from '@/components/DynamicBranding';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Diaspora Community Platform',
  description: 'A community platform for diaspora members',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <DynamicBranding>{children}</DynamicBranding>
        </AuthProvider>
      </body>
    </html>
  );
}
