import { useState, useEffect } from 'react';
import { supabase } from '../utils/client';

interface fridgeMate {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  fridge_id: string | null;
  fridge?: {
    id: string;
    name: string;
    emails?: string[]
  } | null;
  fridgeMates?: fridgeMate[]
}

let cachedUser: UserData | null = null;
let listeners: Set<(user: UserData | null) => void> = new Set();

// Notify all listeners when user changes
const notifyListeners = () => {
  listeners.forEach(listener => listener(cachedUser));
};

export const useUser = () => {
  const [user, setUser] = useState<UserData | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    // Add this component as a listener
    listeners.add(setUser);

    // If we already have cached data, use it
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    // Otherwise fetch it
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/userInfo`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          cachedUser = userData;
          setUser(cachedUser);
          notifyListeners(); // Notify all components
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Cleanup: remove listener when component unmounts
    return () => {
      listeners.delete(setUser);
    };
  }, []);

  return { user, loading };
};

export const clearUserCache = () => {
  cachedUser = null;
  notifyListeners();
};

export const refreshUserCache = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      cachedUser = null;
      notifyListeners();
      return null;
    }

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/userInfo`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log("   User ID:", userData.id);
      console.log("   Email:", userData.email);
      console.log("   Fridge ID:", userData.fridge_id);
      console.log("   Fridge data:", userData.fridge);
      console.log("   Full response:", JSON.stringify(userData, null, 2));
      cachedUser = userData;
      notifyListeners(); // Update all components
      return cachedUser;
    }
  } catch (error) {
    console.error('Error refreshing user:', error);
  }
  return null;
};