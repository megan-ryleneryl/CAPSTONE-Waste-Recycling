// PostCard.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import styles from './PostCard.module.css';

const PostCard = ({ postType = 'all', maxPosts = 10 }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = () => {
      try {
        const postsRef = collection(db, 'posts');
        let q;

        if (postType === 'all') {
          q = query(
            postsRef,
            orderBy('createdAt', 'desc'),
            limit(maxPosts)
          );
        } else {
          q = query(
            postsRef,
            where('postType', '==', postType),
            orderBy('createdAt', 'desc'),
            limit(maxPosts)
          );
        }

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const postsData = [];
          querySnapshot.forEach((doc) => {
            postsData.push({
              id: doc.id,
              ...doc.data()
            });
          });
          setPosts(postsData);
          setLoading(false);
        }, (err) => {
          console.error('Error fetching posts:', err);
          setError(err.message);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error('Error setting up posts listener:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    const unsubscribe = fetchPosts();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [postType, maxPosts]);

  const getPostTypeConfig = (type) => {
    const configs = {
      'Waste': {
        tagClass: styles.wasteTag,
        tagText: 'Waste Post',
        tagIcon: '',
        showDetails: true,
        showAction: true,
        actionText: 'Collect',
        actionClass: styles.collectButton
      },
      'Initiative': {
        tagClass: styles.initiativeTag,
        tagText: 'Initiative Post',
        tagIcon: '',
        showDetails: true,
        showAction: true,
        actionText: 'Support',
        actionClass: styles.supportButton
      },
      'Forum': {
        tagClass: styles.forumTag,
        tagText: 'Forum Post',
        tagIcon: '',
        showDetails: false,
        showAction: false
      }
    };
    return configs[type] || configs['Waste Post'];
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const postTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInHours = Math.floor((now - postTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}hr ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const handleAction = (post) => {
    // Implement action logic based on post type
    console.log(`${getPostTypeConfig(post.postType).actionText} post:`, post.id);
    // Add your action logic here (navigate to detail page, show modal, etc.)
  };

  const handleLike = (postId) => {
    // Implement like functionality
    console.log('Like post:', postId);
  };

  const handleComment = (postId) => {
    // Implement comment functionality
    console.log('Comment on post:', postId);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error loading posts: {error}</div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No posts found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {posts.map((post) => {
        const config = getPostTypeConfig(post.postType);
        
        return (
          <div key={post.id} className={styles.postCard}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  {post.authorImage ? (
                    <img src={post.authorImage} alt="User" />
                  ) : (
                    <span></span>
                  )}
                </div>
                <div className={styles.userDetails}>
                  <div className={styles.authorName}>
                    {post.authorName || 'Anonymous User'}
                  </div>
                  {post.username && (
                    <div className={styles.username}>{post.username}</div>
                  )}
                </div>
              </div>
              <div className={styles.timestamp}>
                {formatTimeAgo(post.createdAt)}
              </div>
            </div>

            {/* Post Type Tag */}
            <div className={styles.tagContainer}>
              <span className={`${styles.tag} ${config.tagClass}`}>
                <span className={styles.tagIcon}>{config.tagIcon}</span>
                {config.tagText}
              </span>
            </div>

            {/* Title */}
            <h3 className={styles.title}>{post.title}</h3>

            {/* Description */}
            <p className={styles.description}>
              {post.description}
              {post.description && post.description.length > 100 && (
                <span className={styles.seeMore}> See more</span>
              )}
            </p>

            {/* Image Gallery */}
            {post.images && post.images.length > 0 && (
              <div className={styles.imageContainer}>
                <img 
                  src={post.images[0]} 
                  alt="Post content" 
                  className={styles.postImage}
                />
                {post.images.length > 1 && (
                  <>
                    <button className={styles.navButton + ' ' + styles.prevButton}>
                      ‹
                    </button>
                    <button className={styles.navButton + ' ' + styles.nextButton}>
                      ›
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Post Details */}
            {config.showDetails && (
              <div className={styles.details}>
                {post.categories && post.categories.length > 0 && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>🏷️</span>
                    <span className={styles.detailText}>
                      {post.categories.join(', ')}
                    </span>
                  </div>
                )}
                
                {post.location && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>📍</span>
                    <span className={styles.detailText}>{post.location}</span>
                  </div>
                )}
                
                {post.weight && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>⚖️</span>
                    <span className={styles.detailText}>
                      {post.postType === 'Initiative' 
                        ? `${post.currentWeight || 0}/${post.weight} kg`
                        : `${post.weight} kg`
                      }
                    </span>
                  </div>
                )}
                
                {post.schedule && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>🕐</span>
                    <span className={styles.detailText}>{post.schedule}</span>
                  </div>
                )}
              </div>
            )}

            {/* Forum Interactions */}
            {post.postType === 'Forum' && (
              <div className={styles.interactions}>
                <button 
                  className={styles.interactionButton}
                  onClick={() => handleLike(post.id)}
                >
                  <span>🤍</span>
                  <span>Like</span>
                </button>
                <button 
                  className={styles.interactionButton}
                  onClick={() => handleComment(post.id)}
                >
                  <span>💬</span>
                  <span>Comment</span>
                </button>
              </div>
            )}

            {/* Action Button */}
            {config.showAction && (
              <div className={styles.actionContainer}>
                <button 
                  className={`${styles.actionButton} ${config.actionClass}`}
                  onClick={() => handleAction(post)}
                >
                  {config.actionText}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PostCard;