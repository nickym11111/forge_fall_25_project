import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { SupportedStorage } from '@supabase/supabase-js'

const inMemoryStorage: { [key: string]: string } = {}

export const ExpoSecureStoreAdapter: SupportedStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return inMemoryStorage[key] || null
    }
    try {
      return await SecureStore.getItemAsync(key)
    } catch (error) {
      console.error('SecureStore getItem error:', error)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      inMemoryStorage[key] = value
      return
    }
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (error) {
      console.error('SecureStore setItem error:', error)
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      delete inMemoryStorage[key]
      return
    }
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (error) {
      console.error('SecureStore removeItem error:', error)
    }
  },
}