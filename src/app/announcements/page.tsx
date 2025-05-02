'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { Announcement, Member } from '@/types/database';

type AnnouncementWithAuthor = Announcement & { 
  author: Pick<Member, 'id' | 'first_name' | 'last_name'> 
};

export default function AnnouncementsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      fetchAnnouncements();
    }
  }, [user, authLoading, router, filterType]);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('announcements')
        .select(`
          *,
          author:members(id, first_name, last_name)
        `);
      
      // Apply filter if not set to 'all'
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }
      
      // Add sorting and filtering for expired announcements
      const { data, error: announcementsError } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (announcementsError) throw announcementsError;
      
      // Filter out expired announcements
      const now = new Date();
      const filteredAnnouncements = data?.filter(announcement => {
        if (!announcement.expires_at) return true;
        return new Date(announcement.expires_at) > now;
      }) || [];
      
      setAnnouncements(filteredAnnouncements as AnnouncementWithAuthor[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  const getAnnouncementTypeBadge = (type: string) => {
    switch (type) {
      case 'general':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            General
          </span>
        );
      case 'financial':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Financial
          </span>
        );
      case 'event':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Event
          </span>
        );
      case 'emergency':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Emergency
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
            {isAdmin() && (
              <Link 
                href="/admin/announcements/create" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create Announcement
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-md">
              {error}
            </div>
          )}
          
          {/* Filters */}
          <div className="mb-6">
            <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by type
            </label>
            <select
              id="typeFilter"
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Announcements</option>
              <option value="general">General</option>
              <option value="financial">Financial</option>
              <option value="event">Event</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          
          <div className="space-y-6">
            {announcements.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <p className="text-gray-500">No announcements found.</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div 
                  key={announcement.id} 
                  className={`bg-white rounded-lg shadow overflow-hidden border-l-4 ${
                    announcement.type === 'emergency' 
                      ? 'border-red-500' 
                      : announcement.type === 'financial' 
                      ? 'border-green-500' 
                      : announcement.type === 'event' 
                      ? 'border-purple-500' 
                      : 'border-blue-500'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getAnnouncementTypeBadge(announcement.type)}
                        {announcement.is_pinned && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(announcement.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {announcement.title}
                    </h2>
                    
                    <div className="prose max-w-none mb-4">
                      <p className="text-gray-700 whitespace-pre-line">{announcement.content}</p>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-500 flex justify-between">
                      <p>
                        By: {announcement.author?.first_name} {announcement.author?.last_name}
                      </p>
                      {announcement.expires_at && (
                        <p>
                          Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    {isAdmin() && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                        <Link 
                          href={`/admin/announcements/${announcement.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 