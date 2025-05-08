'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import type { Member } from '@/types/database';

export default function CommunityMembersPage({ params }: { params: { id: string } }) {
  const { id: communityId } = params;
  const { user, loading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [community, setCommunity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const router = useRouter();

  // Statistics counters
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    financial: 0,
    nonFinancial: 0,
    active: 0,
    inactive: 0,
    pending: 0
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Only allow superadmins to view this page
      if (!isSuperAdmin()) {
        router.push('/dashboard');
        return;
      }
      
      fetchCommunityDetails();
      fetchCommunityMembers();
    }
  }, [user, authLoading, communityId, router]);

  // Fetch community details
  const fetchCommunityDetails = async () => {
    try {
      const communities = await adminApi.getAllCommunities();
      const communityData = communities.find((c: any) => c.id === communityId);
      if (communityData) {
        setCommunity(communityData);
      } else {
        setError('Community not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load community details');
    }
  };

  // Fetch community members
  const fetchCommunityMembers = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getMembersByCommunity(communityId);
      setMembers(Array.isArray(data) ? data : []);
      
      // Calculate statistics
      if (Array.isArray(data)) {
        const totalMembers = data.length;
        const admins = data.filter(m => m.role === 'admin').length;
        const financial = data.filter(m => m.role === 'financial').length;
        const nonFinancial = data.filter(m => m.role === 'non_financial').length;
        const active = data.filter(m => m.status === 'active').length;
        const inactive = data.filter(m => m.status === 'inactive').length;
        const pending = data.filter(m => m.status === 'pending').length;
        
        setStats({
          total: totalMembers,
          admins,
          financial,
          nonFinancial,
          active,
          inactive,
          pending
        });
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching community members:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is client-side filtering on the already fetched data
  };

  // Update member status
  const updateMemberStatus = async (memberId: string, status: Member['status']) => {
    try {
      await adminApi.updateMemberStatus(memberId, status);
      
      // Update local state to reflect the change
      setMembers(members.map(member => 
        member.id === memberId ? { ...member, status } : member
      ));
      
      // Recalculate statistics
      fetchCommunityMembers();
      
    } catch (err: any) {
      console.error('Error updating member status:', err);
      setError('Failed to update member status');
    }
  };

  // Update member role
  const updateMemberRole = async (memberId: string, role: Member['role']) => {
    try {
      await adminApi.updateMemberRole(memberId, role);
      
      // Update local state to reflect the change
      setMembers(members.map(member => 
        member.id === memberId ? { ...member, role } : member
      ));
      
      // Recalculate statistics
      fetchCommunityMembers();
      
    } catch (err: any) {
      console.error('Error updating member role:', err);
      setError('Failed to update member role');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading community members...</p>
        </div>
      </div>
    );
  }

  // Filter members based on search query and role filter
  const filteredMembers = members
    .filter(member => {
      // Apply search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          member.first_name.toLowerCase().includes(searchLower) ||
          member.last_name.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter(member => {
      // Apply role filter
      if (roleFilter !== 'all') {
        return member.role === roleFilter;
      }
      return true;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {community ? `${community.name} Members` : 'Community Members'}
              </h1>
              {community && (
                <p className="text-sm text-gray-500 mt-1">
                  Manage members of this community
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/admin/communities" 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Back to Communities
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="text-sm text-red-700 mt-2">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Total Members</div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">{stats.total}</div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Admins</div>
            <div className="mt-1 text-3xl font-semibold text-purple-600">{stats.admins}</div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Financial Members</div>
            <div className="mt-1 text-3xl font-semibold text-green-600">{stats.financial}</div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Non-Financial</div>
            <div className="mt-1 text-3xl font-semibold text-gray-600">{stats.nonFinancial}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-blue-500 text-white rounded"
                >
                  Search
                </button>
              </form>
            </div>
            <div className="flex-none">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="financial">Financial Members</option>
                <option value="non_financial">Non-Financial Members</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                            {member.profile_image_url ? (
                              <img
                                src={member.profile_image_url}
                                alt={`${member.first_name}'s profile`}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <span className="text-gray-500 text-sm font-medium">
                                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : member.role === 'financial' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role === 'admin' 
                            ? 'Admin' 
                            : member.role === 'financial' 
                            ? 'Financial' 
                            : 'Non-Financial'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : member.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.joined_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/admin/members/${member.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          
                          {/* Role management dropdown */}
                          <div className="relative inline-block text-left">
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(member.id, e.target.value as Member['role'])}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="admin">Admin</option>
                              <option value="financial">Financial</option>
                              <option value="non_financial">Non-Financial</option>
                            </select>
                          </div>
                          
                          {/* Status management dropdown */}
                          <div className="relative inline-block text-left">
                            <select
                              value={member.status}
                              onChange={(e) => updateMemberStatus(member.id, e.target.value as Member['status'])}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="active">Active</option>
                              <option value="pending">Pending</option>
                              <option value="inactive">Inactive</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {isLoading ? 'Loading members...' : 'No members found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
} 