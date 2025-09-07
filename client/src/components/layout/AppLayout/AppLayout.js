import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopNav from '../../navigation/TopNav/TopNav';
import SideNav from '../../navigation/SideNav/SideNav';
import styles from './AppLayout.module.css';

const AppLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();

  // Pages that don't need the layout
  const noLayoutPages = ['/login', '/register', '/'];

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    // Handle responsive behavior
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Don't show layout on certain pages
  if (noLayoutPages.includes(location.pathname)) {
    return children;
  }

  return (
    <div className={styles.appContainer}>
      <TopNav user={user} />
      
      <div className={styles.mainLayout}>
        <SideNav 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        
        <main className={`${styles.mainContent} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
          {React.cloneElement(children, { user, activeFilter })}
        </main>

        {/* Mobile Menu Toggle Button */}
        {isMobile && (
          <button 
            className={styles.mobileMenuToggle}
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLayout;