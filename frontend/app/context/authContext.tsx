import React, { createContext, useContext, ReactNode } from 'react';
import { useUser } from '../hooks/useUser';
import { supabase } from '../utils/client';
import { clearUserCache, refreshUserCache } from '../hooks/useUser';
import { Alert } from 'react-native';
import { router } from 'expo-router';

interface fridgeMate {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

interface UserData {
  id: string;
  email: string;
  fridge_id: string | null;
  active_fridge_id?: string | null;
  fridge_count?: number; 
  fridge?: {
    id: string;
    name: string;
  } | null;
  fridgeMates?: fridgeMate[]
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
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
      router.replace('/(tabs)');
      clearUserCache();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    await refreshUserCache();
  };

  const forgotPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:8081/account/reset-password'
      });

      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send password reset email' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, forgotPassword }}>
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