// client/src/components/posts/PostDetails/PostDetails.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ModalPortal from '../../modal/ModalPortal';
import styles from './PostDetails.module.css';

const PostDetails = ({ post, user: currentUser }) => {
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [postClaimed, setPostClaimed] = useState(false);
  const [claimDetails, setClaimDetails] = useState(null);

  // Remove debug logging or use useEffect to log once
  useEffect(() => {
    console.log('PostDetails mounted/updated:', {
      currentUser: currentUser?.userID,
      userType: currentUser?.userType,
      isCollector: currentUser?.isCollector,
      postID: post?.postID
    });
  }, [currentUser?.userID, post?.postID]);

  // Use useCallback to prevent infinite re-renders
  const checkClaimStatus = useCallback(async () => {
    if (!post || !post.postID) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping claim status check');
        return;
      }

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
      console.error('Error checking claim status:', error.response?.data || error.message);
      // Don't throw - just log the error
    }
  }, [post?.postID]);

  // Fix useEffect dependencies
  useEffect(() => {
    if (post && post.postType === 'Waste' && post.postID) {
      checkClaimStatus();
    }
  }, [post?.postID, post?.postType, checkClaimStatus]);

  const handleRequestPickup = async () => {
    if (!currentUser) {
      alert('Please log in to request pickup');
      navigate('/login');
      return;
    }

    // Check if user is authorized to claim
    const isCollector = currentUser?.isCollector === true || 
                       currentUser?.userType === 'Collector' ||
                       currentUser?.isAdmin === true;
    
    if (!isCollector) {
      alert('Only collectors can request pickups for waste posts');
      return;
    }

    setIsRequestingPickup(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Use the correct endpoint - /claim instead of /request-pickup
      const response = await axios.post(
        `http://localhost:3001/api/posts/${post.postID}/claim`,
        {},
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert(response.data.message || 'Pickup request sent successfully!');
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
        
        // Refresh the claim status
        checkClaimStatus();
      }
    } catch (error) {
      console.error('Error requesting pickup:', error);
      
      // Better error handling
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.message || 'You are not authorized to claim this post');
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.message || 'This post may have already been claimed');
      } else {
        alert(error.response?.data?.message || 'Failed to send pickup request. Please try again.');
      }
    } finally {
      setIsRequestingPickup(false);
    }
  };

  if (!post) return null;

  // Fix: Check multiple ways to verify if user is a collector
  const isCollector = currentUser?.isCollector === true || 
                     currentUser?.userType === 'Collector' ||
                     currentUser?.isAdmin === true;
  
  const isOwner = currentUser?.userID === post.userID;

  // Show button conditions for Waste posts
  const showRequestButton = post.postType === 'Waste' && 
                           isCollector && 
                           !isOwner && 
                           !postClaimed &&
                           post.status !== 'Claimed' &&
                           post.status !== 'Completed';

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
      result += result ? ` at ${time}` : time;
    }
    return result || 'Flexible';
  };

  return (
    <div className={styles.postDetails}>
      <div className={styles.header}>
        <h2>{post.title}</h2>
        <span className={styles.postType}>{post.postType}</span>
        {post.status && (
          <span className={styles.status}>{post.status}</span>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h3>Description</h3>
          <p>{post.description}</p>
        </div>

        {post.postType === 'Waste' && (
          <>
            <div className={styles.section}>
              <h3>Materials</h3>
              <p>{formatMaterials(post.materials)}</p>
            </div>

            <div className={styles.section}>
              <h3>Quantity</h3>
              <p>{post.quantity || 'Not specified'} {post.unit || ''}</p>
            </div>

            <div className={styles.section}>
              <h3>Location</h3>
              <p>{post.location || 'Not specified'}</p>
            </div>

            <div className={styles.section}>
              <h3>Preferred Pickup Time</h3>
              <p>{formatPickupTime(post.preferredDate, post.preferredTime)}</p>
            </div>

            {post.paymentAmount && (
              <div className={styles.section}>
                <h3>Payment Offered</h3>
                <p>₱{post.paymentAmount}</p>
              </div>
            )}
          </>
        )}

        {postClaimed && claimDetails && (
          <div className={styles.claimStatus}>
            <p>This post has been claimed by {claimDetails.collectorName}</p>
          </div>
        )}

        {showRequestButton && (
          <button 
            onClick={() => setShowRequestModal(true)}
            disabled={isRequestingPickup}
            className={styles.requestButton}
          >
            {isRequestingPickup ? 'Sending Request...' : 'Request Pickup'}
          </button>
        )}
      </div>

      {/* Request Pickup Modal */}
      {showRequestModal && (
        <ModalPortal>
          <div className={styles.modalOverlay} onClick={() => setShowRequestModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h3>Confirm Pickup Request</h3>
              <div className={styles.requestDetails}>
                <p><strong>Post:</strong> {post.title}</p>
                <p><strong>Materials:</strong> {formatMaterials(post.materials)}</p>
                <p><strong>Quantity:</strong> {post.quantity || 'Not specified'} {post.unit || ''}</p>
                <p><strong>Location:</strong> {post.location || 'Not specified'}</p>
                <p><strong>Pickup Time:</strong> {formatPickupTime(post.preferredDate, post.preferredTime)}</p>
              </div>
              <p className={styles.confirmText}>
                Are you sure you want to request pickup for this waste material?
              </p>
              <div className={styles.modalActions}>
                <button 
                  onClick={handleRequestPickup}
                  disabled={isRequestingPickup}
                  className={styles.confirmButton}
                >
                  {isRequestingPickup ? 'Sending...' : 'Confirm Request'}
                </button>
                <button 
                  onClick={() => setShowRequestModal(false)}
                  disabled={isRequestingPickup}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PostDetails;