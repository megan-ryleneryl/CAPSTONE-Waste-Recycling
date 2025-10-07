import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './SideNav.module.css';
import { useAuth } from '../../../context/AuthContext';
import { Plus } from 'lucide-react';

const SideNav = ({ activeFilter, onFilterChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    filters: true,
    actions: true
  });
  const { currentUser: user } = useAuth();
  const location = useLocation();

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const mainNavItems = [
    { path: '/posts', label: 'Browse Posts' },
    { path: '/dashboard', label: 'Dashboard'},
    { path: '/chat', label: 'Messages' },
    { path: '/pickups', label: 'My Pickups' },
    { path: '/profile', label: 'Profile' },
  ];

  // Add Approvals menu for Admin users
  if (user?.isAdmin) {
    mainNavItems.push({ path: '/admin/approvals', label: 'Approvals' });
    mainNavItems.push({ path: '/admin/users', label: 'All Users' });
  }

  const filterOptions = [
    { id: 'all', label: 'All Posts' },
    { id: 'Waste', label: 'Waste' },
    { id: 'Initiatives', label: 'Initiatives' },
    { id: 'Forum', label: 'Forum' },
    { id: 'myPosts', label: 'My Posts' }
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
        {/* <div className={styles.section}>
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
        </div> */}
      </div>


      <div className={styles.actionsList}>
        <button 
          className={styles.createbtn}
          onClick={() => window.location.href = '/create-post'}
          title={isCollapsed ? 'Create Post' : ''}
        >
          {!isCollapsed && <span className={styles.createButton}><Plus />Create Post</span>}
        </button>
      </div>

      {/* User Stats (Bottom) - Fixed position */}
      {!isCollapsed && (
        <div className={styles.userStats}>
            <span className={styles.statLabel}>Points</span>
            <span className={styles.statValue}>{user?.points || 0}</span>
        </div>
      )}
    </aside>
  );
};

export default SideNav;