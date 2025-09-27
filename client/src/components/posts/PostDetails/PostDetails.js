// PostDetails.js - Right sidebar component for SinglePost page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PostDetails.module.css';
import RequestPickupModal from '../../RequestPickupModal/RequestPickupModal';
import ChatService from '../../../services/chatService';

const PostDetails = ({ post, user: currentUser }) => {
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [postClaimed, setPostClaimed] = useState(false);
  const [claimDetails, setClaimDetails] = useState(null);

  //Check if currentUser details are loaded
  console.log('Current User:', currentUser);

  // Check if current user is the owner
  const isOwner = currentUser?.userID === post?.userID;

  
  // Check if current user is a collector
  const isCollector = currentUser?.isCollector || currentUser?.userType === 'Collector';
  
  useEffect(() => {
    // Check if post has been claimed
    if (post?.postID && currentUser?.userID) {
      checkPostStatus();
    }
  }, [post?.postID, currentUser?.userID]);

  const checkPostStatus = async () => {
    try {
      // Safety check
      if (!post?.postID) return;
      
      // Check if post is already claimed
      if (post.status === 'Claimed' || post.claimedBy) {
        setPostClaimed(true);
        setClaimDetails({
          claimedBy: post.claimedBy,
          isCurrentUserClaim: post.claimedBy === currentUser?.userID
        });
        return;
      }

      // Check if there's an existing conversation for this post
      const conversations = await ChatService.getConversations();
      const existingConvo = conversations.find(
        conv => conv.postID === post.postID
      );
      
      if (existingConvo) {
        setPostClaimed(true);
        setClaimDetails({
          claimedBy: existingConvo.participant1ID === currentUser?.userID ? 
                      existingConvo.participant2ID : existingConvo.participant1ID,
          isCurrentUserClaim: true
        });
      }
    } catch (error) {
      console.error('Error checking post status:', error);
    }
  };

  const handleRequestPickup = async (message) => {
    setIsRequestingPickup(true);
    
    try {
      // Step 1: Claim the post (this will mark it as claimed)
      const claimResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/posts/${post.postID}/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!claimResponse.ok) {
        const errorData = await claimResponse.json();
        throw new Error(errorData.message || 'Failed to claim post');
      }

      // Step 2: Send the initial message
      await ChatService.startConversation(
        post,
        { userID: post.userID, firstName: post.user?.firstName || 'User', lastName: post.user?.lastName || '' },
        { userID: currentUser.userID, firstName: currentUser.firstName || 'User', lastName: currentUser.lastName || '' },
        message
      );

      // Step 3: Navigate to chat
      navigate(`/chat?postId=${post.postID}&userId=${post.userID}`);
      
    } catch (error) {
      console.error('Error requesting pickup:', error);
      alert(error.message || 'Failed to request pickup. Please try again.');
    } finally {
      setIsRequestingPickup(false);
    }
  };

  const handleOpenChat = () => {
    navigate(`/chat?postId=${post.postID}&userId=${post.userID}`);
  };

  // Determine what to show based on user type and post status
  const showRequestButton = 
    post?.postType === 'Waste' && 
    !isOwner && 
    isCollector && 
    !postClaimed &&
    (post?.status === 'Active' || !post?.status);  // Default to Active if no status

  const showChatButton = 
    postClaimed && 
    claimDetails?.isCurrentUserClaim &&
    !isOwner;

  const showClaimedMessage = 
    postClaimed && 
    !claimDetails?.isCurrentUserClaim &&
    !isOwner;

  // Safety check for post data
  if (!post) {
    return (
      <div className={styles.sidebar}>
        <p>Loading post details...</p>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.sidebarTitle}>Post Details:</h3>
      
      {/* Status Badge */}
      <div className={styles.statusSection}>
        <span className={`${styles.badge} ${postClaimed ? styles.claimed : styles.active}`}>
          {postClaimed ? 'Claimed' : 'Active'}
        </span>
      </div>
      
      {/* Details List */}
      <div className={styles.detailsList}>
        {post.materials && (
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>♻️</span>
            <div>
              <span className={styles.detailLabel}>Materials:</span>
              <span className={styles.detailValue}>{post.materials}</span>
            </div>
          </div>
        )}
        
        {post.quantity && (
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>📦</span>
            <div>
              <span className={styles.detailLabel}>Quantity:</span>
              <span className={styles.detailValue}>{post.quantity} kg</span>
            </div>
          </div>
        )}
        
        {post.location && (
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>📍</span>
            <div>
              <span className={styles.detailLabel}>Location:</span>
              <span className={styles.detailValue}>{post.location}</span>
            </div>
          </div>
        )}
        
        {post.condition && (
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>✨</span>
            <div>
              <span className={styles.detailLabel}>Condition:</span>
              <span className={styles.detailValue}>{post.condition}</span>
            </div>
          </div>
        )}
        
        {post.preferredPickup && (
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>⏰</span>
            <div>
              <span className={styles.detailLabel}>Preferred Pickup:</span>
              <span className={styles.detailValue}>{post.preferredPickup}</span>
            </div>
          </div>
        )}
        
        <div className={styles.detailItem}>
          <span className={styles.detailIcon}>📅</span>
          <div>
            <span className={styles.detailLabel}>Posted:</span>
            <span className={styles.detailValue}>
              {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Invalid Date'}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.divider}></div>

      {/* Action Section */}
      <div className={styles.actionSection}>
        {/* For Collectors - Show Request Button */}
        {showRequestButton && (
          <>
            <h4 className={styles.actionTitle}>Pickup Request:</h4>
            <div className={styles.pickupMessage}>
              <p>
                Hi, I'm interested in collecting your recyclables.
                When would be a good time for me to pick them up?
              </p>
            </div>
            <button
              className={styles.requestButton}
              onClick={() => setShowRequestModal(true)}
              disabled={isRequestingPickup}
            >
              {isRequestingPickup ? 'Processing...' : 'Request'}
            </button>
          </>
        )}

        {/* For Collectors who already claimed - Show Chat Button */}
        {showChatButton && (
          <>
            <p className={styles.successMessage}>
              ✅ You have claimed this post
            </p>
            <button
              className={styles.chatButton}
              onClick={handleOpenChat}
            >
              Open Chat
            </button>
          </>
        )}

        {/* For other users when post is claimed */}
        {showClaimedMessage && (
          <div className={styles.claimedByOther}>
            <p className={styles.claimedMessage}>
              This post has already been claimed by another collector.
            </p>
          </div>
        )}

        {/* For Owner - Show management options */}
        {isOwner && (
          <div className={styles.ownerSection}>
            {postClaimed ? (
              <>
                <p className={styles.claimedNotice}>
                  A collector has claimed your post
                </p>
                <button
                  className={styles.viewChatButton}
                  onClick={() => navigate('/messages')}
                >
                  View Messages
                </button>
              </>
            ) : (
              <p className={styles.waitingMessage}>
                Waiting for collectors to request pickup...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Request Pickup Modal */}
      <RequestPickupModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleRequestPickup}
        postTitle={post.title}
        giverName={post.user ? 
          `${post.user.firstName || ''} ${post.user.lastName || ''}`.trim() || 'Giver' 
          : 'Giver'}
      />
    </div>
  );
};

export default PostDetails;