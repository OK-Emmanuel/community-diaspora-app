'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import { AuthContext, AuthState, AuthContextType } from './auth';
import type { Member, UserRole } from '@/types/database';

// Import URL and key for direct API calls
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const router = useRouter();

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          try {
            // Fetch member data with improved error handling
            console.log("Session user ID:", session.user.id);
            
            // Use direct fetch with explicit headers to avoid 401 errors
            const fetchMemberProfile = async (userId: string) => {
              const endpoint = `${supabaseUrl}/rest/v1/members?select=*&id=eq.${userId}`;
              
              // Use explicit headers rather than relying on Supabase client defaults
              const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              });
              
              if (!response.ok) {
                throw new Error(`Failed to fetch member profile: ${response.status} ${response.statusText}`);
              }
              
              const data = await response.json();
              return data[0]; // Get the first record
            };
            
            try {
              // Attempt direct fetch first
              const memberData = await fetchMemberProfile(session.user.id);
              
              if (memberData) {
                setState({ user: memberData, loading: false, error: null });
                return;
              } else {
                console.warn("No member record found - attempting to create one");
              }
            } catch (fetchError) {
              console.error("Direct fetch failed:", fetchError);
            }
            
            // Try using Supabase client as fallback
            try {
              const { data: memberData, error } = await supabase
                .from('members')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (memberData) {
                setState({ user: memberData, loading: false, error: null });
                return;
              }
              
              if (error) {
                console.error("Supabase client fetch failed:", error);
              }
            } catch (clientError) {
              console.error("Supabase client error:", clientError);
            }
            
            // New fallback: Try the server-side API route
            try {
              console.log("Attempting to use server-side API route");
              const response = await fetch('/api/member', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => null) || await response.text();
                const errorMessage = typeof errorData === 'object' && errorData.error 
                  ? errorData.error 
                  : `HTTP ${response.status}`;
                throw new Error(`API error: ${errorMessage}`);
              }
              
              const memberData = await response.json();
              if (memberData && !memberData.error) {
                console.log("Successfully fetched member via API route:", memberData);
                setState({ user: memberData, loading: false, error: null });
                return;
              }
            } catch (apiError) {
              console.error("API route fetch failed:", apiError);
            }
            
            // Last resort - create a new member record
            try {
              const { data: newMember, error: insertError } = await supabase
                .from('members')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  first_name: session.user.user_metadata?.first_name || 'User',
                  last_name: session.user.user_metadata?.last_name || '',
                  role: session.user.user_metadata?.role || 'financial',
                  status: 'active'
                })
                .select()
                .single();
              
              if (insertError) {
                console.error("Failed to create member record:", insertError);
                setState({ 
                  user: null, 
                  loading: false, 
                  error: new Error(`Failed to create member profile: ${insertError.message}`)
                });
              } else if (newMember) {
                console.log("Created new member record:", newMember);
                setState({ user: newMember, loading: false, error: null });
              } else {
                setState({ 
                  user: null, 
                  loading: false, 
                  error: new Error("Unknown error creating member profile")
                });
              }
            } catch (createError) {
              console.error("Error in member creation:", createError);
              setState({ 
                user: null, 
                loading: false, 
                error: createError instanceof Error ? createError : new Error("Unknown error")
              });
            }
          } catch (error) {
            console.error("Unexpected error in auth handler:", error);
            setState({ user: null, loading: false, error: error as Error });
          }
        } else {
          setState({ user: null, loading: false, error: null });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: Partial<Member>) => {
    try {
      // Sign up with Supabase Auth - disable email confirmation for local development
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          // For development only - turn this off in production
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            community_id: userData.community_id,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        try {
          // First check if a member with this email already exists
          const { data: existingMember } = await supabase
            .from('members')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();
            
          if (existingMember) {
            // If a member exists but has a different ID, update the record instead
            const { error: updateError } = await supabase
              .from('members')
              .update({
                first_name: userData.first_name,
                last_name: userData.last_name,
                role: userData.role || 'financial',
                status: 'pending',
                community_id: userData.community_id,
              })
              .eq('id', existingMember.id);
              
            if (updateError) {
              console.error("Profile update error:", updateError);
              throw updateError;
            }
          } else {
            // Create new member profile if no existing member was found
            const { error: profileError } = await supabase
              .from('members')
              .upsert([
                {
                  id: authData.user.id,
                  email,
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  role: userData.role || 'financial',
                  status: 'pending',
                  community_id: userData.community_id,
                }
              ], { onConflict: 'id' });

            if (profileError) {
              console.error("Profile creation error:", profileError);
              throw profileError;
            }
          }
          
          // Check if the registration came from an invite link
          if (userData.community_id && window.location.search.includes('invite=')) {
            // Extract the invite token from the URL
            const urlParams = new URLSearchParams(window.location.search);
            const inviteToken = urlParams.get('invite');
            
            if (inviteToken) {
              // Accept the invite
              await fetch('/api/community/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  invite_token: inviteToken,
                  userId: authData.user.id
                })
              });
            }
          }
        } catch (profileError) {
          console.error("Caught profile creation error:", profileError);
          throw profileError;
        }
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  const updateProfile = async (data: Partial<Member>) => {
    try {
      if (!state.user?.id) throw new Error('No user logged in');

      const { error } = await supabase
        .from('members')
        .update(data)
        .eq('id', state.user.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...data } : null,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  const isAdmin = () => state.user?.role === 'admin';
  const isSuperAdmin = () => state.user?.role === 'superadmin';
  const isFinancialMember = () => state.user?.role === 'financial';

  const contextValue: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAdmin,
    isFinancialMember,
    isSuperAdmin,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
} 