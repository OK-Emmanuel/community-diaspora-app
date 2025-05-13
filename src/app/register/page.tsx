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
  communityId: z.string().min(1, { message: "Please select a community" }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

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
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      communityId: '',
    }
  });

  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCommunity, setInviteCommunity] = useState<any>(null);

  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      console.log('Found invite token:', token);
      setInviteToken(token);
      
      // First try to fetch the invite details
      fetch(`/api/community/invite?invite_token=${token}`)
        .then(res => {
          console.log('Invite API response status:', res.status);
          if (!res.ok) {
            console.error('Invite API error:', res.statusText);
            throw new Error(`API responded with status ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('Invite API response data:', data);
          if (data && data.community_id) {
            console.log('Setting community ID from invite:', data.community_id);
            setSelectedCommunity(data.community_id);
            setInviteCommunity({
              ...data,
              communityName: `Community ID: ${data.community_id.substring(0, 8)}...`
            });
            setValue('communityId', data.community_id, { shouldValidate: true });
            
            // Try to get community details
            fetch(`/api/community?id=${data.community_id}`)
              .then(res => res.ok ? res.json() : null)
              .then(communityData => {
                if (communityData && Array.isArray(communityData) && communityData.length > 0) {
                  // Update with the actual community name if available
                  setInviteCommunity((prev: any) => ({
                    ...prev,
                    communityName: communityData[0].name
                  }));
                }
              })
              .catch(communityErr => {
                console.error('Error fetching community details:', communityErr);
                // Already using fallback name, so no further action needed
              });
          } else {
            console.error('No community_id in invite data:', data);
            setInviteCommunity(null);
            setInviteToken(null);
            setValue('communityId', '', { shouldValidate: false });
            setSubmitError('Invalid invite: missing community ID');
          }
        })
        .catch(err => {
          console.error("Error processing invite:", err);
          setInviteCommunity(null);
          setInviteToken(null);
          setValue('communityId', '', { shouldValidate: false });
          setSubmitError(`Invalid invite link: ${err.message}. Please contact your community administrator for a valid invite.`);
        });
    } else {
      // No invite token, show message that registration requires an invite
      setInviteCommunity(null);
      setInviteToken(null);
      setValue('communityId', '', { shouldValidate: false });
      setSubmitError('Registration requires a valid community invitation. Please use an invite link provided by your community administrator.');
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await signUp(data.email, data.password, {
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'financial',
        community_id: data.communityId,
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
        
        {!inviteToken && (
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Invitation Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Registration requires a valid community invitation. Please use an invite link provided by your community administrator.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {inviteCommunity && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Valid Invitation
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>You are registering for <strong>{inviteCommunity.communityName || inviteCommunity.community_id}</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {submitError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Registration issue
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
              
              {/* Hidden input for community ID */}
              <input type="hidden" {...register('communityId')} />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !inviteToken}
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