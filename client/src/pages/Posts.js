// Note from Megan: This is copy-pasted code, it's just here as a placeholder. 
// Feel free to delete or change completely.

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './Posts.module.css';

const Posts = () => {
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  
  // Get user from localStorage
  const userData = localStorage.getItem('user');
  const currentUser = userData ? JSON.parse(userData) : null;

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    
    if (!token || !currentUser) {
      navigate('/login');
      return;
    }
    
    fetchPosts();
  }, [navigate]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/protected/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setAllPosts(response.data.posts || []);
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

  const handleProfileClick = () => {
    navigate('/profile');
  };

  // Filter posts based on selected filter
  const filteredPosts = allPosts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'available') return post.status === 'Available';
    if (filter === 'completed') return post.status === 'Completed';
    if (filter === 'myPosts') return post.userID === currentUser?.userID;
    return true;
  });

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
      {/* Header - matching CreatePost style */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>BinGo</h1>
          </div>
          
          <nav className={styles.nav}>
            <Link to="/dashboard" className={styles.navButton}>
              Dashboard
            </Link>
            <button className={styles.navButton}>Notifications</button>
            <button className={styles.navButton}>Charts</button>
            <button className={styles.navButton}>Inbox</button>
            <button className={styles.navButton}>About</button>
            <button 
              onClick={handleProfileClick} 
              className={styles.navButton}
            >
              Profile
            </button>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Posts Header */}
        <div className={styles.postsHeader}>
          <h2 className={styles.pageTitle}>Available Posts</h2>
          <button onClick={handleCreatePost} className={styles.createButton}>
            + Create New Post
          </button>
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Sidebar Filters */}
          <aside className={styles.sidebar}>
            <div className={styles.filterSection}>
              <h3>Filter Posts</h3>
              <div className={styles.filterOptions}>
                <button 
                  className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All Posts ({allPosts.length})
                </button>
                <button 
                  className={`${styles.filterButton} ${filter === 'available' ? styles.active : ''}`}
                  onClick={() => setFilter('available')}
                >
                  Available ({allPosts.filter(p => p.status === 'Available').length})
                </button>
                <button 
                  className={`${styles.filterButton} ${filter === 'completed' ? styles.active : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  Completed ({allPosts.filter(p => p.status === 'Completed').length})
                </button>
                <button 
                  className={`${styles.filterButton} ${filter === 'myPosts' ? styles.active : ''}`}
                  onClick={() => setFilter('myPosts')}
                >
                  My Posts ({allPosts.filter(p => p.userID === currentUser?.userID).length})
                </button>
              </div>
            </div>

            {/* User Info Card */}
            <div className={styles.userCard}>
              <h4>Welcome, {currentUser?.firstName}!</h4>
              <p className={styles.userType}>
                {currentUser?.userType === 'Giver' ? '🎁 Waste Giver' : '♻️ Collector'}
              </p>
              <p className={styles.points}>
                Points: <strong>{currentUser?.points || 0}</strong>
              </p>
            </div>
          </aside>

          {/* Posts Grid */}
          <div className={styles.postsGrid}>
            {filteredPosts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No posts found</p>
                <button onClick={handleCreatePost} className={styles.createButtonSmall}>
                  Create your first post
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.postID} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <h3>{post.title}</h3>
                    <span className={`${styles.status} ${styles[post.status?.toLowerCase()]}`}>
                      {post.status}
                    </span>
                  </div>
                  <p className={styles.postDescription}>{post.description}</p>
                  <div className={styles.postMeta}>
                    <span>📍 {post.location}</span>
                    <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.postActions}>
                    <button className={styles.viewButton}>View Details</button>
                    {post.userID === currentUser?.userID && (
                      <button className={styles.editButton}>Edit</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Posts;