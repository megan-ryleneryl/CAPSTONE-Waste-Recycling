import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Posts from './pages/Posts';
import SinglePost from './pages/SinglePost';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Approvals from './pages/Approvals';
import AllUsers from './pages/AllUsers';
import CreatePost from './pages/CreatePost';
import AppLayout from './components/layout/AppLayout/AppLayout';
import PickupManagement from './pages/PickupManagement';
import PickupTracking from './pages/PickupTracking';
import EditMaterials from './pages/EditMaterials';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Use userID as key to force complete remount when user changes
  return <AppLayout key={currentUser.userID}>{children}</AppLayout>;
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
    <AuthProvider>
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
              path="/posts/:postId" 
              element={
                <ProtectedRoute>
                  <SinglePost />
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
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Analytics />
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

            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/pickups" 
              element={
                <ProtectedRoute>
                  <PickupManagement />
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

            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute>
                  <AllUsers />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin/edit-materials" 
              element={
                <ProtectedRoute>
                  <EditMaterials />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/tracking/:pickupId" 
              element={
                <ProtectedRoute>
                  <PickupTracking />
                </ProtectedRoute>
              } 
            />


            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;