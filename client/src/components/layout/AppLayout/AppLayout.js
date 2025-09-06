import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopNav from '../../navigation/TopNav/TopNav';
import SideNav from '../../navigation/SideNav/SideNav';
import styles from './AppLayout.module.css';

const AppLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
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
        />
        
        <main className={styles.mainContent}>
          {React.cloneElement(children, { user, activeFilter })}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;