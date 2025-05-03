'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { notificationsApi } from '@/lib/api';
import Link from 'next/link';
import type { Notification } from '@/types/database';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      fetchNotifications();
    }
  }, [user, authLoading, router]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      
      if (!user) return;
      
      const data = await notificationsApi.getNotifications(user.id);
      
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true } 
          : notification
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      await notificationsApi.markAllAsRead(user.id);
      
      // Update local state
      setNotifications(notifications.map(notification => ({ 
        ...notification, 
        is_read: true 
      })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read.');
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            {notifications.some(n => !n.is_read) && (
              <button 
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-500 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <p className="text-gray-500">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                    notification.is_read 
                      ? 'border-gray-300' 
                      : 'border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${
                        notification.is_read 
                          ? 'text-gray-700' 
                          : 'text-blue-700'
                      }`}>
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 mb-2">{notification.content}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(notification.created_at)}
                      </p>
                      {!notification.is_read && (
                        <span className="inline-block mt-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {notification.link && (
                        <Link 
                          href={notification.link}
                          onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                      )}
                      {!notification.is_read && (
                        <button 
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
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