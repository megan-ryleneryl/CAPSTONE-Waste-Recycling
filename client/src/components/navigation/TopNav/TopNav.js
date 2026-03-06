import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, Check, Truck, MapPin, PartyPopper, X as XIcon, Trophy, MessageCircle, ClipboardList, MessageSquare, Bell, CheckCircle, XCircle, HandHelping, ThumbsUp, HelpCircle } from 'lucide-react';
import EcoTayoLogo from './EcoTayoLogo.svg';
import QuickGuide from '../../guide/QuickGuide';
import NotificationsModal from '../../notifications/NotificationsModal/NotificationsModal';
import styles from './TopNav.module.css';

const TopNav = ({ user: propUser }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(propUser);
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const [isPolling, setIsPolling] = useState(true);
  const pollingIntervalRef = useRef(null);

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
    // OPTIMIZED: Reduced polling frequency to reduce server load
    if (user && isPolling) {
      // Initial fetch
      fetchNotifications();

      // Set up polling interval (every 2 minutes instead of 30 seconds)
      // This reduces API calls from 120/hour to 30/hour per user
      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications();
      }, 120000); // 2 minutes (was 30 seconds)

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [user, isPolling]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Stop polling when tab is hidden
        setIsPolling(false);
      } else {
        // Resume polling when tab is visible
        setIsPolling(true);
        // Fetch immediately when returning to tab
        if (user) {
          fetchNotifications();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Helper function to format Firestore dates
  const formatDate = (date) => {
    if (!date) return 'Not available';
    
    let dateObj;
    
    // Handle different date formats from Firestore
    if (date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date?._seconds) {
      dateObj = new Date(date._seconds * 1000);
    } else if (typeof date === 'string') {
      // Handle string format: "Sep 11, 2025, 8:04:41.697 PM"
      dateObj = new Date(date.replace(/,/g, ''));
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/protected/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const newNotifications = response.data.notifications || [];
        
        // Check if there are new unread notifications
        const currentUnreadCount = notifications.filter(n => !n.isRead).length;
        const newUnreadCount = newNotifications.filter(n => !n.isRead).length;
        
        // Play sound or show browser notification for new notifications
        if (newUnreadCount > currentUnreadCount && currentUnreadCount > 0) {
          // Optional: Play notification sound
          playNotificationSound();
          // Optional: Show browser notification
          showBrowserNotification(newNotifications[0]);
        }
        
        setNotifications(newNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Stop polling on auth error
      if (error.response?.status === 401) {
        setIsPolling(false);
      }
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:3001/api/protected/notifications/${notificationId}/read`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state optimistically
      setNotifications(prev => 
        prev.map(n => 
          n.notificationID === notificationId 
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        'http://localhost:3001/api/protected/notifications/read-all',
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state optimistically
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const playNotificationSound = () => {
    // Create and play a simple notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Could not play sound:', e));
  };

  const showBrowserNotification = (notification) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification('EcoConnect', {
        body: notification.message,
        icon: '/favicon.ico',
        tag: 'ecoconnect-notification'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showBrowserNotification(notification);
        }
      });
    }
  };

  useEffect(() => {
    // Request notification permission on component mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleLogout = () => {
    // Clear all local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedUser');

    // Clear axios default headers
    delete axios.defaults.headers.common['Authorization'];

    // Clear state
    setUser(null);
    setNotifications([]);
    setIsPolling(false);

    // Stop polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Force full page reload to ensure all state is cleared
    window.location.href = '/login';
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
    
    // Mark visible notifications as read after a delay
    if (!showNotifications) {
      setTimeout(() => {
        const unreadVisible = notifications
          .slice(0, 5)
          .filter(n => !n.isRead);
        
        unreadVisible.forEach(n => {
          markNotificationAsRead(n.notificationID);
        });
      }, 2000); // 2 second delay
    }
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
    if (pictureField.startsWith('http://') || pictureField.startsWith('https://')) {
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

  // Get icon and color for notification based on type and title
  const getNotificationIcon = (notification) => {
    const title = (notification.title || '').toLowerCase();
    const type = (notification.type || '').toLowerCase();
    const iconSize = 18;

    // Pickup-related notifications
    if (type === 'pickup' || title.includes('pickup')) {
      if (title.includes('request') || title.includes('proposed') || title.includes('interested')) {
        return { icon: <Package size={iconSize} />, color: '#f59e0b' };
      }
      if (title.includes('confirmed')) {
        return { icon: <Check size={iconSize} />, color: '#10b981' };
      }
      if (title.includes('on the way') || title.includes('transit')) {
        return { icon: <Truck size={iconSize} />, color: '#3b82f6' };
      }
      if (title.includes('arrived')) {
        return { icon: <MapPin size={iconSize} />, color: '#8b5cf6' };
      }
      if (title.includes('complete')) {
        return { icon: <PartyPopper size={iconSize} />, color: '#059669' };
      }
      if (title.includes('cancel') || title.includes('available again')) {
        return { icon: <XIcon size={iconSize} />, color: '#ef4444' };
      }
      return { icon: <Package size={iconSize} />, color: '#3B6535' };
    }

    // Support-related notifications
    if (type === 'support_accepted' || title.includes('support accepted') || title.includes('material accepted')) {
      return { icon: <CheckCircle size={iconSize} />, color: '#10b981' };
    }
    if (type === 'support_declined' || title.includes('support declined') || title.includes('material declined')) {
      return { icon: <XCircle size={iconSize} />, color: '#ef4444' };
    }
    if (type === 'support_completed') {
      return { icon: <HandHelping size={iconSize} />, color: '#059669' };
    }
    if (type === 'support_cancelled') {
      return { icon: <XIcon size={iconSize} />, color: '#ef4444' };
    }

    // Post-related notifications
    if (type === 'post_completed' || title.includes('post completed') || title.includes('initiative completed')) {
      return { icon: <PartyPopper size={iconSize} />, color: '#059669' };
    }
    if (type === 'post_like' || title.includes('liked')) {
      return { icon: <ThumbsUp size={iconSize} />, color: '#ec4899' };
    }

    // Badge notifications
    if (type === 'badge' || title.includes('badge')) {
      return { icon: <Trophy size={iconSize} />, color: '#f59e0b' };
    }

    // Message notifications
    if (type === 'message' || title.includes('message')) {
      return { icon: <MessageCircle size={iconSize} />, color: '#3b82f6' };
    }

    // Application notifications
    if (type === 'application' || title.includes('verification') || title.includes('approved')) {
      return { icon: <ClipboardList size={iconSize} />, color: '#10b981' };
    }

    // Comment notifications
    if (type === 'comment' || type === 'post_comment' || title.includes('comment')) {
      return { icon: <MessageSquare size={iconSize} />, color: '#6b7280' };
    }

    // Default
    return { icon: <Bell size={iconSize} />, color: '#3B6535' };
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link to="/posts" style={{ textDecoration: 'none' }}>
            <img src={EcoTayoLogo} alt="EcoTayo Logo" className={styles.logo} />
          </Link>
        <div className={styles.navRight}>
          {/* Notifications */}
          <div className={styles.notificationWrapper} ref={dropdownRef}>
            <button
              className={`${styles.navIcon} ${unreadCount > 0 ? styles.hasNotifications : ''}`}
              onClick={toggleNotifications}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className={`${styles.badge} ${styles.animatePulse}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      className={styles.markAllRead}
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllAsRead();
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className={styles.notificationsList}>
                  {notifications.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>No items to display</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => {
                      const { icon, color } = getNotificationIcon(notification);
                      return (
                        <div
                          key={notification.notificationID}
                          className={`${styles.notificationItem} ${
                            !notification.isRead ? styles.unread : ''
                          }`}
                          onClick={() => {
                            // Mark as read when clicked
                            if (!notification.isRead) {
                              markNotificationAsRead(notification.notificationID);
                            }

                            // Navigate based on notification type
                            if (notification.actionURL) {
                              // If the actionURL targets /chat, open the conversation directly via state
                              if (notification.actionURL.startsWith('/chat')) {
                                const url = new URL(notification.actionURL, window.location.origin);
                                const postID = url.searchParams.get('postId');
                                const otherUserID = url.searchParams.get('userId');

                                if (postID && otherUserID) {
                                  const nameParts = (notification.metadata?.collectorName || '').split(' ');
                                  navigate('/chat', {
                                    state: {
                                      postID,
                                      otherUser: {
                                        userID: otherUserID,
                                        firstName: nameParts[0] || 'Unknown',
                                        lastName: nameParts.slice(1).join(' ') || 'User',
                                      },
                                    }
                                  });
                                  setShowNotifications(false);
                                  return;
                                }
                              }
                              navigate(notification.actionURL);
                              setShowNotifications(false);
                            } else if (notification.referenceID && notification.referenceType) {
                              // Check if this is a pickup request notification with collector info
                              const hasCollectorInfo = notification.metadata?.collectorID &&
                                                      notification.metadata?.postID;

                              // Navigate based on reference type
                              if (notification.referenceType === 'post') {
                                // If it's a pickup-related notification with collector info, open chat
                                if (hasCollectorInfo && notification.type?.toLowerCase().includes('pickup')) {
                                  const collectorName = notification.metadata.collectorName || 'Collector';
                                  const nameParts = collectorName.split(' ');
                                  navigate('/chat', {
                                    state: {
                                      postID: notification.metadata.postID,
                                      otherUser: {
                                        userID: notification.metadata.collectorID,
                                        firstName: nameParts[0] || 'Unknown',
                                        lastName: nameParts.slice(1).join(' ') || 'User'
                                      }
                                    }
                                  });
                                } else {
                                  // Otherwise navigate to the post
                                  navigate(`/posts/${notification.referenceID}`);
                                }
                              } else if (notification.referenceType === 'pickup') {
                                navigate(`/tracking/${notification.referenceID}`);
                              } else if (notification.referenceType === 'message') {
                                navigate('/chat');
                              }
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div className={styles.notificationIcon} style={{ backgroundColor: `${color}20`, color: color }}>
                            {icon}
                          </div>
                          <div className={styles.notificationContent}>
                            {notification.title && (
                              <span className={styles.notificationTitle}>{notification.title}</span>
                            )}
                            <p className={styles.notificationMessage}>{notification.message}</p>
                            <span className={styles.time}>
                              {notification.createdAt
                                ? formatDate(notification.createdAt)
                                : 'Just now'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {notifications.length > 5 && (
                  <button
                    className={styles.viewAll}
                    onClick={() => {
                      setShowNotifications(false);
                      setShowNotificationsModal(true);
                    }}
                  >
                    View all {notifications.length} notifications
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Help Guide */}
          <button
            className={styles.navIcon}
            onClick={() => setShowGuide(true)}
            aria-label="Help Guide"
          >
            <HelpCircle size={20} />
          </button>

          {/* Messages */}
          <button
            className={styles.navIcon}
            onClick={() => navigate('/chat')}
            aria-label="Messages"
          >
            <MessageSquare size={20} />
          </button>

          {/* User Menu */}
          <div className={styles.userMenuWrapper} ref={userMenuRef}>
            <button
              className={styles.userButton}
              onClick={toggleUserMenu}
              aria-label="User menu"
            >
              <div className={styles.userAvatar}>
                {profilePictureUrl ? (
                  <img 
                    key={profilePictureUrl}
                    src={profilePictureUrl}
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
                    <div className={styles.userBadges}>
                      {/* Giver Badge - All users have this */}
                      <span className={`${styles.roleBadge} ${styles.roleGiver}`}>
                        Giver
                      </span>
                      
                      {/* Collector Badge */}
                      {user?.isCollector && (
                        <span className={`${styles.roleBadge} ${styles.roleCollector}`}>
                          Collector
                        </span>
                      )}
                      
                      {/* Admin Badge */}
                      {user?.isAdmin && (
                        <span className={`${styles.roleBadge} ${styles.roleAdmin}`}>
                          Admin
                        </span>
                      )}
                      
                      {/* Organization Badge */}
                      {user?.organizationID !== null && (
                        <span className={`${styles.roleBadge} ${styles.roleOrganization}`}>
                          Organization
                        </span>
                      )}
                    </div>
                    <span><strong>{user?.points || 0}</strong> points</span>
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

      {/* Quick Guide Modal */}
      <QuickGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setShowNotificationsModal(false)}
          onMarkAsRead={markNotificationAsRead}
          onMarkAllAsRead={markAllAsRead}
          formatDate={formatDate}
          getNotificationIcon={getNotificationIcon}
        />
      )}
    </nav>
  );
};

export default TopNav;