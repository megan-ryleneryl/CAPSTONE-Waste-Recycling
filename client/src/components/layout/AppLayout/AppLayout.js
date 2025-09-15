import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNav from '../../navigation/TopNav/TopNav';
import SideNav from '../../navigation/SideNav/SideNav';
import RightSection from '../RightSection/RightSection';
import styles from './AppLayout.module.css';

const AppLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [rightSectionData, setRightSectionData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Pages that don't need the layout
  const noLayoutPages = ['/login', '/register', '/'];

  // Define which pages should show the right section
  const pagesWithRightSection = ['/posts', '/dashboard'];
  const showRightSection = pagesWithRightSection.includes(location.pathname) && !isMobile;
 

  useEffect(() => {
    // Load user data from localStorage
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.userType !== 'Admin') {
        console.error('Non-admin user attempting to access admin route');
        navigate('/posts');
      }
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
          user={user}
        />
        
        <main className={`${styles.mainContent} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${showRightSection ? styles.hasRightSection : ''}`}>
          {React.cloneElement(children, { 
            user, 
            activeFilter,
            onDataUpdate: setRightSectionData // Pass data update function to pages
          })}
        </main>

        {/* Right Section with Components */}
        {showRightSection && (
          <RightSection 
            user={user} 
            data={rightSectionData}
          />
        )}

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