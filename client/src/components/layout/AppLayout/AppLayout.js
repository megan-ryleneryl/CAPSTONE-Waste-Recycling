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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatCounts, setChatCounts] = useState({ all: 0, waste: 0, initiative: 0, forum: 0 });
  const [postCounts, setPostCounts] = useState({ all: 0, Waste: 0, Initiatives: 0, Forum: 0, myPosts: 0 });
  const location = useLocation();
  const navigate = useNavigate();

  // Pages that don't need the layout
  const noLayoutPages = ['/login', '/register', '/'];

  // Define which pages should show the right section - memoize this function
  const shouldShowRightSection = useCallback(() => {
    // Show on posts feed
    if (location.pathname === '/posts') return true;

    // Show on single post pages
    if (location.pathname.startsWith('/posts/') && location.pathname !== '/posts/') return true;

    // Show on dashboard
    if (location.pathname === '/dashboard') return true;

    // Show on create post page
    if (location.pathname === '/create-post') return true;

    return false;
  }, [location.pathname]);
  
  const showRightSection = shouldShowRightSection();

  const handleMobileMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  // Reset activeFilter to 'all' when navigating away from pages that use filters
  useEffect(() => {
    // Only reset if we're not on a page that uses filters
    if (location.pathname !== '/posts' && location.pathname !== '/chat') {
      setActiveFilter('all');
    }

    // Close mobile sidebar on navigation
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isMobile]);

  // Memoize the sidebar toggle function
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Memoize the data update handler to prevent infinite re-renders
  const handleDataUpdate = useCallback((data) => {
    setRightSectionData(data);
  }, []);

  // Memoize the chat counts update handler
  const handleChatCountsUpdate = useCallback((counts) => {
    setChatCounts(counts);
  }, []);

  // Memoize the post counts update handler
  const handlePostCountsUpdate = useCallback((counts) => {
    setPostCounts(counts);
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

  // Clone children and pass props including counts update handlers
  const childrenWithProps = React.cloneElement(children, {
    onDataUpdate: handleDataUpdate,
    activeFilter: activeFilter,  // Pass the filter state to child pages
    onChatCountsUpdate: handleChatCountsUpdate,  // Pass chat counts handler
    onPostCountsUpdate: handlePostCountsUpdate  // Pass post counts handler
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
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          chatCounts={chatCounts}
          postCounts={postCounts}
        />

        <main key={location.pathname} className={`${styles.mainContent} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${showRightSection ? styles.withRightSection : ''}`}>
          {childrenWithProps}
        </main>

        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className={styles.mobileOverlay}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Menu Toggle Button */}
        {isMobile && (
          <button
            className={styles.mobileMenuToggle}
            onClick={handleMobileMenuToggle}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        )}
        
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