import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set axios default header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch current user profile
      fetchCurrentUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
    }
    setLoading(false);
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/protected/profile');
      if (response.data.success) {
        setCurrentUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Token might be invalid
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedUser');
    setToken(null);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    refreshUser: fetchCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};