'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/types/database';

// Form validation schema
const registerSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = Omit<z.infer<typeof registerSchema>, 'role'>;

// This component contains the actual form logic and uses useSearchParams
function RegisterFormContents() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCommunity, setInviteCommunity] = useState<any>(null);

  useEffect(() => {
    // Check for invite token in URL
    const token = searchParams.get('invite');
    if (token) {
      setInviteToken(token);
      // Fetch invite details
      fetch(`/api/community/invite?invite_token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.community_id) {
            setSelectedCommunity(data.community_id);
            setInviteCommunity(data);
            
            // Fetch the community name
            fetch(`/api/community?id=eq.${data.community_id}`)
              .then(res => res.json())
              .then(communityData => {
                if (communityData && communityData.length > 0) {
                  // Update the invite community with the actual name
                  setInviteCommunity({
                    ...data,
                    communityName: communityData[0].name
                  });
                }
              })
              .catch(err => console.error("Error fetching community details:", err));
          }
        })
        .catch(err => console.error("Error fetching invite details:", err));
    } else {
      // Fetch all communities for selection
      fetch('/api/community')
        .then(res => res.json())
        .then(data => setCommunities(data))
        .catch(err => console.error("Error fetching communities:", err));
    }
  }, [searchParams]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      if (!selectedCommunity) {
        setSubmitError('Please select a community.');
        setIsSubmitting(false);
        return;
      }
      await signUp(data.email, data.password, {
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'financial',
        community_id: selectedCommunity,
      });
      // On successful registration
      router.push('/login?registered=true');
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        // Check for common Supabase errors
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          setSubmitError('An account with this email already exists. Please log in instead.');
        } else if (error.message.includes('Email rate limit exceeded')) {
          setSubmitError('Too many signup attempts. Please try again later.');
        } else {
          setSubmitError(error.message || 'An unexpected error occurred during registration.');
        }
      } else {
        setSubmitError('An unexpected error occurred during registration');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {submitError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Registration failed
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{submitError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="grid grid-cols-1 gap-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  {...register('firstName')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  {...register('lastName')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="community" className="block text-sm font-medium text-gray-700">
                  Community
                </label>
                {inviteCommunity ? (
                  <input
                    id="community"
                    type="text"
                    value={inviteCommunity.communityName || inviteCommunity.community_id}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                ) : (
                  <select
                    id="community"
                    {...register('communityId')}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Select a community</option>
                    {communities.map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.communityId && (
                  <p className="mt-1 text-sm text-red-600">{errors.communityId.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Default export for the page, wrapping the form contents with Suspense
export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading registration form...</div>}>
      <RegisterFormContents />
    </Suspense>
  );
} 