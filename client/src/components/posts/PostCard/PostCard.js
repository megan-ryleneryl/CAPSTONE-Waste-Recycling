// Updated PostCard.js with better error handling and correct API endpoint
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PostCard.module.css';
// Add these imports at the top of PostCard.js
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
// Lucide icon imports
import { Recycle, Sprout, MessageCircle, Package, MapPin, Tag, Calendar, Heart, MessageSquare, Goal, Clock, Weight, BarChart3, Coins } from 'lucide-react';


const PostCard = ({ postType = 'all', userID = null, maxPosts = 20 }) => {

  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageIndexes, setImageIndexes] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
    
    // Cleanup function to ensure posts is reset properly
    return () => {
      setPosts([]);
    };
  }, [postType, userID]); // Add userID as dependency

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
      let url = 'http://localhost:3001/api/posts';

      // Build query parameters
      const params = new URLSearchParams();

      // Add userID filter if provided (for "My Posts" filter)
      if (userID) {
        params.append('userID', userID);
      }

      // Add type filter if not 'all' and no userID filter
      // (userID filter takes precedence - shows all post types by that user)
      if (postType && postType !== 'all' && !userID) {
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
        params.append('type', mappedType);
      }

      // Append params to URL if any exist
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
          
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        // Ensure posts is always an array
        const postsData = response.data.posts;
        if (!Array.isArray(postsData)) {
          console.error('Posts data is not an array:', postsData);
          setPosts([]);
          return;
        }
        
        // Limit posts based on maxPosts prop
        const limitedPosts = postsData.slice(0, maxPosts);
        
        // Log the types of posts received
        const postTypes = limitedPosts.reduce((acc, post) => {
          acc[post.postType] = (acc[post.postType] || 0) + 1;
          return acc;
        }, {});
        
        // Check if posts already have user data
        if (limitedPosts.length > 0 && !limitedPosts[0].user) {          
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
          setPosts(limitedPosts);
        }
      } else {
        console.error('Response not successful:', response.data);
        setPosts([]); // Set empty array on failure
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

  // Handle clicking on the post card
  const handlePostClick = (postId, event) => {
    // Prevent navigation if clicking on buttons or interactive elements
    if (event.target.closest('button') || event.target.closest('a')) {
      return;
    }
    navigate(`/posts/${postId}`);
  };

  // Handle image carousel navigation
  const handlePrevImage = (event, postId, totalImages) => {
    event.stopPropagation(); // Prevent post navigation
    setImageIndexes(prev => ({
      ...prev,
      [postId]: prev[postId] > 0 ? prev[postId] - 1 : totalImages - 1
    }));
  };

  const handleNextImage = (event, postId, totalImages) => {
    event.stopPropagation(); // Prevent post navigation
    setImageIndexes(prev => ({
      ...prev,
      [postId]: (prev[postId] || 0) < totalImages - 1 ? (prev[postId] || 0) + 1 : 0
    }));
  };

  // Format materials array to string
  const formatMaterials = (materials) => {
    if (!materials) return 'Not specified';
    if (Array.isArray(materials)) {
      if (materials.length === 0) return 'Not specified';

      // Check if materials are objects with materialName
      if (typeof materials[0] === 'object' && materials[0].materialName) {
        return materials.map(m => m.materialName).join(', ');
      }

      // Fallback for old string format
      return materials.join(', ');
    }
    return materials.toString();
  };

  // Format location object to string
  const formatLocation = (location) => {
    if (!location) return 'Location not specified';
    if (typeof location === 'string') return location;

    const parts = [];
    if (location.barangay?.name) parts.push(location.barangay.name);
    if (location.city?.name) parts.push(location.city.name);
    if (location.province?.name && location.province.name !== 'NCR') parts.push(location.province.name);
    if (location.region?.name) parts.push(location.region.name);

    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
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
  const handleCollect = async (event, postId) => {
    event.stopPropagation(); // Prevent post navigation
    try {
      navigate(`/posts/${postId}`);
    } catch (err) {
      console.error('Error collecting post:', err);
    }
  };

  const handleSupport = async (event, postId) => {
    event.stopPropagation(); // Prevent post navigation
    try {
      navigate(`/posts/${postId}`);
    } catch (err) {
      console.error('Error supporting initiative:', err);
    }
  };

  const handleLike = async (event, postId) => {
  event.stopPropagation();
  
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `http://localhost:3001/api/posts/${postId}/like`,
      {},
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (response.data.success) {
      // Update the specific post in state with the count from backend
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.postID === postId
            ? {
                ...post,
                isLiked: response.data.liked,
                likeCount: response.data.likeCount // Use count from backend
              }
            : post
        )
      );
    }
  } catch (err) {
    console.error('Error liking post:', err);
    alert(err.response?.data?.message || 'Failed to like post');
  }
};

  const handleComment = (event, postId) => {
    event.stopPropagation(); // Prevent post navigation
    navigate(`/posts/${postId}#comments`);
  };

const handleMessageOwner = async (post, event) => {
  // Stop event propagation
  if (event) {
    event.stopPropagation();
  }

  // Check if user is logged in
  if (!currentUser || !currentUser.userID) {
    alert("Please log in to message the post owner");
    navigate('/login');
    return;
  }

  // Check if trying to message yourself
  if (currentUser.userID === post.userID) {
    alert("You can't message yourself!");
    return;
  }

  try {
    // Navigate to chat
    navigate('/chat', {
      state: {
        postID: post.postID || post.id,
        otherUser: {
          userID: post.userID,
          name: post.user?.firstName ? `${post.user.firstName} ${post.user.lastName}` : 'User',
          firstName: post.user?.firstName || 'Unknown',
          lastName: post.user?.lastName || 'User'
        },
        postData: post
      }
    });
  } catch (error) {
    console.error('Error creating message:', error);
    alert('Failed to start conversation. Please try again.');
  }
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
  if (!posts || !Array.isArray(posts) || posts.length === 0) {
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
      {Array.isArray(posts) && posts.map((post) => {
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
          <div 
            key={post.postID} 
            className={styles.postCard}
            onClick={(e) => handlePostClick(post.postID, e)}
            style={{ cursor: 'pointer' }}
          >
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
                  {user.organizationName && user.firstName && (
                    <span className={styles.username}>
                      {`${user.firstName} ${user.lastName}`}
                    </span>
                  )}
                </div>
                {currentUser && currentUser.userID !== post.userID && (
                  <button
                    className={styles.messageButton}
                    onClick={(e) => handleMessageOwner(post, e)}
                    title="Message Owner"
                  >
                    <MessageCircle size={18} />
                  </button>
                )}
              </div>
              <span className={styles.timestamp}>
                {formatTimestamp(post.createdAt)}
              </span>
            </div>

            {/* Top Section */}
              <div className={styles.topSection}>
              
              {/* Post Type Tag */}
              <div className={styles.tagContainer}>
                <span className={`${styles.tag} ${
                  post.postType === 'Waste' ? styles.wasteTag :
                  post.postType === 'Initiative' ? styles.initiativeTag :
                  styles.forumTag
                }`}>
                  <span className={styles.tagIcon}>
                    {post.postType === 'Waste' ? <Recycle size={16} /> :
                    post.postType === 'Initiative' ? <Sprout size={16} /> :
                    <MessageSquare size={16} />}
                  </span>
                  <span className={styles.tagText}>
                  </span>
                  {post.postType} Post
                </span>
              </div>

              {/* Post Title and Description */}
              <h2 className={styles.title}>{post.title}</h2>
              <p className={styles.description}>
                {post.description?.length > 200 
                  ? `${post.description.substring(0, 200)}...` 
                  : post.description}
                {post.description?.length > 200 && (
                  <Link 
                    to={`/posts/${post.postID}`} 
                    className={styles.seeMore}
                    onClick={(e) => e.stopPropagation()}
                  >
                    See more
                  </Link>
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
                  onError={(e) => {
                    console.error('Failed to load image:', postImages[currentImageIndex]);
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
                {postImages.length > 1 && (
                  <>
                    <button 
                      className={`${styles.navButton} ${styles.prevButton}`}
                      onClick={(e) => handlePrevImage(e, post.postID, postImages.length)}
                      aria-label="Previous image"
                    >
                      ←
                    </button>
                    <button 
                      className={`${styles.navButton} ${styles.nextButton}`}
                      onClick={(e) => handleNextImage(e, post.postID, postImages.length)}
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
                    <span className={styles.detailIcon}><Package size={18} /></span>
                    <span className={styles.detailText}>
                      {formatMaterials(post.materials)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}><MapPin size={18} /></span>
                    <span className={styles.detailText}>{formatLocation(post.location)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}><Weight size={18} /></span>
                    <span className={styles.detailText}>
                      {post.quantity} {post.unit || 'kg'}
                    </span>
                  </div>
                  {formatPickupTime(post.pickupDate, post.pickupTime) && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailIcon}><Clock size={18} /></span>
                      <span className={styles.detailText}>
                        {formatPickupTime(post.pickupDate, post.pickupTime)}
                      </span>
                    </div>
                  )}
                  {post.price > 0 && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailIcon}><Coins size={18} /></span>
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
                    <span className={styles.detailIcon}><Goal size={18} /></span>
                    <span className={styles.detailText}>{post.goal || 'Environmental initiative'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}><MapPin size={18} /></span>
                    <span className={styles.detailText}>{formatLocation(post.location)}</span>
                  </div>
                  {post.targetAmount && (
                    <>
                      <div className={styles.detailItem}>
                        <span className={styles.detailIcon}><BarChart3 size={18} /></span>
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
                      <span className={styles.detailIcon}><Calendar size={18} /></span>
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
                    <span className={styles.detailIcon}><Tag size={18} /></span>
                    <span className={styles.detailText}>{post.category || 'General'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}><MapPin size={18} /></span>
                    <span className={styles.detailText}>{formatLocation(post.location)}</span>
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
                  className={`${styles.interactionButton} ${post.isLiked ? styles.liked : ''}`}
                  onClick={(e) => handleLike(e, post.postID)}
                  title={post.isLiked ? 'Unlike' : 'Like'}
                >
                  <span className={styles.interactionIcon}>
                    <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
                  </span>
                  <span>{post.likeCount || 0} {post.likeCount === 1 ? 'Like' : 'Likes'}</span>
                </button>
                <button 
                  className={styles.interactionButton}
                  onClick={(e) => handleComment(e, post.postID)}
                  title="View comments"
                >
                  <span className={styles.interactionIcon}><MessageCircle size={18} /></span>
                  <span>{post.commentCount || 0} {post.commentCount === 1 ? 'Comment' : 'Comments'}</span>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actionContainer}>
              {post.postType === 'Waste' && post.status === 'Active' && (
                <button 
                  className={`${styles.actionButton} ${styles.collectButton}`}
                  onClick={(e) => handleCollect(e, post.postID)}
                >
                  Collect
                </button>
              )}
              {post.postType === 'Waste' && post.status === 'Claimed' && (
                <button 
                  className={`${styles.actionButton} ${styles.claimedButton}`}
                  disabled
                  style={{ background: '#9CA3AF', cursor: 'not-allowed' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Claimed
                </button>
              )}
              {post.postType === 'Initiative' && (
                <button 
                  className={`${styles.actionButton} ${styles.supportButton}`}
                  onClick={(e) => handleSupport(e, post.postID)}
                >
                  Support
                </button>
              )}
              {post.postType === 'Forum' && (
                <button 
                  className={`${styles.actionButton} ${styles.viewButton}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/posts/${post.postID}`);
                  }}
                >
                  Join Discussion
                </button>
              )}
              {post.isOwner && (
                <button
                  className={`${styles.actionButton} ${styles.editButton}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/posts/edit/${post.postID}`);
                  }}
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