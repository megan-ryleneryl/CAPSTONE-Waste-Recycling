import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  
  if (!token || !user || user.userType !== 'Admin') {
    console.error('Admin access denied for user:', user.email);
    return <Navigate to="/posts" />;
  }
  
  return children;
};

export default AdminRoute;