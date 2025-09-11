import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Posts from './pages/Posts';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Approvals from './pages/Admin/Approvals';
import CreatePost from './pages/CreatePost';
import AppLayout from './components/layout/AppLayout/AppLayout';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return <Navigate to="/login" />;
  }
  
  // Wrap authenticated pages with AppLayout
  return <AppLayout>{children}</AppLayout>;
};

// Auto-login Route Component
const AutoLoginRoute = ({ children }) => {
  const rememberedUser = localStorage.getItem('rememberedUser');
  const token = localStorage.getItem('token');
  
  if (rememberedUser && token) {
    return <Navigate to="/posts" />;
  }
  
  return children;
};

function App() {
  // Add Remember Me check on app load
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    const token = localStorage.getItem('token');
    
    if (rememberedUser && token) {
      // Validate token is still valid (optional)
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes - No AppLayout */}
          <Route path="/" element={<Landing />} />
          
          <Route 
            path="/login" 
            element={
              <AutoLoginRoute>
                <Login />
              </AutoLoginRoute>
            } 
          />
          
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes - With AppLayout */}
          <Route 
            path="/posts" 
            element={
              <ProtectedRoute>
                <Posts />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/create-post" 
            element={
              <ProtectedRoute>
                <CreatePost />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin/approvals" 
            element={
              <ProtectedRoute>
                <Approvals />
              </ProtectedRoute>
            } 
          />          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;