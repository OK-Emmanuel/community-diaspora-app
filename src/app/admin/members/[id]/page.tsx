'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { Member, NonFinancialMember } from '@/types/database';

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [dependents, setDependents] = useState<NonFinancialMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (!isAdmin()) {
        router.push('/dashboard');
        return;
      }
      
      fetchMemberDetails();
    }
  }, [id, user, authLoading, isAdmin, router]);

  const fetchMemberDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch member details
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();
      
      if (memberError) throw memberError;
      
      if (!memberData) {
        throw new Error('Member not found');
      }
      
      setMember(memberData);
      
      // If this is a financial member, fetch their dependents
      if (memberData.role === 'financial') {
        const { data: dependentsData, error: dependentsError } = await supabase
          .from('non_financial_members')
          .select('*')
          .eq('member_id', id);
        
        if (dependentsError) throw dependentsError;
        
        setDependents(dependentsData || []);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching member details:', err);
      setError('Failed to load member details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading member details...</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Member not found'}</p>
          <Link 
            href="/admin/members" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Members
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Member Details</h1>
            <div className="flex space-x-4">
              <Link 
                href="/admin/members" 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Back to Members
              </Link>
              <Link 
                href={`/admin/members/${id}/edit`} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Edit Member
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Member Profile Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl">
                  {member.profile_image_url ? (
                    <img
                      src={member.profile_image_url}
                      alt={`${member.first_name}'s profile`}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <span>{member.first_name.charAt(0)}{member.last_name.charAt(0)}</span>
                  )}
                </div>
                <div className="ml-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {member.first_name} {member.last_name}
                  </h2>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  <div className="mt-2 flex space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : member.role === 'financial' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role === 'admin' 
                        ? 'Admin' 
                        : member.role === 'financial' 
                        ? 'Financial Member' 
                        : 'Non-Financial Member'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : member.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : member.status === 'suspended' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900">Contact Information</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Email:</dt>
                      <dd className="text-sm text-gray-900">{member.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                      <dd className="text-sm text-gray-900">{member.phone || 'Not provided'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Address:</dt>
                      <dd className="text-sm text-gray-900">{member.address || 'Not provided'}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900">Personal Information</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Date of Birth:</dt>
                      <dd className="text-sm text-gray-900">
                        {member.date_of_birth 
                          ? new Date(member.date_of_birth).toLocaleDateString() 
                          : 'Not provided'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Occupation:</dt>
                      <dd className="text-sm text-gray-900">{member.occupation || 'Not provided'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Joined:</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(member.joined_date).toLocaleDateString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Last Login:</dt>
                      <dd className="text-sm text-gray-900">
                        {member.last_login 
                          ? new Date(member.last_login).toLocaleDateString() 
                          : 'Never'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dependents Section (only for financial members) */}
          {member.role === 'financial' && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="border-b border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900">Dependants</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {member.first_name}'s dependant family members
                </p>
              </div>
              
              <div className="p-6">
                {dependents.length === 0 ? (
                  <p className="text-gray-500 text-center">No dependants found</p>
                ) : (
                  <div className="space-y-6">
                    {dependents.map((dependent) => (
                      <div key={dependent.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-medium text-gray-900">
                              {dependent.first_name} {dependent.last_name}
                            </h4>
                            <p className="text-sm text-gray-500">Relationship: {dependent.relationship}</p>
                            {dependent.date_of_birth && (
                              <p className="text-sm text-gray-500">
                                Date of Birth: {new Date(dependent.date_of_birth).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            dependent.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : dependent.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {dependent.status.charAt(0).toUpperCase() + dependent.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 