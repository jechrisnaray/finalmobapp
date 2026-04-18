import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const AUTH_TOKEN_KEY = 'healthysteps_auth_token';

interface User {
  userId: Id<'users'>;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (name: string, password: string) => Promise<void>;
  register: (name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Convex mutations
  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);

  // Verify session — only query when we have a token
  const sessionData = useQuery(
    api.auth.verifySession,
    token ? { token } : 'skip'
  );

  // Load token from storage on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
          setToken(savedToken);
        }
      } catch (error) {
        console.error('Failed to load auth token:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadToken();
  }, []);

  // Track whether we've already cleared an invalid token to prevent loops
  const hasCleared = useRef(false);

  // Update user when session data changes
  useEffect(() => {
    if (!isInitialized) return;

    // No token — nothing to verify, stop loading
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Query still loading
    if (sessionData === undefined) {
      return;
    }

    if (sessionData) {
      // Valid session
      hasCleared.current = false;
      setUser({
        userId: sessionData.userId,
        name: sessionData.name,
      });
      setIsLoading(false);
    } else if (sessionData === null && !hasCleared.current) {
      // Session expired or invalid — clear token ONCE
      hasCleared.current = true;
      setToken(null);
      setUser(null);
      setIsLoading(false);
      AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, [sessionData, isInitialized, token]);

  const login = useCallback(async (name: string, password: string) => {
    try {
      const result = await loginMutation({ name, password });
      const newToken = result.token;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      setToken(newToken);
      setUser({
        userId: result.userId,
        name: result.userName,
      });
    } catch (error: any) {
      throw new Error(error.message || 'Login gagal');
    }
  }, [loginMutation]);

  const register = useCallback(async (name: string, password: string) => {
    try {
      const result = await registerMutation({ name, password });
      const newToken = result.token;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      setToken(newToken);
      setUser({
        userId: result.userId,
        name: name.trim(),
      });
    } catch (error: any) {
      throw new Error(error.message || 'Registrasi gagal');
    }
  }, [registerMutation]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await logoutMutation({ token });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, [token, logoutMutation]);

  return (
    <AuthContext.Provider
      value={useMemo(() => ({
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }), [user, token, isLoading, login, register, logout])}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
