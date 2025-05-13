'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { membersApi, adminApi } from '@/lib/api';
import type { NonFinancialMember, Member, Community as BaseCommunity } from '@/types/database';
import Link from 'next/link';

// Extend the Community type to include status for dashboard stats
type Community = BaseCommunity & { status?: 'active' | 'inactive' | 'pending' | 'suspended' };

export default function DashboardPage() {
  const { user, signOut, isAdmin, isSuperAdmin, isFinancialMember } = useAuth();
  const [dependents, setDependents] = useState<NonFinancialMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const router = useRouter();

  // Protected route check
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Superadmin analytics fetch
    if (isSuperAdmin()) {
      setAnalyticsLoading(true);
      Promise.all([
        adminApi.getAllMembers(),
        adminApi.getAllCommunities(),
      ]).then(([membersData, communitiesData]) => {
        setMembers(membersData || []);
        setCommunities(communitiesData || []);
        setAnalyticsError(null);
      }).catch((err) => {
        setAnalyticsError(err.message || 'Failed to load analytics');
      }).finally(() => setAnalyticsLoading(false));
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
  }, [user, router, isFinancialMember, isSuperAdmin]);

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

            {/* Superadmin Platform Analytics */}
            {isSuperAdmin() && (
              <div className="border-4 border-dashed border-gray-200 rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Platform Analytics</h2>
                {analyticsLoading ? (
                  <div className="text-center text-gray-500">Loading analytics...</div>
                ) : analyticsError ? (
                  <div className="text-center text-red-500">{analyticsError}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard label="Total Communities" value={communities.length} color="blue" href="/admin/communities" />
                    <StatCard label="Total Members" value={members.length} color="green" href="/admin/members" />
                    <StatCard label="Admins" value={members.filter((m) => m.role === 'admin').length} color="purple" href="/admin/members?role=admin" />
                    {/* <StatCard label="Superadmins" value={members.filter((m) => m.role === 'superadmin').length} color="yellow" href="/admin/members?role=superadmin" /> */}
                    <StatCard label="Active Communities" value={communities.filter((c) => c.status === 'active').length} color="emerald" href="/admin/communities?status=active" />
                    <StatCard label="Inactive Communities" value={communities.filter((c) => c.status !== 'active').length} color="red" href="/admin/communities?status=inactive" />
                    <StatCard label="Active Members" value={members.filter((m) => m.status === 'active').length} color="emerald" href="/admin/members?status=active" />
                    <StatCard label="Inactive Members" value={members.filter((m) => m.status !== 'active').length} color="red" href="/admin/members?status=inactive" />
                  </div>
                )}
              </div>
            )}

            {/* Superadmin Management Shortcuts */}
            {isSuperAdmin() && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <DashboardCard href="/admin/communities" color="blue" icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5m6 0v-6a4 4 0 00-8 0v6" /></svg>
                } title="Community Management" desc="Create, edit, and manage communities and invite links" />
                <DashboardCard href="/admin/members" color="purple" icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                } title="Member Management" desc="View, edit, and manage all community members" />
                <DashboardCard href="/announcements" color="green" icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                } title="Announcements" desc="Create and manage community announcements" />
                {/* <DashboardCard href="/admin/events" color="yellow" icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                } title="Events" desc="Create and manage community events" />
                <DashboardCard href="/admin/contributions" color="red" icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                } title="Contributions" desc="Track and manage member contributions" /> */}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DashboardCard href="/profile" color="blue" icon={
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              } title="My Profile" desc="View & Edit" />

              <DashboardCard href="/feed" color="green" icon={
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              } title="Community Feed" desc="Posts & Announcements" />

              {(isAdmin() || isSuperAdmin()) && (
                <DashboardCard
                  href={isSuperAdmin() ? "/admin/members" : `/admin/communities/${user?.community_id}/members`}
                  color="purple"
                  icon={
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  }
                  title="Membership"
                  desc="Manage Members"
                />
              )}

              {isFinancialMember() && (
                <DashboardCard href="/profile" color="yellow" icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                } title="Dependants" desc={loading ? '...' : `${dependents.length}`} />
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

// StatCard component for analytics (clickable)
function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const router = useRouter();
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    purple: "bg-purple-100 text-purple-800",
    yellow: "bg-yellow-100 text-yellow-800",
    emerald: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <div
      className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer transition hover:shadow-lg hover:ring-2 hover:ring-blue-200`}
      onClick={() => href && router.push(href)}
      tabIndex={href ? 0 : -1}
      onKeyDown={e => { if (href && e.key === 'Enter') router.push(href); }}
      role={href ? 'button' : undefined}
      aria-label={label}
    >
      <div className="p-5 flex flex-col items-center">
        <div className={`text-3xl font-bold mb-2 ${colorMap[color]}`}>{value}</div>
        <div className="text-md font-medium text-gray-700 text-center">{label}</div>
      </div>
    </div>
  );
}

// Fully clickable dashboard card
import { useRouter as useNextRouter } from 'next/navigation';
import React from 'react';
function DashboardCard({ href, color, icon, title, desc }: { href: string, color: string, icon: React.ReactNode, title: string, desc: string }) {
  const router = useNextRouter();
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };
  return (
    <div
      className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition hover:shadow-lg hover:ring-2 hover:ring-blue-200"
      onClick={() => router.push(href)}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') router.push(href); }}
      role="button"
      aria-label={title}
    >
      <div className="p-5 flex items-center">
        <div className={`flex-shrink-0 rounded-md p-3 ${colorMap[color]}`}>{icon}</div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-medium text-gray-900">{desc}</div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
} 