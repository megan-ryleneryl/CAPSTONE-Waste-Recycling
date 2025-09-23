// Updated PostCard.js with better error handling and correct API endpoint
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PostCard.module.css';

const PostCard = ({ postType = 'all', maxPosts = 20 }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageIndexes, setImageIndexes] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, [postType]);

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Check if token exists
      if (!token) {
        console.error('No token found, redirecting to login');
        navigate('/login');
        return;
      }

      // FIXED: Use the correct protected endpoint
      let url = 'http://localhost:3001/api/protected/posts';
      
      // Add filter for post type if not 'all'
      if (postType !== 'all') {
        url += `?type=${postType}`;
      }
      
      console.log('Fetching posts from:', url);
      
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Posts response:', response.data);
      
      if (response.data.success) {
        // Limit posts based on maxPosts prop
        const limitedPosts = response.data.posts.slice(0, maxPosts);
        
        // For now, use posts without fetching additional user details
        // since the posts should already have user info
        setPosts(limitedPosts);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      
      // Better error messages
      if (err.response) {
        // Server responded with error
        if (err.response.status === 401) {
          console.error('Authentication failed');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        } else if (err.response.status === 403) {
          setError('Your account is not active. Please contact support.');
        } else if (err.response.status === 404) {
          setError('Posts endpoint not found. Please check server configuration.');
        } else {
          setError(err.response.data?.message || 'Failed to load posts');
        }
      } else if (err.request) {
        // Request made but no response
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        // Error in request setup
        setError('An error occurred while loading posts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp to show relative time
  const formatTimestamp = (date) => {
    if (!date) return '';
    
    let postDate;
    
    // Handle Firestore Timestamp objects
    if (date && typeof date === 'object' && date.seconds) {
      // Firestore Timestamp object
      postDate = new Date(date.seconds * 1000);
    } else if (date && typeof date === 'object' && date.toDate) {
      // Firestore Timestamp with toDate method
      postDate = date.toDate();
    } else if (date && typeof date === 'object' && date._seconds) {
      // Firestore Timestamp with _seconds property
      postDate = new Date(date._seconds * 1000);
    } else if (typeof date === 'string') {
      // String date
      postDate = new Date(date);
    } else if (date instanceof Date) {
      // Already a Date object
      postDate = date;
    } else {
      // Try to create date from whatever it is
      try {
        postDate = new Date(date);
      } catch (e) {
        console.error('Invalid date format:', date);
        return '';
      }
    }
    
    // Check if date is valid
    if (!postDate || isNaN(postDate.getTime())) {
      console.error('Invalid date after conversion:', date);
      return '';
    }
    
    const now = new Date();
    const diffTime = Math.abs(now - postDate);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}min ago`;
    if (diffHours < 24) return `${diffHours}hr ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return postDate.toLocaleDateString();
  };

  // Handle image carousel navigation
  const handlePrevImage = (postId, totalImages) => {
    setImageIndexes(prev => ({
      ...prev,
      [postId]: prev[postId] > 0 ? prev[postId] - 1 : totalImages - 1
    }));
  };

  const handleNextImage = (postId, totalImages) => {
    setImageIndexes(prev => ({
      ...prev,
      [postId]: (prev[postId] || 0) < totalImages - 1 ? (prev[postId] || 0) + 1 : 0
    }));
  };

  // Format materials array to string
  const formatMaterials = (materials) => {
    if (!materials) return 'Not specified';
    if (Array.isArray(materials)) {
      return materials.length > 0 ? materials.join(', ') : 'Not specified';
    }
    return materials.toString();
  };

  // Format pickup time preference
  const formatPickupTime = (pickupDate, pickupTime) => {
    if (!pickupDate && !pickupTime) return null;
    
    let result = '';
    if (pickupDate) {
      let date;
      
      // Handle Firestore Timestamp objects
      if (pickupDate && typeof pickupDate === 'object' && pickupDate.seconds) {
        date = new Date(pickupDate.seconds * 1000);
      } else if (pickupDate && typeof pickupDate === 'object' && pickupDate.toDate) {
        date = pickupDate.toDate();
      } else if (pickupDate && typeof pickupDate === 'object' && pickupDate._seconds) {
        date = new Date(pickupDate._seconds * 1000);
      } else {
        date = new Date(pickupDate);
      }
      
      if (!isNaN(date.getTime())) {
        result = date.toLocaleDateString();
      }
    }
    if (pickupTime) {
      result += result ? ' at ' : '';
      result += pickupTime;
    }
    return result;
  };

  // Handle action button clicks
  const handleCollect = async (postId) => {
    try {
      console.log('Collecting post:', postId);
      // For now, just navigate to the post details
      navigate(`/posts/${postId}`);
    } catch (err) {
      console.error('Error collecting post:', err);
    }
  };

  const handleSupport = async (postId) => {
    try {
      console.log('Supporting initiative:', postId);
      navigate(`/posts/${postId}`);
    } catch (err) {
      console.error('Error supporting initiative:', err);
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3001/api/posts/${postId}/like`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      // Refresh posts to update like count
      fetchPosts();
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleComment = (postId) => {
    navigate(`/posts/${postId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading posts...</div>
      </div>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchPosts} style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#3B6535',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!posts || posts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No posts found</p>
          <Link to="/create-post" style={{
            color: '#3B6535',
            textDecoration: 'none',
            fontWeight: 'bold',
            marginTop: '1rem',
            display: 'inline-block'
          }}>
            Be the first to create one!
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {posts.map((post) => {
        const currentImageIndex = imageIndexes[post.postID] || 0;
        const postImages = post.images || [];
        
        // Extract user info - handle both embedded user data and separate user field
        const userName = post.user?.organizationName || 
                        `${post.user?.firstName || ''} ${post.user?.lastName || ''}`.trim() ||
                        post.userName ||
                        'Anonymous';
        
        const userInitial = post.user?.firstName?.[0]?.toUpperCase() || 
                           userName[0]?.toUpperCase() || 
                           'U';
        
        return (
          <div key={post.postID} className={styles.postCard}>

                {/* Post Header with User Info */}
                <div className={styles.header}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      {post.user?.profilePictureUrl || post.profilePictureUrl ? (
                        <img 
                          src={post.user?.profilePictureUrl || post.profilePictureUrl} 
                          alt={userName}
                        />
                      ) : (
                        <span>{userInitial}</span>
                      )}
                    </div>
                    <div className={styles.userDetails}>
                      <h3 className={styles.authorName}>
                        {userName}
                      </h3>
                      {post.user?.organizationName && (
                        <span className={styles.username}>
                          {`${post.user.firstName} ${post.user.lastName}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={styles.timestamp}>
                    {formatTimestamp(post.createdAt)}
                  </span>
                </div>

            {/* Top Section of the post card */}
            <div className={styles.topSection}>

                {/* Post Type Tag */}
                <div className={styles.tagContainer}>
                  <span className={`${styles.tag} ${
                    post.postType === 'Waste' ? styles.wasteTag :
                    post.postType === 'Initiative' ? styles.initiativeTag :
                    styles.forumTag
                  }`}>
                    <span className={styles.tagIcon}>
                      {post.postType === 'Waste' ? '♻️' :
                      post.postType === 'Initiative' ? '🌱' : '💬'}
                    </span>
                    {post.postType} Post
                  </span>
                </div>

                {/* Post Title and Description */}
                <h2 className={styles.title}>{post.title}</h2>
                <p className={styles.description}>
                  {post.description?.length > 100 
                    ? `${post.description.substring(0, 100)}...` 
                    : post.description}
                  {post.description?.length > 100 && (
                    <span className={styles.seeMore} onClick={() => navigate(`/posts/${post.postID}`)}>
                      See more
                    </span>
                  )}
                </p>

            </div>

            {/* Image Carousel or Placeholder */}
            {postImages.length > 0 ? (
              <div className={styles.imageContainer}>
                <img 
                  src={postImages[currentImageIndex]} 
                  alt={`${post.title} - Image ${currentImageIndex + 1}`}
                  className={styles.postImage}
                />
                {postImages.length > 1 && (
                  <>
                    <button 
                      className={`${styles.navButton} ${styles.prevButton}`}
                      onClick={() => handlePrevImage(post.postID, postImages.length)}
                      aria-label="Previous image"
                    >
                      ←
                    </button>
                    <button 
                      className={`${styles.navButton} ${styles.nextButton}`}
                      onClick={() => handleNextImage(post.postID, postImages.length)}
                      aria-label="Next image"
                    >
                      →
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className={styles.imageContainer}>
                {/* Empty placeholder for consistent card height */}
              </div>
            )}

            {/* Post Details Based on Type */}
            <div className={styles.details}>
              {post.postType === 'Waste' && (
                <>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>📦</span>
                    <span className={styles.detailText}>
                      {formatMaterials(post.materials)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>📍</span>
                    <span className={styles.detailText}>{post.location}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>⚖️</span>
                    <span className={styles.detailText}>
                      {post.quantity} {post.unit || 'kg'}
                    </span>
                  </div>
                  {formatPickupTime(post.pickupDate, post.pickupTime) && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailIcon}>🕐</span>
                      <span className={styles.detailText}>
                        {formatPickupTime(post.pickupDate, post.pickupTime)}
                      </span>
                    </div>
                  )}
                  {post.price > 0 && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailIcon}>💰</span>
                      <span className={styles.detailText}>₱{post.price}</span>
                    </div>
                  )}
                  {post.condition && post.condition !== 'Good' && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailIcon}>✨</span>
                      <span className={styles.detailText}>{post.condition}</span>
                    </div>
                  )}
                </>
              )}

              {post.postType === 'Initiative' && (
                <>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>🎯</span>
                    <span className={styles.detailText}>{post.goal || 'Environmental initiative'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>📍</span>
                    <span className={styles.detailText}>{post.location}</span>
                  </div>
                  {post.targetAmount && (
                    <>
                      <div className={styles.detailItem}>
                        <span className={styles.detailIcon}>📊</span>
                        <span className={styles.detailText}>
                          Progress: {post.currentAmount || 0} / {post.targetAmount} kg
                        </span>
                      </div>
                      <div className={styles.progressContainer}>
                        <div 
                          className={styles.progressBar}
                          style={{
                            width: `${Math.min(((post.currentAmount || 0) / post.targetAmount) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <div className={styles.progressText}>
                        {Math.round(((post.currentAmount || 0) / post.targetAmount) * 100)}% Complete
                      </div>
                    </>
                  )}
                  {post.endDate && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailIcon}>📅</span>
                      <span className={styles.detailText}>
                        Ends: {(() => {
                          let endDate;
                          if (post.endDate && typeof post.endDate === 'object' && post.endDate.seconds) {
                            endDate = new Date(post.endDate.seconds * 1000);
                          } else if (post.endDate && typeof post.endDate === 'object' && post.endDate.toDate) {
                            endDate = post.endDate.toDate();
                          } else {
                            endDate = new Date(post.endDate);
                          }
                          return !isNaN(endDate.getTime()) ? endDate.toLocaleDateString() : 'Date not set';
                        })()}
                      </span>
                    </div>
                  )}
                </>
              )}

              {post.postType === 'Forum' && (
                <>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>🏷️</span>
                    <span className={styles.detailText}>{post.category || 'General'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>📍</span>
                    <span className={styles.detailText}>{post.location}</span>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className={styles.tags}>
                      {post.tags.slice(0, 5).map((tag, index) => (
                        <span key={index} className={styles.forumTag}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Forum Interactions */}
            {post.postType === 'Forum' && (
              <div className={styles.interactions}>
                <button 
                  className={styles.interactionButton}
                  onClick={() => handleLike(post.postID)}
                >
                  <span>{post.isLiked ? '❤️' : '🤍'}</span>
                  <span>{post.likeCount || 0} Likes</span>
                </button>
                <button 
                  className={styles.interactionButton}
                  onClick={() => handleComment(post.postID)}
                >
                  <span>💬</span>
                  <span>{post.commentCount || 0} Comments</span>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actionContainer}>
              {post.postType === 'Waste' && post.status === 'Available' && (
                <button 
                  className={`${styles.actionButton} ${styles.collectButton}`}
                  onClick={() => handleCollect(post.postID)}
                >
                  Collect
                </button>
              )}
              {post.postType === 'Waste' && post.status === 'Claimed' && (
                <button 
                  className={`${styles.actionButton} ${styles.claimedButton}`}
                  disabled
                  style={{ background: '#9CA3AF', cursor: 'not-allowed' }}
                >
                  Claimed
                </button>
              )}
              {post.postType === 'Initiative' && (
                <button 
                  className={`${styles.actionButton} ${styles.supportButton}`}
                  onClick={() => handleSupport(post.postID)}
                >
                  Support
                </button>
              )}
              {post.postType === 'Forum' && (
                <button 
                  className={`${styles.actionButton} ${styles.viewButton}`}
                  onClick={() => navigate(`/posts/${post.postID}`)}
                >
                  Join Discussion
                </button>
              )}
              {post.isOwner && (
                <button 
                  className={`${styles.actionButton} ${styles.editButton}`}
                  onClick={() => navigate(`/posts/edit/${post.postID}`)}
                  style={{ marginLeft: 'auto', background: '#F0924C' }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PostCard;