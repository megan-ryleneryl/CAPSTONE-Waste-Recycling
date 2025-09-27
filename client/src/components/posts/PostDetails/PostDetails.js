import React from 'react';
import styles from './PostDetails.module.css';

const PostDetails = ({ post, user }) => {
  if (!post) return null;

  const isCollector = user?.userType === 'Collector' || user?.userType === 'Admin';
  const isGiver = user?.userType === 'Giver';
  const isOwner = user?.userID === post.userID;

  // Format materials for display
  const formatMaterials = (materials) => {
    if (!materials) return 'Not specified';
    if (Array.isArray(materials)) {
      return materials.join(', ');
    }
    return materials;
  };

  // Format pickup time
  const formatPickupTime = (date, time) => {
    if (!date && !time) return 'Flexible';
    
    let result = '';
    if (date) {
      const d = new Date(date);
      result = d.toLocaleDateString();
    }
    if (time) {
      result += result ? ' at ' : '';
      result += time;
    }
    return result || 'Flexible';
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Post Details:</h2>
      
      {/* Basic Details */}
      <div className={styles.detailsSection}>
        {post.postType === 'Waste' && (
          <>
            <div className={styles.detailItem}>
              <span className={styles.icon}>📦</span>
              <span className={styles.label}>Materials:</span>
              <span className={styles.value}>{formatMaterials(post.materials)}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>⚖️</span>
              <span className={styles.label}>Quantity:</span>
              <span className={styles.value}>{post.quantity} {post.unit || 'kg'}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>📍</span>
              <span className={styles.label}>Location:</span>
              <span className={styles.value}>{post.location}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>🕐</span>
              <span className={styles.label}>Preferred Pickup:</span>
              <span className={styles.value}>
                {formatPickupTime(post.pickupDate, post.pickupTime)}
              </span>
            </div>
            
            {post.condition && (
              <div className={styles.detailItem}>
                <span className={styles.icon}>✨</span>
                <span className={styles.label}>Condition:</span>
                <span className={styles.value}>{post.condition}</span>
              </div>
            )}
            
            {post.price > 0 && (
              <div className={styles.detailItem}>
                <span className={styles.icon}>💰</span>
                <span className={styles.label}>Price:</span>
                <span className={styles.value}>₱{post.price}</span>
              </div>
            )}
          </>
        )}

        {post.postType === 'Initiative' && (
          <>
            <div className={styles.detailItem}>
              <span className={styles.icon}>🎯</span>
              <span className={styles.label}>Goal:</span>
              <span className={styles.value}>{post.goal}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>📊</span>
              <span className={styles.label}>Target:</span>
              <span className={styles.value}>{post.targetAmount} kg</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>📈</span>
              <span className={styles.label}>Progress:</span>
              <span className={styles.value}>
                {post.currentAmount || 0} kg collected
              </span>
            </div>
            
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{
                  width: `${Math.min(((post.currentAmount || 0) / post.targetAmount) * 100, 100)}%`
                }}
              />
            </div>
            <div className={styles.progressText}>
              {Math.round(((post.currentAmount || 0) / post.targetAmount) * 100)}% Complete
            </div>
            
            {post.endDate && (
              <div className={styles.detailItem}>
                <span className={styles.icon}>📅</span>
                <span className={styles.label}>Ends:</span>
                <span className={styles.value}>
                  {new Date(post.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </>
        )}

        {post.postType === 'Forum' && (
          <>
            <div className={styles.detailItem}>
              <span className={styles.icon}>🏷️</span>
              <span className={styles.label}>Category:</span>
              <span className={styles.value}>{post.category}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>💬</span>
              <span className={styles.label}>Comments:</span>
              <span className={styles.value}>{post.commentCount || 0}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>❤️</span>
              <span className={styles.label}>Likes:</span>
              <span className={styles.value}>{post.likeCount || 0}</span>
            </div>
            
            {post.tags && post.tags.length > 0 && (
              <div className={styles.detailItem}>
                <span className={styles.icon}>🔖</span>
                <span className={styles.label}>Tags:</span>
                <div className={styles.tags}>
                  {post.tags.map((tag, idx) => (
                    <span key={idx} className={styles.tag}>#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pickup Requests Section for Givers */}
      {post.postType === 'Waste' && isGiver && isOwner && (
        <div className={styles.requestsSection}>
          <h3 className={styles.sectionTitle}>Pickup Requests:</h3>
          {post.pickupRequests && post.pickupRequests.length > 0 ? (
            <div className={styles.requestsList}>
              <div className={styles.requestCard}>
                <div className={styles.requestCount}>
                  {post.pickupRequests.length}
                </div>
                <div className={styles.requestInfo}>
                  <span className={styles.requestLabel}>Requests for Pickup</span>
                  <button className={styles.checkButton}>
                    Check Inbox
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noRequests}>
              No pickup requests yet
            </div>
          )}
        </div>
      )}

      {/* Collector Actions */}
      {post.postType === 'Waste' && isCollector && !isOwner && post.status === 'Active' && (
        <div className={styles.collectorActions}>
          <button className={styles.primaryButton}>
            Request Pickup
          </button>
          <button className={styles.secondaryButton}>
            Message Giver
          </button>
        </div>
      )}

      {/* Initiative Support Section */}
      {post.postType === 'Initiative' && !isOwner && (
        <div className={styles.supportSection}>
          <h3 className={styles.sectionTitle}>Support This Initiative:</h3>
          <button className={styles.primaryButton}>
            Donate Materials
          </button>
          <button className={styles.secondaryButton}>
            Share Initiative
          </button>
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && (
        <div className={styles.ownerActions}>
          <h3 className={styles.sectionTitle}>Manage Post:</h3>
          <button className={styles.editButton}>
            Edit Post
          </button>
          {post.status === 'Available' && (
            <button className={styles.statusButton}>
              Mark as Claimed
            </button>
          )}
          <button className={styles.deleteButton}>
            Delete Post
          </button>
        </div>
      )}
    </div>
  );
};

export default PostDetails;