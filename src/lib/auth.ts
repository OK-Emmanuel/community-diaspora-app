import { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Member, UserRole } from '@/types/database';

export interface AuthState {
  user: Member | null;
  loading: boolean;
  error: Error | null;
}

export interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, userData: Partial<Member>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Member>) => Promise<void>;
  isAdmin: () => boolean;
  isFinancialMember: () => boolean;
  isSuperAdmin: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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