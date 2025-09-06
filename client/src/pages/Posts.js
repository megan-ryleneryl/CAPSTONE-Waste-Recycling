// Note from Megan: This is copy-pasted code, it's just here as a placeholder. 
// Feel free to delete or change completely.

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './Posts.module.css';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    fetchPosts();
  }, [navigate]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedUser');
    navigate('/login');
  };

  const handleCreatePost = () => {
    navigate('/create-post');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>BinGo</h1>
          </div>
          
          <nav className={styles.nav}>
            <button className={styles.navButton}>Notifications</button>
            <button className={styles.navButton}>Charts and Data</button>
            <button className={styles.navButton}>Inbox</button>
            <button className={styles.navButton}>About</button>
            {/* hi sorry i just need to access the profile page */}
            <Link to="/protected/profile" className={styles.navButton}>
              Profile
            </Link>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content - matching your screenshot design */}
      <main className={styles.main}>
        {/* Left Sidebar */}
        <div className={styles.sidebar}>
          <h2>Filter Posts</h2>
          <div className={styles.filterOptions}>
            <button 
              className={filter === 'all' ? styles.activeFilter : styles.filterButton}
              onClick={() => setFilter('all')}
            >
              🗑️ Recyclables
            </button>
            <button 
              className={filter === 'initiatives' ? styles.activeFilter : styles.filterButton}
              onClick={() => setFilter('initiatives')}
            >
              🌱 Initiatives
            </button>
            <button 
              className={filter === 'forums' ? styles.activeFilter : styles.filterButton}
              onClick={() => setFilter('forums')}
            >
              💬 Forums
            </button>
          </div>
          
          <button onClick={handleCreatePost} className={styles.createPostButton}>
            + Create Post
          </button>
        </div>

        {/* Center Posts Feed */}
        <div className={styles.postsContainer}>
          {/* Posts will be displayed here based on your screenshot */}
          {/* Implementation continues... */}
        </div>

        {/* Right Stats Sidebar - matching your screenshot */}
        <div className={styles.statsSidebar}>
          <div className={styles.chartCard}>
            <h3>Charts</h3>
            <div className={styles.statsContainer}>
              <div className={styles.stat}>
                <h4>15,480 kg</h4>
                <p>of waste recycled</p>
              </div>
              {/* Stats implementation matching your design */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Posts;