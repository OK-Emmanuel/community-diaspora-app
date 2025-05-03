'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { membersApi } from '@/lib/api';
import type { NonFinancialMember } from '@/types/database';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, signOut, isAdmin, isFinancialMember } = useAuth();
  const [dependents, setDependents] = useState<NonFinancialMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Protected route check
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch user's dependants if they are a financial member
    const fetchDependents = async () => {
      try {
        if (user && isFinancialMember()) {
          const data = await membersApi.getDependents(user.id);
          setDependents(data);
        }
      } catch (err) {
        console.error('Error fetching dependants:', err);
        setError('Failed to load dependants. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDependents();
  }, [user, router, isFinancialMember]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      // Router will handle the redirect in the auth hook
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Diaspora Community</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleSignOut}
                className="ml-4 px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                Sign out
              </button>
              {isAdmin() && (
                <Link
                  href="/admin"
                  className="ml-4 px-3 py-1 rounded-md text-sm font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome to your Dashboard</h2>
              <p className="mt-1 text-gray-600">
                Hello, {user.first_name} {user.last_name}!
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {user.role === 'admin' ? 'Admin' : user.role === 'financial' ? 'Financial Member' : 'Non-Financial Member'}
                </span>
                <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : user.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">My Profile</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">View & Edit</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <button
                      onClick={() => router.push('/profile')}
                      className="font-medium text-blue-700 hover:text-blue-900"
                    >
                      View profile
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Community Feed</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">Posts & Announcements</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <button
                      onClick={() => router.push('/feed')}
                      className="font-medium text-blue-700 hover:text-blue-900"
                    >
                      View feed
                    </button>
                  </div>
                </div>
              </div>

              {isAdmin() && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Admin Panel</dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">Manage Members</div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/admin')}
                        className="font-medium text-blue-700 hover:text-blue-900"
                      >
                        Go to admin panel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isFinancialMember() && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Dependants</dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">{loading ? '...' : dependents.length}</div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/profile')}
                        className="font-medium text-blue-700 hover:text-blue-900"
                      >
                        Manage dependants
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 