/**
 * Auth Context - Global authentication state
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getAccessToken, getRefreshToken } from '../services/secureAuthStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getAccessToken();
      const refreshToken = await getRefreshToken();
      if (!token && refreshToken) {
        await authAPI.refreshSession();
      }

      if (token || refreshToken) {
        const result = await authAPI.getCurrentUser();
        if (result.success) {
          setUser(result.data);
          setIsAuthenticated(true);
        } else {
          await authAPI.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      await authAPI.logout();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const result = await authAPI.login(username, password);
    if (result.success) {
      const userResult = await authAPI.getCurrentUser();
      if (userResult.success) {
        setUser(userResult.data);
        setIsAuthenticated(true);
      }
    }
    return result;
  };

  const register = async (email, username, password, fullName) => {
    return await authAPI.register(email, username, password, fullName);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const googleSignIn = async (idToken) => {
    const result = await authAPI.googleSignIn(idToken);
    if (result.success) {
      const userResult = await authAPI.getCurrentUser();
      if (userResult.success) {
        setUser(userResult.data);
        setIsAuthenticated(true);
      }
    }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        googleSignIn,
        checkAuth,
      }}
    >
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
