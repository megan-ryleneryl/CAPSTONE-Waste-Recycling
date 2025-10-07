import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PostDetails from '../components/posts/PostDetails/PostDetails';
import CommentsSection from '../components/posts/CommentsSection/CommentsSection';
// import PickupRequests from '../components/posts/PickupRequests/PickupRequests';
import styles from './SinglePost.module.css';

const SinglePost = ({ onDataUpdate }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likingPost, setLikingPost] = useState(false);

  useEffect(() => {
    fetchPost();
    fetchCurrentUser();
  }, [postId]);

  useEffect(() => {
    if (post) {
      setLikeCount(post.likeCount || 0);
      setIsLiked(post.isLiked || false);
      
      if (onDataUpdate) {
        onDataUpdate({ post });
      }
    }
  }, [post, onDataUpdate]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/protected/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchPost = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(
        `http://localhost:3001/api/protected/posts/${postId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setPost(response.data.post);
      } else {
        setError('Post not found');
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      if (err.response?.status === 404) {
        setError('Post not found');
      } else {
        setError('Failed to load post');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (likingPost) return;
    
    setLikingPost(true);
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
        // Use the count from backend response
        setIsLiked(response.data.liked);
        setLikeCount(response.data.likeCount);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      alert(err.response?.data?.message || 'Failed to like post');
    } finally {
      setLikingPost(false);
    }
  };

  const handlePrevImage = () => {
    if (post?.images?.length > 1) {
      setImageIndex(prev => prev > 0 ? prev - 1 : post.images.length - 1);
    }
  };

  const handleNextImage = () => {
    if (post?.images?.length > 1) {
      setImageIndex(prev => prev < post.images.length - 1 ? prev + 1 : 0);
    }
  };

  const handleCollect = () => {
    if (user?.userType === 'Collector' || user?.userType === 'Admin') {
      setShowPickupModal(true);
    } else {
      alert('Only Collectors can claim waste posts');
    }
  };

  const formatTimestamp = (date) => {
    if (!date) return '';
    
    let postDate;
    if (date && typeof date === 'object' && date.seconds) {
      postDate = new Date(date.seconds * 1000);
    } else if (date && typeof date === 'object' && date.toDate) {
      postDate = date.toDate();
    } else {
      postDate = new Date(date);
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[postDate.getMonth()];
    const day = postDate.getDate();
    const year = postDate.getFullYear();
    const hours = postDate.getHours();
    const minutes = postDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes} ${ampm} • ${month} ${day} ${year}`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={() => navigate('/posts')} className={styles.backButton}>
          Back to Posts
        </button>
      </div>
    );
  }

  if (!post) return null;

  // Determine if current user is the post owner
  const isOwner = user?.userID === post.userID;
  const isCollector = user?.userType === 'Collector' || user?.userType === 'Admin';
  const isGiver = user?.userType === 'Giver';

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        {/* Back Navigation */}
        <div className={styles.navigation}>
          <button onClick={() => navigate('/posts')} className={styles.navButton}>
            ← Back to Feed
          </button>
        </div>

        {/* Post Card */}
        <div className={styles.postCard}>
          {/* User Header */}
          <div className={styles.header}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {post.user?.profilePictureUrl ? (
                  <img 
                    src={post.user.profilePictureUrl} 
                    alt={`${post.user.firstName} ${post.user.lastName}`}
                  />
                ) : (
                  <span>
                    {post.user?.firstName?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className={styles.userDetails}>
                <h3 className={styles.userName}>
                  {post.user?.organizationName || 
                   `${post.user?.firstName || ''} ${post.user?.lastName || ''}`.trim() ||
                   'Anonymous User'}
                </h3>
                <p className={styles.userType}>
                  {post.user?.userType || post.userType}
                </p>
              </div>
            </div>
            <div className={styles.postMeta}>
              <span className={`${styles.badge} ${
                post.status === 'Active' ? styles.availableBadge :
                post.status === 'Claimed' ? styles.claimedBadge :
                styles.completedBadge
              }`}>
                {post.status === 'Active' ? 'Active' : post.status}
              </span>
              {isOwner && (
                <button className={styles.moreButton}>•••</button>
              )}
            </div>
          </div>

            {/* Top Section */}
            <div className={styles.topSection}>

                {/* Post Type Badge */}
                <div className={styles.postTypeBadge}>
                    <span className={`${styles.typeBadge} ${
                    post.postType === 'Waste' ? styles.wasteBadge :
                    post.postType === 'Initiative' ? styles.initiativeBadge :
                    styles.forumBadge
                    }`}>
                    {post.postType === 'Waste' && '♻️ Waste Post'}
                    {post.postType === 'Initiative' && '🌱 Initiative Post'}
                    {post.postType === 'Forum' && '💬 Forum Post'}
                    </span>
                </div>

                {/* Post Title & Description */}
                <div className={styles.content}>
                    <h1 className={styles.title}>{post.title}</h1>
                    <p className={styles.description}>{post.description}</p>
                </div>

            </div>


          {/* Image Carousel */}
          {post.images && post.images.length > 0 ? (
            <div className={styles.imageContainer}>
              <img 
                src={post.images[imageIndex]} 
                alt={`${post.title} - Image ${imageIndex + 1}`}
                className={styles.postImage}
              />
              {post.images.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevImage}
                    className={`${styles.imageNav} ${styles.prevImage}`}
                  >
                    ←
                  </button>
                  <button 
                    onClick={handleNextImage}
                    className={`${styles.imageNav} ${styles.nextImage}`}
                  >
                    →
                  </button>
                  <div className={styles.imageIndicators}>
                    {post.images.map((_, idx) => (
                      <span 
                        key={idx}
                        className={`${styles.indicator} ${idx === imageIndex ? styles.active : ''}`}
                        onClick={() => setImageIndex(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className={styles.imagePlaceholder}>
              {/* Empty image placeholder */}
            </div>
          )}

          {/* Timestamp */}
          <div className={styles.timestamp}>
            {formatTimestamp(post.createdAt)}
          </div>

          {/* Action Buttons - Different for Givers and Collectors */}
          {post.postType === 'Waste' && (
            <div className={styles.actions}>
              {isCollector && !isOwner && post.status === 'Active' && (
                <button 
                  className={styles.collectButton}
                  onClick={handleCollect}
                >
                  Collect This Waste
                </button>
              )}
              {isGiver && isOwner && (
                <>
                  <button className={styles.editButton}>
                    Edit Post
                  </button>
                  <button className={styles.deleteButton}>
                    Delete Post
                  </button>
                </>
              )}
              {post.status === 'Claimed' && !isOwner && (
                <button className={styles.claimedButton} disabled>
                  Already Claimed
                </button>
              )}
            </div>
          )}
        </div>

        {/* Like and Comment Section for Forum Posts */}
      {post.postType === 'Forum' && (
        <div className={styles.interactionsSection}>
          <div className={styles.likeSection}>
            <button
              className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
              onClick={handleLikeToggle}
              disabled={likingPost}
            >
              <span className={styles.likeIcon}>{isLiked ? '❤️' : '🤍'}</span>
              <span className={styles.likeText}>
                {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Comments Section for Forum Posts */}
      {post.postType === 'Forum' && (
        <CommentsSection post={post} currentUser={user} />
      )}

        {/* Pickup Requests Section (for Collectors view on Initiative posts)
        {post.postType === 'Initiative' && isCollector && isOwner && (
          <PickupRequests 
            postId={post.postID}
            requests={post.pickupRequests || []}
          />
        )} */}
      </div>

      {/* Pickup Modal */}
      {showPickupModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPickupModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Schedule Pickup</h2>
            <form className={styles.pickupForm}>
              <div className={styles.formGroup}>
                <label>Proposed Date</label>
                <input type="date" required />
              </div>
              <div className={styles.formGroup}>
                <label>Proposed Time</label>
                <input type="time" required />
              </div>
              <div className={styles.formGroup}>
                <label>Pickup Location</label>
                <input 
                  type="text" 
                  defaultValue={post.location}
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Additional Notes</label>
                <textarea 
                  placeholder="Any special instructions or requirements"
                  rows="3"
                />
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowPickupModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={styles.confirmButton}
                >
                  Send Pickup Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SinglePost;