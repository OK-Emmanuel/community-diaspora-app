'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { announcementsApi } from '@/lib/api';
import type { AnnouncementWithAuthor } from '@/types/database';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get author name
  const getAuthorName = (author: { first_name?: string; last_name?: string } | null | undefined) => {
    if (!author) return 'Admin';
    return `${author.first_name || ''} ${author.last_name || ''}`.trim() || 'Admin';
  };

  useEffect(() => {
    if (!loading && user) {
      fetchPinnedAnnouncements();
    }
  }, [loading, user]);

  const fetchPinnedAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      
      // Get current date for filtering out expired announcements
      const today = new Date();
      
      // Fetch all announcements
      const data = await announcementsApi.getAnnouncements();
      
      // Filter pinned and non-expired announcements client-side
      const pinned = data
        .filter(a => 
          a.is_pinned && 
          (!a.expires_at || new Date(a.expires_at) > today)
        )
        .slice(0, 3);
      
      setAnnouncements(pinned as AnnouncementWithAuthor[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements. Please try refreshing the page.');
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Welcome to the Diaspora Community
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-blue-100">
              Connect, share, and grow with members of your community.
            </p>
            <div className="mt-10 flex justify-center">
              {!loading && !user && (
                <div className="space-x-4">
                  <Link 
                    href="/login" 
                    className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:text-lg"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/register" 
                    className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-700 md:text-lg"
                  >
                    Register
                  </Link>
                </div>
              )}
              {!loading && user && (
                <Link 
                  href="/dashboard" 
                  className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:text-lg"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Community Features
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Everything you need to stay connected with your community.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Community Feed</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-base text-gray-500">
                  Share updates, photos, and stories with your community. Engage through comments and likes.
                </p>
              </div>
              <div className="mt-6">
                <Link 
                  href="/feed" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  View Feed
                </Link>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Announcements</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-base text-gray-500">
                  Stay updated with important community announcements, events, and news.
                </p>
              </div>
              <div className="mt-6">
                <Link 
                  href="/announcements" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  View Announcements
                </Link>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Member Directory</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-base text-gray-500">
                  Connect with other members of the community and grow your network.
                </p>
              </div>
              <div className="mt-6">
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Announcements Section */}
      {user && !loading && (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Important Announcements
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500">
              Stay updated with the latest information
            </p>
          </div>

          <div className="mt-12">
            {loadingAnnouncements ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading announcements...</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-500">{error}</div>
            ) : announcements.length > 0 ? (
              <div className="space-y-6">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                        </span>
                      </div>
                      <p className="mt-3 text-gray-600">
                        {announcement.content.length > 200
                          ? `${announcement.content.substring(0, 200)}...`
                          : announcement.content}
                      </p>
                      <div className="mt-4 flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            Posted by {announcement.author ? getAuthorName(announcement.author) : 'Admin'} on{' '}
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Link
                          href="/announcements"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View All Announcements
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600">No pinned announcements at this time.</p>
                <div className="mt-4">
                  <Link
                    href="/announcements"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    View All Announcements
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Section */}
      <div className="bg-blue-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Have Questions?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              We're here to help you get the most out of your community experience.
            </p>
            <div className="mt-6">
              <a
                href="mailto:support@diasporacommunity.org"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
