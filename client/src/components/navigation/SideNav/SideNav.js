import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './SideNav.module.css';
import { useAuth } from '../../../context/AuthContext';
import { 
  Recycle, Sprout,
  Plus, 
  Home, 
  LayoutDashboard, 
  Map,
  MessageCircle, 
  Package, 
  User, 
  CheckSquare, 
  Users,
  Layers,
  Trash2,
  Lightbulb,
  MessagesSquare,
  FileText,
  ClipboardPenLine } 
  from 'lucide-react';

const SideNav = ({ activeFilter, onFilterChange, isMobile, isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    filters: true,
    actions: true,
    admin: true
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
    { path: '/posts', label: 'Browse Posts', icon: <Home size={20} /> },
    { path: '/dashboard', label: 'My Stats', icon: <LayoutDashboard size={20} /> },
    { path: '/analytics', label: 'Community Stats', icon: <Map size={20} /> },
    { path: '/chat', label: 'Messages', icon: <MessageCircle size={20} /> },
    { path: '/pickups', label: 'My Pickups', icon: <Package size={20} /> },
    { path: '/profile', label: 'Profile', icon: <User size={20} /> },
  ];

  // Add "My Initiatives" only for Collectors and Admins
  if (user?.isCollector || user?.isAdmin) {
    mainNavItems.splice(5, 0, { path: '/my-initiatives', label: 'My Initiatives', icon: <Lightbulb size={20} /> });
  }

  const adminNavItems = [];

  // Add Approvals menu for Admin users
  if (user?.isAdmin) {
    adminNavItems.push({ 
      path: '/admin/approvals', 
      label: 'Approvals', 
      icon: <CheckSquare size={20} /> 
    });
    adminNavItems.push({ 
      path: '/admin/users', 
      label: 'All Users', 
      icon: <Users size={20} /> 
    });
    adminNavItems.push({
      path: '/admin/edit-materials',
      label: 'Edit Materials',
      icon: <ClipboardPenLine size={20} />
    });
  }

  const filterOptions = [
    { id: 'all', label: 'All Posts', icon: <Layers size={20} /> },
    { id: 'Waste', label: 'Waste', icon: <Recycle size={20} /> },
    { id: 'Initiatives', label: 'Initiatives', icon: <Sprout size={20} /> },
    { id: 'Forum', label: 'Forum', icon: <MessagesSquare size={20} /> },
    { id: 'myPosts', label: 'My Posts', icon: <FileText size={20} /> }
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobile && isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarContent}>

        {/* Create Post Button */}
        <div className={styles.actionsList}>
          <button 
            className={styles.createbtn}
            onClick={() => window.location.href = '/create-post'}
            title={isCollapsed ? 'Create Post' : ''}
          >
            {!isCollapsed && <span className={styles.createButton}><Plus size={30}/>Create Post</span>}
          </button>
        </div>

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

        {/* Admin Actions Section */}
        {user?.isAdmin && (
          <div className={styles.section}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection('admin')}
            >
              {!isCollapsed && (
                <>
                  <span>Admin Actions</span>
                  <span className={`${styles.chevron} ${expandedSections.admin ? styles.expanded : ''}`}>
                    ▼
                  </span>
                </>
              )}
            </button>

            {expandedSections.admin && (
              <div className={styles.adminList}>
                {adminNavItems.map(action => (
                  <Link
                    key={action.path}
                    to={action.path}
                    className={`${styles.navItem} ${location.pathname === action.path ? styles.active : ''}`}
                    title={isCollapsed ? action.label : ''}
                  >
                    <span className={styles.icon}>{action.icon}</span>
                    {!isCollapsed && <span className={styles.label}>{action.label}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

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

        {isMobile && (
          <button className={styles.mobileClose} onClick={onClose}>
            ✕
          </button>
        )}
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