'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function DynamicBranding({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [branding, setBranding] = useState({
    name: 'Diaspora Community',
    logo_url: 'https://i.pinimg.com/474x/54/81/0a/54810acebbc96214ac3b2fa2f1bb8aba.jpg', // Default logo
    favicon_url: '/favicon.ico', // Default favicon
  });

  useEffect(() => {
    async function fetchBranding() {
      if (user && user.community_id) {
        try {
          const res = await fetch(`/api/community?id=eq.${user.community_id}`);
          if (!res.ok) throw new Error('Failed to fetch community data');
          const data = await res.json();
          if (Array.isArray(data) && data[0]) {
            setBranding({
              name: data[0].name || 'Diaspora Community',
              logo_url: data[0].logo_url || 'https://i.pinimg.com/474x/54/81/0a/54810acebbc96214ac3b2fa2f1bb8aba.jpg',
              favicon_url: data[0].favicon_url || '/favicon.ico',
            });
          } else {
            // Fallback if community has no specific branding
            setBranding({
              name: 'Diaspora Community',
              logo_url: 'https://i.pinimg.com/474x/54/81/0a/54810acebbc96214ac3b2fa2f1bb8aba.jpg',
              favicon_url: '/favicon.ico',
            });
          }
        } catch (error) {
          console.error("Error fetching community branding:", error);
          // Fallback on error
          setBranding({
            name: 'Diaspora Community',
            logo_url: 'https://i.pinimg.com/474x/54/81/0a/54810acebbc96214ac3b2fa2f1bb8aba.jpg',
            favicon_url: '/favicon.ico',
          });
        }
      } else if (!loading) {
        // Fallback if no user or no community_id (and not loading)
        setBranding({
          name: 'Diaspora Community',
          logo_url: 'https://i.pinimg.com/474x/54/81/0a/54810acebbc96214ac3b2fa2f1bb8aba.jpg',
          favicon_url: '/favicon.ico',
        });
      }
    }
    fetchBranding();
  }, [user, loading]);

  return (
    <>
      <Head>
        <title>{branding.name}</title>
        <link rel="icon" href={branding.favicon_url} />
      </Head>
      <div className="flex flex-col min-h-screen">
        <Navbar branding={branding} />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
} 