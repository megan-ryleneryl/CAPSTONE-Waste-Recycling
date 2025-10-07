import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalPosts: 5,
    activePickups: 2,
    completedPickups: 8,
    totalPoints: 150,
  });
  const [recentActivity] = useState([
    { id: 1, type: 'post', message: 'Created new waste post: Cardboard boxes', time: '2 hours ago' },
    { id: 2, type: 'pickup', message: 'Pickup completed by John Collector', time: '1 day ago' },
    { id: 3, type: 'points', message: 'Earned 25 points for successful pickup', time: '1 day ago' },
    { id: 4, type: 'badge', message: 'Unlocked "Green Starter" badge', time: '3 days ago' },
  ]);

  const navigate = useNavigate();

  useEffect(() => {
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

  return (
    <div className={styles.dashboardContainer}>
      {/* Welcome Section */}
      <div className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>Welcome back, {user.firstName}!</h2>
        <p className={styles.welcomeSubtitle}>
          Here's what's happening with your recycling activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.totalPosts}</div>
          <div className={styles.statLabel}>Total Posts</div>
        </div>

        <div
          className={`${styles.statCard} ${styles.clickable}`}
          onClick={() => navigate('/pickups')}
        >
          <div className={styles.statNumber}>{stats.activePickups}</div>
          <div className={styles.statLabel}>Active Pickups</div>
        </div>

        <div
          className={`${styles.statCard} ${styles.clickable}`}
          onClick={() => navigate('/pickups')}
        >
          <div className={styles.statNumber}>{stats.completedPickups}</div>
          <div className={styles.statLabel}>Completed</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.totalPoints}</div>
          <div className={styles.statLabel}>Points Earned</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
        <button className={styles.actionButton} onClick={() => navigate('/create-post')}>Create New Waste Post</button>
        <button className={styles.actionButtonSecondary} onClick={() => navigate('/posts')}>Browse Available Waste</button>
        <button className={styles.actionButtonSecondary} onClick={() => navigate('/pickups')}>View My Pickups</button>
        <button className={styles.actionButton} onClick={handleLogout}>Logout</button>
      </div>

      {/* Recent Activity */}
      <div className={styles.quickActions}>
        <h3 className={styles.quickActionsTitle}>Recent Activity</h3>
        <div>
          {recentActivity.map(activity => (
            <div key={activity.id} className={styles.statCard}>
              <div>{activity.message}</div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;