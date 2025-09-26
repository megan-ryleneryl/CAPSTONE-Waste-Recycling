import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import Logo from '../../common/Logo/logo';
import styles from './TopNav.module.css';

const TopNav = ({ user: propUser }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(propUser);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  // Update user state when prop changes or on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          // First set user from localStorage for immediate display
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Then fetch fresh data from backend
          const response = await axios.get('http://localhost:3001/api/protected/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data.success) {
            const userData = {
              ...response.data.user,
              // Ensure profilePicture field exists for backward compatibility
              profilePicture: response.data.user.profilePictureUrl || response.data.user.profilePicture
            };
            setUser(userData);
            // Update localStorage with both fields
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } else if (propUser) {
          setUser(propUser);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // If token is invalid, use propUser or clear user
        if (error.response?.status === 401) {
          handleLogout();
        } else if (propUser) {
          setUser(propUser);
        }
      }
    };
    
    fetchUserData();
  }, [propUser]);

  // Listen for storage changes (when user updates profile)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    // Listen for custom event when profile is updated
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userProfileUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userProfileUpdated', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/protected/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedUser');
    setUser(null);
    navigate('/login');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  // Helper function to construct full image URL
  const getProfilePictureUrl = () => {
    // First check profilePictureUrl (standard field), then profilePicture (legacy)
    const pictureField = user?.profilePictureUrl || user?.profilePicture;
    if (!pictureField) return null;
    
    // If it's already a full URL (http/https), return as is
    if (pictureField.startsWith('http')) {
      return pictureField;
    }
    
    // If it's a relative path, prepend the server URL
    const baseUrl = 'http://localhost:3001';
    const pictureUrl = pictureField.startsWith('/') 
      ? pictureField 
      : '/' + pictureField;
    
    return baseUrl + pictureUrl;
  };

  if (!user) {
    return null;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const profilePictureUrl = getProfilePictureUrl();

  // Notification Bell Icon Component
  const BellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  // Chat/Message Icon Component
  const ChatIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link to="/posts" style={{ textDecoration: 'none' }}>
            <Logo size="medium" />
          </Link>
        <div className={styles.navRight}>
          {/* Notifications */}
          <div className={styles.notificationWrapper} ref={dropdownRef}>
            <button
              className={styles.navIcon}
              onClick={toggleNotifications}
              aria-label="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button className={styles.markAllRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className={styles.notificationsList}>
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.notificationID}
                        className={`${styles.notificationItem} ${
                          !notification.isRead ? styles.unread : ''
                        }`}
                      >
                        <p>{notification.message}</p>
                        <span className={styles.time}>
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.notificationItem}>
                      <p>No notifications</p>
                    </div>
                  )}
                </div>
                <Link to="/notifications" className={styles.viewAll}>
                  View all notifications
                </Link>
              </div>
            )}
          </div>

          {/* Messages */}
          <button className={styles.navIcon}>
            <ChatIcon />
          </button>

          {/* User Menu */}
          <div className={styles.userMenuWrapper} ref={userMenuRef}>
            <button
              className={styles.userButton}
              onClick={toggleUserMenu}
              aria-label="User menu"
            >
              <div className={styles.userAvatar}>
                {user?.profilePicture || user?.profilePictureUrl ? (
                  <img 
                    src={`http://localhost:3001${user.profilePicture || user.profilePictureUrl}`}
                    alt={`${user?.firstName} ${user?.lastName}`}
                    className={styles.userAvatarImage}
                    onError={(e) => {
                      // If image fails to load, hide it and show initials
                      e.target.style.display = 'none';
                      const initialsDiv = e.target.nextSibling;
                      if (initialsDiv) {
                        initialsDiv.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className={styles.userAvatarInitials}
                  style={profilePictureUrl ? { display: 'none' } : { display: 'flex' }}
                >
                  {getInitials()}
                </div>
              </div>
              <span className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </span>
              <span className={styles.chevron}>▼</span>
            </button>

            {showUserMenu && (
              <div className={styles.dropdown}>
                <div className={styles.userInfo}>
                  <p className={styles.userFullName}>
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className={styles.userEmail}>{user?.email}</p>
                  <div className={styles.userStats}>
                    <span><strong>{user?.points || 0}</strong> points</span>
                    <span className={styles.userType}>
                      {user?.isAdmin ? 'Admin' : user?.isCollector ? 'Collector' : 'Giver'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.dropdownDivider}></div>
                
                <Link to="/profile" className={styles.dropdownItem}>
                  <span>My Profile</span>
                </Link>
                
                <div className={styles.dropdownDivider}></div>
                
                <button onClick={handleLogout} className={styles.logoutButton}>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;