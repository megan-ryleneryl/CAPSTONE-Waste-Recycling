import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CommentsSection from '../components/posts/CommentsSection/CommentsSection';
// import PickupRequests from '../components/posts/PickupRequests/PickupRequests';
import InitiativeSupportsModal from '../components/posts/InitiativeSupportsModal/InitiativeSupportsModal';
import styles from './SinglePost.module.css';
// Lucide icon imports
import { Heart, MessageCircle, Trash2 } from 'lucide-react';

const SinglePost = ({ onDataUpdate }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likingPost, setLikingPost] = useState(false);
  const [showSupportsModal, setShowSupportsModal] = useState(false);

  useEffect(() => {
    fetchPost();
    fetchCurrentUser();
  }, [postId]);

  useEffect(() => {
    if (post) {
      setLikeCount(post.likeCount || 0);
      setIsLiked(post.isLiked || false);

      if (onDataUpdate) {
        onDataUpdate({
          post,
          onViewSupports: () => setShowSupportsModal(true)
        });
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
        const fetchedPost = response.data.post;

        // Check if post is inactive (from deleted user)
        if (fetchedPost.status === 'Inactive') {
          setError('Post not found');
          return;
        }

        setPost(fetchedPost);
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

  const handleMessageOwner = async () => {
    // Check if user is logged in
    if (!user || !user.userID) {
      alert("Please log in to message the post owner");
      navigate('/login');
      return;
    }

    // Check if trying to message yourself
    if (user.userID === post.userID) {
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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:3001/api/posts/${postId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Post deleted successfully');
        navigate('/posts');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err.response?.data?.message || 'Failed to delete post');
    }
  };

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
                  {
                   `${post.user?.firstName || ''} ${post.user?.lastName || ''}`.trim() ||
                   'Anonymous User'}
                </h3>
                <p className={styles.orgName}>
                  {post.user?.organizationName}
                </p>
              </div>
              {!isOwner && user && (
                <button
                  className={styles.messageButton}
                  onClick={handleMessageOwner}
                  title="Message Owner"
                >
                  <MessageCircle size={20} />
                </button>
              )}
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
                <button
                  className={styles.deleteButton}
                  onClick={handleDelete}
                  aria-label="Delete post"
                  title="Delete post"
                >
                  <Trash2 size={20} />
                </button>
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
                    {post.postType === 'Waste' && 'Waste Post'}
                    {post.postType === 'Initiative' && 'Initiative Post'}
                    {post.postType === 'Forum' && 'Forum Post'}
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
                onError={(e) => {
                  console.error('Failed to load image:', post.images[imageIndex]);
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
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
              <span className={styles.likeIcon}><Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} /></span>
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

      {/* Initiative Supports Modal */}
      {post.postType === 'Initiative' && isOwner && (
        <InitiativeSupportsModal
          isOpen={showSupportsModal}
          onClose={() => setShowSupportsModal(false)}
          initiativeID={post.postID}
          initiativeTitle={post.title}
        />
      )}

    </div>
  );
};

export default SinglePost;