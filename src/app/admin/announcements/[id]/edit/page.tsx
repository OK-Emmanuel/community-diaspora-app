'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { Announcement } from '@/types/database';

export default function EditAnnouncementPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    type: 'general',
    is_pinned: false,
    expires_at: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (!isAdmin()) {
        router.push('/announcements');
        return;
      }
      
      fetchAnnouncement();
    }
  }, [id, user, authLoading, isAdmin, router]);

  const fetchAnnouncement = async () => {
    try {
      setIsLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!data) {
        throw new Error('Announcement not found');
      }
      
      // Format date for input field
      setFormData({
        ...data,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString().split('T')[0] : '',
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching announcement:', err);
      setError('Failed to load announcement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isAdmin()) {
      setError('Only administrators can edit announcements');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate the form
      if (!formData.title?.trim()) {
        throw new Error('Title is required');
      }
      
      if (!formData.content?.trim()) {
        throw new Error('Content is required');
      }

      // Prepare data for update
      const updateData = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        is_pinned: formData.is_pinned,
        expires_at: formData.expires_at ? new Date(formData.expires_at) : null,
      };

      // Update the announcement
      const { error: updateError } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
      
      setSuccess('Announcement updated successfully!');
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/announcements');
      }, 2000);
    } catch (err) {
      console.error('Error updating announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to update announcement. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return;
    }
    
    if (!user || !isAdmin()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      router.push('/announcements');
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete announcement. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            {!user ? 'Please log in to access this page' : 'You do not have permission to edit announcements'}
          </p>
          <Link 
            href={!user ? '/login' : '/announcements'} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {!user ? 'Log In' : 'View Announcements'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Edit Announcement</h1>
            <Link 
              href="/announcements" 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </Link>
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
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-500 rounded-md">
              {success}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title*
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={formData.title || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter announcement title"
                  />
                </div>
                
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type*
                  </label>
                  <select
                    name="type"
                    id="type"
                    value={formData.type || 'general'}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="financial">Financial</option>
                    <option value="event">Event</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Content*
                  </label>
                  <textarea
                    name="content"
                    id="content"
                    value={formData.content || ''}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write the announcement content here..."
                  ></textarea>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_pinned"
                    id="is_pinned"
                    checked={formData.is_pinned || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_pinned" className="ml-2 block text-sm text-gray-700">
                    Pin this announcement
                  </label>
                </div>
                
                <div>
                  <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date (optional)
                  </label>
                  <input
                    type="date"
                    name="expires_at"
                    id="expires_at"
                    value={formData.expires_at || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank if the announcement doesn't expire
                  </p>
                </div>
                
                <div className="flex items-center justify-end space-x-3">
                  <Link 
                    href="/announcements"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          {/* Delete Announcement Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-medium text-red-600 mb-2">Delete Announcement</h3>
              <p className="text-gray-600 mb-4">
                This will permanently remove this announcement. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                Delete Announcement
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 