import React, { createContext, useContext, ReactNode } from 'react';
import { useUser } from '../hooks/useUser';
import { supabase } from '../utils/client';
import { clearUserCache, refreshUserCache } from '../hooks/useUser';
import { Alert } from 'react-native';

interface UserData {
  id: string;
  email: string;
  fridge_id: string | null;
  fridge?: {
    id: string;
    name: string;
  } | null;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useUser(); // Use the hook!

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        // Fetch and cache user data
        await refreshUserCache();
        return { success: true };
      }

      return { success: false, error: 'No session created' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      clearUserCache();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    await refreshUserCache();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};