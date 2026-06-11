import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

import { loginUser } from '../services/api';
import {
  getAccessToken,
  setTokens,
  clearTokens,
  getStoredUser,
  setStoredUser,
  isAuthenticated,
  decodeToken,
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore user from storage if token is still valid
  useEffect(() => {
    if (isAuthenticated()) {
      const stored = getStoredUser();
      if (stored) {
        setUser(stored);
      } else {
        // No stored user but token exists — decode what we can
        const token = getAccessToken();
        const payload = decodeToken(token);
        if (payload) {
          setUser({
            id: payload.sub,
            email: payload.email || '',
            role: payload.role || '',
          });
        }
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await loginUser(email, password);

    // Store tokens
    setTokens(result.tokens.access_token, result.tokens.refresh_token);

    // Store user profile
    if (result.user) {
      setStoredUser(result.user);
      setUser(result.user);
    } else {
      // Token has user data embedded
      const payload = decodeToken(result.tokens.access_token);
      const profile = {
        id: payload?.sub,
        email: payload?.email || email,
        role: payload?.role || '',
      };
      setStoredUser(profile);
      setUser(profile);
    }

    return result;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
