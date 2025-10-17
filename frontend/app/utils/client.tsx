
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// Create storage adapter with logging
const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    console.log("Using localStorage for web");
    return {
      getItem: (key: string) => {
        console.log("localStorage getItem:", key);
        if (typeof window !== 'undefined') {
          const value = window.localStorage.getItem(key);
          console.log("Retrieved value:", value ? "exists" : "null");
          return Promise.resolve(value)
        }
        return Promise.resolve(null)
      },
      setItem: (key: string, value: string) => {
        console.log("localStorage setItem:", key, "value length:", value.length);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value)
          console.log("Saved to localStorage successfully");
        }
        return Promise.resolve()
      },
      removeItem: (key: string) => {
        console.log("localStorage removeItem:", key);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key)
        }
        return Promise.resolve()
      },
    }
  }
  console.log("Using AsyncStorage for mobile");
  return AsyncStorage
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
