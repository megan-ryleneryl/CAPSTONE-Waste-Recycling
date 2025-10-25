import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  MessagesSquare,
  FileText,
  ClipboardPenLine }
  from 'lucide-react';

const SideNav = ({ activeFilter, onFilterChange, isMobile, isOpen, chatCounts = { all: 0, waste: 0, initiative: 0, forum: 0 }, postCounts = { all: 0, Waste: 0, Initiatives: 0, Forum: 0, myPosts: 0 } }) => {
  const [isCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    filters: true,
    actions: true,
    admin: true
  });
  const { currentUser: user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const chatFilterOptions = [
    { id: 'all', label: 'All Chats', icon: <Layers size={20} /> },
    { id: 'waste', label: 'Waste', icon: <Recycle size={20} /> },
    { id: 'initiative', label: 'Initiative', icon: <Sprout size={20} /> },
    { id: 'forum', label: 'Forum', icon: <MessagesSquare size={20} /> }
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobile && isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarContent}>

        {/* Create Post Button */}
        <div className={styles.actionsList}>
          <button
            className={styles.createbtn}
            onClick={() => navigate('/create-post')}
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
                {filterOptions.map(filter => {
                  const count = postCounts[filter.id] || 0;
                  return (
                    <button
                      key={filter.id}
                      className={`${styles.filterItem} ${activeFilter === filter.id ? styles.activeFilter : ''}`}
                      onClick={() => onFilterChange(filter.id)}
                      title={isCollapsed ? filter.label : ''}
                    >
                      <span className={styles.icon}>{filter.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className={styles.label}>{filter.label}</span>
                          {count > 0 && <span className={styles.badge}>{count}</span>}
                        </>
                      )}
                      {/* {!isCollapsed && activeFilter === filter.id && (
                        <span className={styles.indicator}></span>
                      )} */}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat Filters Section - Only show on Chat page */}
        {location.pathname === '/chat' && (
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('filters')}
            >
              {!isCollapsed && (
                <>
                  <span>Filter Chats</span>
                  <span className={`${styles.chevron} ${expandedSections.filters ? styles.expanded : ''}`}>
                    ▼
                  </span>
                </>
              )}
            </button>

            {expandedSections.filters && (
              <div className={styles.filterList}>
                {chatFilterOptions.map(filter => {
                  const count = chatCounts[filter.id] || 0;
                  return (
                    <button
                      key={filter.id}
                      className={`${styles.filterItem} ${activeFilter === filter.id ? styles.activeFilter : ''}`}
                      onClick={() => onFilterChange(filter.id)}
                      title={isCollapsed ? filter.label : ''}
                    >
                      <span className={styles.icon}>{filter.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className={styles.label}>{filter.label}</span>
                          {count > 0 && <span className={styles.badge}>{count}</span>}
                        </>
                      )}
                      {/* {!isCollapsed && activeFilter === filter.id && (
                        <span className={styles.indicator}></span>
                      )} */}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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