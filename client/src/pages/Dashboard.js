// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalPosts: 5,
    activePickups: 2,
    completedPickups: 8,
    totalPoints: 150
  });
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: 'post', message: 'Created new waste post: Cardboard boxes', time: '2 hours ago' },
    { id: 2, type: 'pickup', message: 'Pickup completed by John Collector', time: '1 day ago' },
    { id: 3, type: 'points', message: 'Earned 25 points for successful pickup', time: '1 day ago' },
    { id: 4, type: 'badge', message: 'Unlocked "Green Starter" badge', time: '3 days ago' }
  ]);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from localStorage (in real app, verify token)
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'post': return '📝';
      case 'pickup': return '🚚';
      case 'points': return '⭐';
      case 'badge': return '🏆';
      default: return '📋';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ color: '#667eea', margin: 0, fontSize: '1.5rem' }}>
            🌱♻️ EcoConnect
          </h1>
        </div>
        
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}>
            Dashboard
          </Link>
          <Link to="/profile" style={{ color: '#666', textDecoration: 'none' }}>
            Profile
          </Link>
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <div style={{ padding: '2rem' }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', fontSize: '2rem', marginBottom: '0.5rem' }}>
            Welcome back, {user.firstName}! 👋
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Here's what's happening with your recycling activities
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {stats.totalPosts}
            </div>
            <div style={{ color: '#666' }}>Total Posts</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚚</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {stats.activePickups}
            </div>
            <div style={{ color: '#666' }}>Active Pickups</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>
              {stats.completedPickups}
            </div>
            <div style={{ color: '#666' }}>Completed</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
              {stats.totalPoints}
            </div>
            <div style={{ color: '#666' }}>Points Earned</div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '2rem'
        }}>
          {/* Quick Actions */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#333', marginBottom: '1rem' }}>Quick Actions</h3>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <button style={{
                backgroundColor: '#667eea',
                color: 'white',
                padding: '1rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>📝</span> Create New Waste Post
              </button>
              
              <button style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '1rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>🔍</span> Browse Available Waste
              </button>
              
              <button style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                padding: '1rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>💬</span> Visit Community Forum
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#333', marginBottom: '1rem' }}>Recent Activity</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentActivity.map(activity => (
                <div key={activity.id} style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '1.2rem' }}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#333',
                      marginBottom: '0.25rem'
                    }}>
                      {activity.message}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;