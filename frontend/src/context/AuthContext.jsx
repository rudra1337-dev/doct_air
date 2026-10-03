import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on application startup via httpOnly cookie
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const res = await authService.getMe();
        if (isMounted) {
          setUser(res?.user || null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async () => {
    try {
      setError(null);
      const res = await authService.getMe();
      setUser(res?.user || null);
      return res?.user || null;
    } catch {
      setUser(null);
      return null;
    }
  };

  // Register action
  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await authService.register(userData);
      setUser(res.user);
      return res.user;
    } catch (err) {
      const message = err.message || 'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Login action
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await authService.login(credentials);
      setUser(res.user);
      return res.user;
    } catch (err) {
      const message = err.message || 'Login failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
    } catch (err) {
      console.warn('Logout request completed with error:', err.message);
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
