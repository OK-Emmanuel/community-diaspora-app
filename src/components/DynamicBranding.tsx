'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function DynamicBranding({ children }: { children: React.ReactNode }) {
  // Only keep default branding for Head
  const defaultBranding = {
    name: 'Diaspora Community',
    favicon_url: '/favicon.ico',
  };

  return (
    <>
      <Head>
        <title>{defaultBranding.name}</title>
        <link rel="icon" href={defaultBranding.favicon_url} />
      </Head>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
} 