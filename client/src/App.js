import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Posts from './pages/Posts';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import AppLayout from './components/layout/AppLayout/AppLayout';
import './App.css';

// Simple Register component for completeness
const RegisterComponent = () => {
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'Giver'
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // For testing, simulate successful registration
      console.log('Registration attempt:', formData);
      
      // Simulate API response
      const newUser = {
        userID: '123',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        userType: formData.userType,
        points: 0
      };
      
      localStorage.setItem('user', JSON.stringify(newUser));
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#333', fontSize: '2rem', marginBottom: '0.5rem' }}>
            Join EcoConnect
          </h1>
          <p style={{ color: '#666' }}>Create your account and start recycling</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              color: '#333', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              color: '#333', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Account Type
            </label>
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="Giver">Waste Giver</option>
              <option value="Collector">Waste Collector</option>
            </select>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          color: '#666'
        }}>
          Already have an account?{' '}
          <a 
            href="/login" 
            style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}
          >
            Sign in here
          </a>
        </div>
      </div>
    </div>
  );
};

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
          
          {/* Add more protected routes as needed */}
          {/* <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/inbox" 
            element={
              <ProtectedRoute>
                <Inbox />
              </ProtectedRoute>
            } 
          /> */}
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;