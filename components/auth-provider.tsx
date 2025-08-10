'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check session on mount
    checkSession();
  }, []);

  const signIn = async () => {
    // Use Better Auth client to sign in with OAuth provider
    await authClient.signIn.oauth2({
      providerId: "mkhoatd",
      callbackURL: window.location.origin
    })
  };

  const checkSession = async () => {
    try {
      const { data: session } = await authClient.getSession();
      console.log('Session check:', session);
      if (session?.user) {
        setUser(session.user as User);
      }
      // Don't auto-redirect to login, let the app handle unauthenticated state
    } catch (error) {
      console.error('Failed to get session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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