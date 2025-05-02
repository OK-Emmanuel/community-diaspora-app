import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import type { Member, UserRole } from '@/types/database';

interface AuthState {
  user: Member | null;
  loading: boolean;
  error: Error | null;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, userData: Partial<Member>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Member>) => Promise<void>;
  isAdmin: () => boolean;
  isFinancialMember: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          // Fetch member data
          const { data: memberData, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            setState({ user: null, loading: false, error });
            return;
          }

          setState({ user: memberData, loading: false, error: null });
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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Create member profile
        const { error: profileError } = await supabase
          .from('members')
          .insert([
            {
              id: authData.user.id,
              email,
              ...userData,
              role: 'financial' as UserRole, // Default role
              status: 'pending' as const,
            },
          ]);

        if (profileError) throw profileError;
      }
    } catch (error) {
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
  const isFinancialMember = () => state.user?.role === 'financial';

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        updateProfile,
        isAdmin,
        isFinancialMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to protect routes
export function useRequireAuth(requiredRole?: UserRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }

    if (!loading && user && requiredRole && user.role !== requiredRole) {
      router.push('/dashboard');
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
} 