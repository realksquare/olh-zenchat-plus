import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('zenToken');
      const storedUser = await SecureStore.getItemAsync('zenUser');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUserState(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const setUser = async (userData) => {
    setUserState(userData);
    await SecureStore.setItemAsync('zenUser', JSON.stringify(userData));
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;

      await SecureStore.setItemAsync('zenToken', newToken);
      await SecureStore.setItemAsync('zenUser', JSON.stringify(userData));

      setToken(newToken);
      setUserState(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || 'Login failed';
      if (msg === 'legacy_account') {
        return {
          success: false,
          error: 'This account was created in Vanilla ZenChat. Please register a new ZenChat+ account with the same email.'
        };
      }
      return { success: false, error: msg };
    }
  };

  const register = async (email, password) => {
    try {
      const response = await api.post('/auth/register', { email, password });
      const { token: newToken, user: userData } = response.data;

      await SecureStore.setItemAsync('zenToken', newToken);
      await SecureStore.setItemAsync('zenUser', JSON.stringify(userData));

      setToken(newToken);
      setUserState(userData);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      const msg = error.response?.data?.message || 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('zenToken');
    await SecureStore.deleteItemAsync('zenUser');
    setToken(null);
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
