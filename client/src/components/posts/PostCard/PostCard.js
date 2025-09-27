// Updated PostCard.js with better error handling and correct API endpoint
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PostCard.module.css';

const PostCard = ({ postType = 'all', maxPosts = 20, post, onActionComplete }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageIndexes, setImageIndexes] = useState({});
  const [actionStatus, setActionStatus] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const navigate = useNavigate();
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

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
      // Only add type filter if a specific type is requested
      if (postType && postType !== 'all') {
        // Map component prop values to database values
        const typeMap = {
          'Waste Post': 'Waste',
          'Initiative Post': 'Initiative',
          'Forum Post': 'Forum',
          'Waste': 'Waste',
          'Initiative': 'Initiative',
          'Forum': 'Forum'
        };
        
        const mappedType = typeMap[postType] || postType;
        url += `?type=${mappedType}`;
        console.log('Filtering by type:', mappedType);
      } else {
        console.log('Fetching all post types');
      }
      
      console.log('Fetching posts from:', url);
      
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Posts response:', response.data);
      console.log('Number of posts:', response.data.posts?.length);
      console.log('Post types:', response.data.posts?.map(p => p.postType));
      
      if (response.data.success) {
        // Limit posts based on maxPosts prop
        const limitedPosts = response.data.posts.slice(0, maxPosts);
        
        // Log the types of posts received
        const postTypes = limitedPosts.reduce((acc, post) => {
          acc[post.postType] = (acc[post.postType] || 0) + 1;
          return acc;
        }, {});
        console.log('Post type distribution:', postTypes);
        console.log('Sample post with user:', limitedPosts[0]);
        
        // Check if posts already have user data
        if (limitedPosts.length > 0 && !limitedPosts[0].user) {
          console.log('Posts do not have user data, fetching separately...');
          
          // Fetch user details for each post if not included
          const postsWithUsers = await Promise.all(
            limitedPosts.map(async (post) => {
              try {
                const userResponse = await axios.get(
                  `http://localhost:3001/api/protected/users/${post.userID}`,
                  {
                    headers: { 'Authorization': `Bearer ${token}` }
                  }
                );
                
                return {
                  ...post,
                  user: userResponse.data.user
                };
              } catch (err) {
                console.error(`Failed to fetch user for post ${post.postID}:`, err.message);
                return {
                  ...post,
                  user: {
                    firstName: 'Unknown',
                    lastName: 'User',
                    profilePictureUrl: null,
                    organizationName: null
                  }
                };
              }
            })
          );
          
          setPosts(postsWithUsers);
        } else {
          // Posts already have user data
          console.log('Posts already include user data');
          setPosts(limitedPosts);
        }
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
  const checkActionStatus = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/posts/${post.postID}/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActionStatus(response.data.data);
    } catch (error) {
      console.error('Error checking action status:', error);
    }
  };

  const handleCollect = async () => {
    if (!currentUser.userID) {
      navigate('/login');
      return;
    }

    if (!currentUser.isCollector) {
      alert('Only Collectors can claim Waste posts. Please apply to become a Collector.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:3001/api/posts/${post.postID}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Post claimed successfully! Redirecting to chat...');
        navigate(response.data.data.chatURL);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to claim post');
    } finally {
      setLoading(false);
    }
  };

  const handleSupportInitiative = async () => {
    if (!currentUser.userID) {
      navigate('/login');
      return;
    }

    setShowPickupModal(true);
  };

  const submitSupport = async (supportData) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:3001/api/posts/${post.postID}/support`,
        supportData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setShowPickupModal(false);
        alert('Support request sent! The initiative owner will contact you.');
        onActionComplete && onActionComplete();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send support request');
    } finally {
      setLoading(false);
    }
  };

  const getActionButton = () => {
    if (!actionStatus) return null;

    if (actionStatus.isOwner) {
      if (post.status === 'Claimed') {
        return (
          <button
            className="btn btn-info"
            onClick={() => navigate(`/pickups/${post.postID}`)}
          >
            View Pickup Schedule
          </button>
        );
      }
      return (
        <button className="btn btn-secondary" disabled>
          Your Post
        </button>
      );
    }

    if (post.postType === 'Waste') {
      if (post.status === 'Claimed') {
        return (
          <button className="btn btn-secondary" disabled>
            Already Claimed {actionStatus.claimedBy === currentUser.userID && '(by you)'}
          </button>
        );
      }
      if (actionStatus.userHasClaimed) {
        return (
          <button 
            className="btn btn-info"
            onClick={() => navigate(`/chat/${post.postID}/${post.userID}`)}
          >
            View Chat
          </button>
        );
      }
      return (
        <button
          className="btn btn-success"
          onClick={handleCollect}
          disabled={loading || !currentUser.isCollector}
        >
          {loading ? 'Processing...' : 'Claim Post'}
        </button>
      );
    }

    if (post.postType === 'Initiative') {
      if (actionStatus.userHasSupported) {
        return (
          <button 
            className="btn btn-info"
            onClick={() => navigate(`/chat/${post.postID}/${post.userID}`)}
          >
            View Support Chat
          </button>
        );
      }
      return (
        <button
          className="btn btn-primary"
          onClick={handleSupportInitiative}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Support Initiative'}
        </button>
      );
    }

    return null;
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
        const user = post.user || {};
        
        // Determine display name
        const displayName = user.organizationName || 
                           (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
                           'Anonymous User';
        
        // Get user initial for avatar
        const userInitial = user.firstName?.[0]?.toUpperCase() || 
                           user.organizationName?.[0]?.toUpperCase() || 
                           displayName[0]?.toUpperCase() || 
                           'U';
        
        // Get profile picture
        const profilePicture = user.profilePictureUrl || post.profilePictureUrl || null;
        return (
          <div key={post.postID} className={styles.postCard}>

                {/* Post Header with User Info */}
                <div className={styles.header}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      {profilePicture ? (
                        <img 
                          src={profilePicture} 
                          alt={displayName}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        ) : null}
                        <span style={profilePicture ? {display: 'none'} : {}}>
                          {userInitial}
                        </span>
                    </div>
                    <div className={styles.userDetails}>
                      <h3 className={styles.authorName}>
                        {displayName}
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
              {post.postType === 'Waste' && post.status === 'Active' && (
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
                  onClick={() => handleSupportInitiative(post.postID)}
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