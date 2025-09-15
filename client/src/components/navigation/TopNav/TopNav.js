import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Logo from '../../common/Logo/logo';
import styles from './TopNav.module.css';

const TopNav = () => {
  const { currentUser: user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  // Refs for detecting clicks outside dropdowns
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();  // Use context logout
    navigate('/login');
  };

  const notifications = [
    { id: 1, text: 'New pickup request', time: '5 min ago', unread: true },
    { id: 2, text: 'Points earned: +50', time: '1 hour ago', unread: true },
    { id: 3, text: 'Waste collected successfully', time: '2 hours ago', unread: false },
  ];

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
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''} ${isHidden ? styles.hidden : ''}`}>
      <div className={styles.navContent}>
        <Link to="/posts" style={{ textDecoration: 'none' }}>
            <Logo size="medium" />
          </Link>
        <div className={styles.navRight}>
          {/* Notifications */}
          <div className={styles.notificationWrapper}>
            <button 
              className={styles.navIcon}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <BellIcon />
              {notifications.some(n => n.unread) && <span className={styles.badge}></span>}
            </button>
            
            {showNotifications && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <h3>Notifications</h3>
                  <button className={styles.markAllRead}>Mark all read</button>
                </div>
                <div className={styles.notificationsList}>
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`${styles.notificationItem} ${notif.unread ? styles.unread : ''}`}
                    >
                      <p>{notif.text}</p>
                      <span className={styles.time}>{notif.time}</span>
                    </div>
                  ))}
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
            <button className={styles.userButton} onClick={() => setShowUserMenu(!showUserMenu)}>
              {user?.profilePictureUrl ? (
                <img 
                  src={user.profilePictureUrl} // Using profilePictureUrl
                  alt={`${user?.firstName} ${user?.lastName}`}
                  className={styles.userAvatar}
                  style={{ objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div className={styles.userAvatar}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
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
                    <span className={styles.userType}>{user?.userType}</span>
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