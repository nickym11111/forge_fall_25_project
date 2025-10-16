import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

interface AuthContextType {
  login: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    dietaryRestrictions?: string[]
  ) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  getToken: () => Promise<string | null>;
  getUser: () => Promise<any | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// SecureStore keys
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Helper functions for SecureStore
  const storeData = async (key: string, value: any) => {
    try {
      const valueToStore =
        typeof value === "string" ? value : JSON.stringify(value);
      await SecureStore.setItemAsync(key, valueToStore);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
    }
  };

  const getData = async (key: string) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value === null) return null;

      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  };

  const removeData = async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  };

  // Check for existing token on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getData(TOKEN_KEY);
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error("Error checking auth status:", error);
      }
    };

    checkAuth();
  }, []);

  const getToken = async (): Promise<string | null> => {
    return getData(TOKEN_KEY);
  };

  const getUser = async (): Promise<any | null> => {
    return getData(USER_KEY);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/log-in/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      // Store token and user data
      await storeData(TOKEN_KEY, data.session.access_token);
      await storeData(USER_KEY, data.user);
      setIsAuthenticated(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during login"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    dietaryRestrictions?: string[]
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/users/sign-up/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          dietaryRestrictions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();

      // Store token and user data
      await storeData(TOKEN_KEY, data.session.access_token);
      await storeData(USER_KEY, data.user);
      setIsAuthenticated(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during registration"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await removeData(TOKEN_KEY);
      await removeData(USER_KEY);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const value = {
    login,
    signUp,
    logout,
    loading,
    error,
    isAuthenticated,
    getToken,
    getUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
