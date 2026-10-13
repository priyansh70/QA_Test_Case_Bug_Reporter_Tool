import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { parseApiResponse, friendlyNetworkError } from '../services/apiError';
import { refreshAccessToken } from '../services/tokenManager';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('qatk_token') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('qatk_refresh_token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('qatk_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  const refreshTimeoutRef = useRef(null);

  // Schedule automatic token refresh before expiry
  const scheduleTokenRefresh = useCallback((expiresAt) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    if (!expiresAt) return;

    // Refresh 1 minute before expiry
    const refreshIn = Math.max(expiresAt - Date.now() - 60000, 5000);
    refreshTimeoutRef.current = setTimeout(async () => {
      const result = await refreshAccessToken();
      if (result) {
        setToken(result.token);
        setRefreshToken(result.refreshToken);
        if (result.user) {
          setUser(result.user);
          localStorage.setItem('qatk_user', JSON.stringify(result.user));
        }
        scheduleTokenRefresh(result.expiresAt);
      }
    }, refreshIn);
  }, []);

  const applySession = useCallback((data) => {
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    localStorage.setItem('qatk_token', data.token);
    localStorage.setItem('qatk_refresh_token', data.refreshToken);
    localStorage.setItem('qatk_user', JSON.stringify(data.user));
    scheduleTokenRefresh(data.expiresAt);
  }, [scheduleTokenRefresh]);

  // Listen for global session-expired events from api.js / tokenManager
  useEffect(() => {
    const handleSessionExpired = () => {
      logoutLocally();
      window.location.reload();
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // Verify stored token on initial mount
  useEffect(() => {
    const verifyStoredToken = async () => {
      const storedToken = localStorage.getItem('qatk_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        const data = await parseApiResponse(res);

        if (data.success && data.user) {
          setUser(data.user);
          setToken(storedToken);
        } else {
          // Token invalid or expired — try refresh
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            logoutLocally();
          }
        }
      } catch (err) {
        console.error('Token validation check failed:', err);
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          logoutLocally();
        }
      } finally {
        setLoading(false);
      }
    };

    verifyStoredToken();
  }, []);

  const logoutLocally = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('qatk_token');
    localStorage.removeItem('qatk_refresh_token');
    localStorage.removeItem('qatk_user');
    try {
      sessionStorage.clear();
    } catch {}
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    window.dispatchEvent(new CustomEvent('auth:logout'));
  };

  const login = async (username, password) => {
    let res;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      throw friendlyNetworkError();
    }

    const data = await parseApiResponse(res);
    if (!data.success) {
      throw new Error(data.error || 'Authentication failed');
    }

    applySession(data);
    return data.user;
  };

  const register = async (userData) => {
    let res;
    try {
      res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    } catch {
      throw friendlyNetworkError();
    }

    const data = await parseApiResponse(res);
    if (!data.success) {
      throw new Error(data.error || 'Registration failed');
    }

    applySession(data);
    return data.user;
  };

  const logout = async () => {
    const currentRefreshToken = localStorage.getItem('qatk_refresh_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });
      } catch (e) {
        // Ignore logout network errors
      }
    }
    logoutLocally();
  };

  // Helper function to perform authenticated API calls with auto-refresh
  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch {
      throw friendlyNetworkError();
    }

    // If token expired, attempt silent refresh and retry once
    if (res.status === 401 && !options._retry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed.token}`;
        try {
          res = await fetch(url, { ...options, headers, _retry: true });
        } catch {
          throw friendlyNetworkError();
        }
      } else {
        logoutLocally();
        throw new Error('Your session has expired. Please log in again.');
      }
    }

    return res;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('qatk_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        user,
        isAuthenticated: Boolean(token && user),
        loading,
        login,
        register,
        logout,
        updateUser,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
