'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { membersApi } from '@/lib/api';
import Link from 'next/link';
import type { NonFinancialMember } from '@/types/database';

export default function AddDependentPage() {
  const { user, loading: authLoading, isFinancialMember } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    relationship: '',
    date_of_birth: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to add a dependant');
      }

      if (!isFinancialMember()) {
        throw new Error('Only financial members can add dependants');
      }

      // Prepare data for submission
      const dependantData: Omit<NonFinancialMember, 'id' | 'created_at' | 'updated_at'> = {
        member_id: user.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        relationship: formData.relationship,
        status: 'active',
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth) : undefined,
      };

      await membersApi.addDependent(dependantData);
      setSuccess('Dependant added successfully!');
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        relationship: '',
        date_of_birth: '',
      });
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err) {
      console.error('Error adding dependant:', err);
      setError(err instanceof Error ? err.message : 'Failed to add dependant');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if not authenticated or not a financial member
  if (!authLoading && (!user || !isFinancialMember())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            {!user 
              ? 'You must be logged in to access this page.' 
              : 'Only financial members can add dependants.'}
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/login" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              {!user ? 'Log In' : 'Dashboard'}
            </Link>
            {user && (
              <Link href="/profile" className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                Profile
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center mb-8">
        <h1 className="text-3xl font-bold">Add Dependant</h1>
        <Link href="/profile" className="ml-auto text-blue-500 hover:text-blue-700">
          Back to Profile
        </Link>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-500 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-500 rounded-md">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <p className="mb-6 text-gray-600">
            Add a dependant (non-financial member) who is related to you. As a financial member, 
            you can add family members or others who qualify as your dependants.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                First Name*
              </label>
              <input
                type="text"
                name="first_name"
                id="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name*
              </label>
              <input
                type="text"
                name="last_name"
                id="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                Relationship*
              </label>
              <select
                name="relationship"
                id="relationship"
                value={formData.relationship}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="other_relative">Other Relative</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                id="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 text-right">
          <Link
            href="/profile"
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded mr-2 hover:bg-gray-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Adding...' : 'Save Dependant'}
          </button>
        </div>
      </form>
    </div>
  );
} 