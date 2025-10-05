import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ModalPortal from '../../modal/ModalPortal'; // Using your existing ModalPortal
import styles from './PostDetails.module.css';

const PostDetails = ({ post, user: currentUser }) => {
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [postClaimed, setPostClaimed] = useState(false);
  const [claimDetails, setClaimDetails] = useState(null);

  useEffect(() => {
    if (post && post.postType === 'Waste') {
      checkClaimStatus();
    }
  }, [post]);

  const checkClaimStatus = async () => {
    if (!post) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3001/api/posts/${post.postID}/claim-status`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setPostClaimed(response.data.claimed);
        setClaimDetails(response.data.claimDetails);
      }
    } catch (error) {
      console.error('Error checking claim status:', error);
    }
  };

  const handleRequestPickup = async () => {
    if (!currentUser) {
      alert('Please log in to request pickup');
      navigate('/login');
      return;
    }

    setIsRequestingPickup(true);
    try {
      const token = localStorage.getItem('token');
      
      // Call the claim endpoint instead of request-pickup
      const response = await axios.post(
        `http://localhost:3001/api/posts/${post.postID}/claim`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Pickup request sent successfully! You can now chat with the giver to arrange pickup details.');
        setShowRequestModal(false);
        
        // Navigate to chat with the post owner
        if (response.data.data?.chatURL) {
          navigate(response.data.data.chatURL);
        } else {
          // Fallback: navigate to chat with post owner
          navigate(`/chat`, { 
            state: { 
              postID: post.postID, 
              otherUser: post.user,
              postData: post
            } 
          });
        }
        
        // Refresh the page data
        checkClaimStatus();
        
        // If there's a parent function to refresh post data, call it
        if (window.location.pathname.includes('/posts/')) {
          window.location.reload(); // Simple reload to refresh post status
        }
      }
    } catch (error) {
      console.error('Error requesting pickup:', error);
      alert(error.response?.data?.message || 'Failed to send pickup request');
    } finally {
      setIsRequestingPickup(false);
    }
  };

  if (!post) return null;

  // Check if user is a collector (multiple ways to verify)
  const isCollector = currentUser?.userType === 'Collector' || 
                     currentUser?.isCollector === true ||
                     currentUser?.userType === 'Admin';
  
  const isGiver = currentUser?.userType === 'Giver';
  const isOwner = currentUser?.userID === post.userID;

  // Show button conditions for Waste posts
  const showRequestButton = post.postType === 'Waste' && 
                           isCollector && 
                           !isOwner && 
                           !postClaimed &&
                           post.status !== 'Claimed';

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
    <>
      <div className={styles.container}>
      <h2 className={styles.header}>Post Details:</h2>

      {/* Basic Details */}
      <div className={styles.detailsSection}>
        {post.postType === 'Waste' && (
          <>
            <div className={styles.detailItem}>
              <span className={styles.icon}>📦</span>
              {/* <span className={styles.label}>Materials:</span> */}
              <span className={styles.value}>{formatMaterials(post.materials)}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>⚖️</span>
              {/* <span className={styles.label}>Quantity:</span> */}
              <span className={styles.value}>{post.quantity} {post.unit || 'kg'}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>📍</span>
              {/* <span className={styles.label}>Location:</span> */}
              <span className={styles.value}>{post.location}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}>🕐</span>
              {/* <span className={styles.label}>Preferred Pickup:</span> */}
              <span className={styles.value}>
                {formatPickupTime(post.pickupDate, post.pickupTime)}
              </span>
            </div>
            
            {/* {post.condition && (
              <div className={styles.detailItem}>
                <span className={styles.icon}>✨</span>
                <span className={styles.label}>Condition:</span>
                <span className={styles.value}>{post.condition}</span>
              </div>
            )} */}
            
            {post.price > 0 && (
              <div className={styles.detailItem}>
                <span className={styles.icon}>💰</span>
                <span className={styles.label}>Price:</span>
                <span className={styles.value}>₱{post.price}</span>
              </div>
            )}
          </>
        )}

        {/* Add other post types details here if needed */}
      </div>

      {/* Action Buttons for Waste Posts */}
      {showRequestButton && (
        <div className={styles.actionButtons}>
          <button 
            className={styles.requestButton}
            onClick={() => setShowRequestModal(true)}
            disabled={isRequestingPickup}
          >
            {isRequestingPickup ? 'Requesting...' : 'Request Pickup'}
          </button>
        </div>
      )}

      {/* Claim Status */}
      {postClaimed && claimDetails && (
        <div className={styles.claimInfo}>
          <p className={styles.claimedText}>
            This post has been claimed by {claimDetails.collectorName}
          </p>
        </div>
      )}

      </div>

      {/* Request Modal - Rendered through portal to appear above everything */}
      {showRequestModal && (
        <ModalPortal>
          <div className={styles.modalOverlay} onClick={() => setShowRequestModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Request Pickup</h3>
                <button 
                  className={styles.modalClose}
                  onClick={() => setShowRequestModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Are you sure you want to request pickup for this waste material?</p>
                <div className={styles.postSummary}>
                  <p><strong>Title:</strong> {post.title}</p>
                  <p><strong>Materials:</strong> {formatMaterials(post.materials)}</p>
                  <p><strong>Quantity:</strong> {post.quantity} {post.unit || 'kg'}</p>
                  <p><strong>Location:</strong> {post.location}</p>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button 
                  className={styles.confirmButton}
                  onClick={handleRequestPickup}
                  disabled={isRequestingPickup}
                >
                  {isRequestingPickup ? 'Sending Request...' : 'Confirm Request'}
                </button>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setShowRequestModal(false)}
                  disabled={isRequestingPickup}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
};

export default PostDetails;