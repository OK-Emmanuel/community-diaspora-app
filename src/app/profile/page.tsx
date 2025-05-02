'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { membersApi } from '@/lib/api';
import Link from 'next/link';
import type { NonFinancialMember } from '@/types/database';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [dependents, setDependents] = useState<NonFinancialMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }

    const fetchDependents = async () => {
      try {
        if (user) {
          const data = await membersApi.getDependents(user.id);
          setDependents(data);
        }
      } catch (err) {
        console.error('Error fetching dependents:', err);
        setError('Failed to load dependents. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDependents();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile.</p>
          <Link href="/login" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="flex items-center p-6 border-b">
          <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-2xl overflow-hidden">
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt={`${user.first_name}'s profile`} className="h-full w-full object-cover" />
            ) : (
              <span>{user.first_name.charAt(0)}{user.last_name.charAt(0)}</span>
            )}
          </div>
          <div className="ml-6">
            <h2 className="text-2xl font-bold">{user.first_name} {user.last_name}</h2>
            <p className="text-gray-600">{user.email}</p>
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
          <div className="ml-auto">
            <Link href="/profile/edit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Edit Profile
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Contact Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2">{user.email}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2">{user.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Address:</span>
                  <span className="ml-2">{user.address || 'Not provided'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Personal Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500">Date of Birth:</span>
                  <span className="ml-2">
                    {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Occupation:</span>
                  <span className="ml-2">{user.occupation || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Member Since:</span>
                  <span className="ml-2">
                    {user.joined_date ? new Date(user.joined_date).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.role === 'financial' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Dependents</h3>
              <Link href="/profile/add-dependent" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                Add Dependent
              </Link>
            </div>
          </div>
          
          {error && (
            <div className="p-6 bg-red-50 text-red-500">{error}</div>
          )}
          
          {dependents.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              You haven't added any dependents yet.
            </div>
          ) : (
            <div className="divide-y">
              {dependents.map((dependent) => (
                <div key={dependent.id} className="p-6 flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{dependent.first_name} {dependent.last_name}</h4>
                    <p className="text-sm text-gray-500">Relationship: {dependent.relationship}</p>
                    {dependent.date_of_birth && (
                      <p className="text-sm text-gray-500">
                        Date of Birth: {new Date(dependent.date_of_birth).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Link 
                      href={`/profile/edit-dependent/${dependent.id}`} 
                      className="text-blue-500 hover:text-blue-700 mr-4"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 