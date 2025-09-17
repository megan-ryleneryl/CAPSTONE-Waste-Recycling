import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './SideNav.module.css';

const SideNav = ({ activeFilter, onFilterChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    filters: true,
    actions: true
  });
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const mainNavItems = [
    { path: '/posts', label: 'Posts' },
    { path: '/dashboard', label: 'Dashboard' },
    // { path: '/notifications', label: 'Notifications' },
    // { path: '/inbox', label: 'Inbox' },
    { path: '/profile', label: 'Profile' },
  ];

  // Add Approvals menu for Admin users
  if (user?.userType === 'Admin') {
    mainNavItems.push({ path: '/admin/approvals', label: 'Approvals' });
  }

  const filterOptions = [
    { id: 'all', label: 'All Posts' },
    { id: 'recyclables', label: 'Recyclables' },
    { id: 'initiatives', label: 'Initiatives' },
    { id: 'forum', label: 'Forum' },
    { id: 'nearby', label: 'Nearby' },
    { id: 'myPosts', label: 'My Posts' }
  ];

  const quickActions = [
    { id: 'pickups', label: 'My Pickups' },
    { id: 'badges', label: 'My Badges' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarContent}>
        {/* Main Navigation */}
        <div className={styles.section}>
          <button 
            className={styles.sectionHeader}
            onClick={() => toggleSection('main')}
          >
            {!isCollapsed && (
              <>
                <span>Navigation</span>
                <span className={`${styles.chevron} ${expandedSections.main ? styles.expanded : ''}`}>
                  ▼
                </span>
              </>
            )}
          </button>

          {expandedSections.main && (
            <nav className={styles.navList}>
              {mainNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  {!isCollapsed && <span className={styles.label}>{item.label}</span>}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Filters Section - Only show on Posts page */}
        {location.pathname === '/posts' && (
          <div className={styles.section}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection('filters')}
            >
              {!isCollapsed && (
                <>
                  <span>Filter Posts</span>
                  <span className={`${styles.chevron} ${expandedSections.filters ? styles.expanded : ''}`}>
                    ▼
                  </span>
                </>
              )}
            </button>

            {expandedSections.filters && (
              <div className={styles.filterList}>
                {filterOptions.map(filter => (
                  <button
                    key={filter.id}
                    className={`${styles.filterItem} ${activeFilter === filter.id ? styles.activeFilter : ''}`}
                    onClick={() => onFilterChange(filter.id)}
                    title={isCollapsed ? filter.label : ''}
                  >
                    <span className={styles.icon}>{filter.icon}</span>
                    {!isCollapsed && <span className={styles.label}>{filter.label}</span>}
                    {!isCollapsed && activeFilter === filter.id && (
                      <span className={styles.indicator}></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className={styles.section}>
          <button 
            className={styles.sectionHeader}
            onClick={() => toggleSection('actions')}
          >
            {!isCollapsed && (
              <>
                <span>Quick Actions</span>
                <span className={`${styles.chevron} ${expandedSections.actions ? styles.expanded : ''}`}>
                  ▼
                </span>
              </>
            )}
          </button>

          {expandedSections.actions && (
            <div className={styles.actionsList}>
              <Link 
                to="/create-post" 
                className={styles.createButton}
                title={isCollapsed ? 'Create Post' : ''}
              >
                {!isCollapsed && <span>Create Post</span>}
              </Link>
              
              {quickActions.map(action => (
                <button 
                  key={action.id}
                  className={styles.actionButton}
                  title={isCollapsed ? action.label : ''}
                >
                  <span className={styles.icon}>{action.icon}</span>
                  {!isCollapsed && <span className={styles.label}>{action.label}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Stats (Bottom) - Fixed position */}
      {!isCollapsed && (
        <div className={styles.userStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Points</span>
            <span className={styles.statValue}>1,250</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Rank</span>
            <span className={styles.statValue}>Gold</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default SideNav;