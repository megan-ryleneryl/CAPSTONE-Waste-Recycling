import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import TopNav from '../../navigation/TopNav/TopNav';
import SideNav from '../../navigation/SideNav/SideNav';
import RightSection from '../RightSection/RightSection';
import styles from './AppLayout.module.css';

const AppLayout = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [rightSectionData, setRightSectionData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Pages that don't need the layout
  const noLayoutPages = ['/login', '/register', '/'];

  // Define which pages should show the right section - memoize this function
  const shouldShowRightSection = useCallback(() => {
    if (isMobile) return false;
    
    // Show on posts feed
    if (location.pathname === '/posts') return true;    
    
    // Show on single post pages
    if (location.pathname.startsWith('/posts/') && location.pathname !== '/posts/') return true;
    
    // Show on dashboard
    if (location.pathname === '/dashboard') return true;
    
    return false;
  }, [isMobile, location.pathname]);
  
  const showRightSection = shouldShowRightSection();

  // Memoize the admin route check to prevent unnecessary re-renders
  useEffect(() => {
    // Check admin routes only when currentUser or path changes
    const path = location.pathname;
    if (path.startsWith('/admin')) {
      if (currentUser && !currentUser.isAdmin) {
        console.error('Non-admin user attempting to access admin route');
        navigate('/posts');
      }
    }
  }, [currentUser?.isAdmin, location.pathname, navigate]);

  useEffect(() => {
    // Handle responsive behavior
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoize the sidebar toggle function
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Memoize the data update handler to prevent infinite re-renders
  const handleDataUpdate = useCallback((data) => {
    setRightSectionData(data);
  }, []);

  // Don't show layout on certain pages
  if (noLayoutPages.includes(location.pathname)) {
    return children;
  }

  // Show loading state while user is loading
  if (loading) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Clone children and pass handleDataUpdate if needed
  const childrenWithProps = React.cloneElement(children, {
    onDataUpdate: handleDataUpdate
  });

  return (
    <div className={styles.appContainer}>
      <TopNav user={currentUser} />
      
      <div className={styles.mainLayout}>
        <SideNav 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          user={currentUser}
        />
        
        <main className={`${styles.mainContent} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${showRightSection ? styles.withRightSection : ''}`}>
          {childrenWithProps}
        </main>
        
        {showRightSection && (
          <RightSection 
            user={currentUser} 
            data={rightSectionData}
          />
        )}
      </div>
    </div>
  );
};

export default AppLayout;