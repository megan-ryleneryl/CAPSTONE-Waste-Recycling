import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedUser');
    setToken(null);
    setCurrentUser(null);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://localhost:3001/api/protected/profile');
      if (response.data.success) {
        const userData = response.data.user;
        // Ensure profile picture URL is consistent
        if (userData.profilePictureUrl && !userData.profilePicture) {
          userData.profilePicture = userData.profilePictureUrl;
        }
        // Ensure isAdmin is properly set
        if (!userData.hasOwnProperty('isAdmin')) {
          userData.isAdmin = false;
        }
        setCurrentUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Token might be invalid
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout]); // Only depend on token and logout

  // Set axios default header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch current user profile
      fetchCurrentUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = useCallback((token, user) => {
    // Ensure isAdmin field exists
    if (!user.hasOwnProperty('isAdmin')) {
      user.isAdmin = false;
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setCurrentUser(user);
  }, []);

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