import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ModalPortal from '../../modal/ModalPortal';
import styles from './PostDetails.module.css';
import { Coins, Recycle, Sprout, MessageCircle, Package, MapPin, Tag, Calendar, Heart, MessageSquare, Goal, Clock, Weight, BarChart3 } from 'lucide-react';


const PostDetails = ({ post, user: currentUser }) => {
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [isSupportingInitiative, setIsSupportingInitiative] = useState(false);
  const [postClaimed, setPostClaimed] = useState(false);
  const [claimDetails, setClaimDetails] = useState(null);

  // Support form data for Initiative posts
  const [supportData, setSupportData] = useState({
    materials: '',
    quantity: '',
    notes: ''
  });

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
        
        if (response.data.data?.chatURL) {
          navigate(response.data.data.chatURL);
        } else {
          navigate(`/chat`, { 
            state: { 
              postID: post.postID, 
              otherUser: post.user,
              postData: post
            } 
          });
        }
        
        checkClaimStatus();
        
        if (window.location.pathname.includes('/posts/')) {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error requesting pickup:', error);
      alert(error.response?.data?.message || 'Failed to send pickup request');
    } finally {
      setIsRequestingPickup(false);
    }
  };

  const handleSupportInitiative = async () => {
    if (!currentUser) {
      alert('Please log in to support this initiative');
      navigate('/login');
      return;
    }

    if (!supportData.materials || !supportData.quantity) {
      alert('Please provide materials and quantity');
      return;
    }

    setIsSupportingInitiative(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `http://localhost:3001/api/posts/${post.postID}/support`,
        {
          materials: supportData.materials,
          quantity: parseFloat(supportData.quantity),
          notes: supportData.notes
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Support request sent successfully! You can now chat with the initiative owner.');
        setShowSupportModal(false);
        setSupportData({ materials: '', quantity: '', notes: '' });
        
        // Navigate to chat or reload
        if (response.data.data?.chatURL) {
          navigate(response.data.data.chatURL);
        }
        
        if (window.location.pathname.includes('/posts/')) {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error supporting initiative:', error);
      alert(error.response?.data?.message || 'Failed to send support request');
    } finally {
      setIsSupportingInitiative(false);
    }
  };

  if (!post) return null;

  // Check user permissions
  const isCollector = currentUser?.userType === 'Collector' || 
                     currentUser?.isCollector === true ||
                     currentUser?.userType === 'Admin';
  
  const isGiver = currentUser?.userType === 'Giver';
  const isOwner = currentUser?.userID === post.userID;

  // Show button conditions for different post types
  const showRequestButton = post.postType === 'Waste' && 
                           isCollector && 
                           !isOwner && 
                           !postClaimed &&
                           post.status !== 'Claimed';

  const showSupportButton = post.postType === 'Initiative' && 
                           !isOwner && 
                           post.status === 'Active';

  // Format helpers
  const formatMaterials = (materials) => {
    if (!materials) return 'Not specified';
    if (Array.isArray(materials)) {
      return materials.join(', ');
    }
    return materials;
  };

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

  const formatEndDate = (endDate) => {
    if (!endDate) return 'No deadline';
    
    let date;
    if (endDate && typeof endDate === 'object' && endDate.seconds) {
      date = new Date(endDate.seconds * 1000);
    } else if (endDate && typeof endDate === 'object' && endDate.toDate) {
      date = endDate.toDate();
    } else {
      date = new Date(endDate);
    }
    
    return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'No deadline';
  };

  const calculateProgress = () => {
    if (!post.targetAmount) return 0;
    return Math.min(((post.currentAmount || 0) / post.targetAmount) * 100, 100);
  };

  return (
    <>
      <div className={styles.container}>
        <h2 className={styles.header}>Post Details</h2>

        {/* WASTE POST DETAILS */}
        {post.postType === 'Waste' && (
          <div className={styles.detailsSection}>
            <div className={styles.detailItem}>
              <span className={styles.icon}><Package size={18} /></span>
              <span className={styles.value}>{formatMaterials(post.materials)}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}><Weight size={18} /></span>
              <span className={styles.value}>{post.quantity} {post.unit || 'kg'}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}><Tag size={18} /></span>
              <span className={styles.value}>{post.location}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}><Clock size={18} /></span>
              <span className={styles.value}>
                {formatPickupTime(post.pickupDate, post.pickupTime)}
              </span>
            </div>
            
            {post.price > 0 && (
              <div className={styles.detailItem}>
                <span className={styles.icon}><Coins size={18} /></span>
                <span className={styles.value}>₱{post.price}</span>
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

            {/* Action Button */}
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
          </div>
        )}

        {/* INITIATIVE POST DETAILS */}
        {post.postType === 'Initiative' && (
          <div className={styles.detailsSection}>
            <div className={styles.detailItem}>
              <span className={styles.icon}><Goal size={18} /></span>
              <span className={styles.value}>{post.goal || 'Environmental initiative'}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}><Tag size={18} /></span>
              <span className={styles.value}>{post.location}</span>
            </div>

            {post.targetAmount && (
              <>
                <div className={styles.detailItem}>
                  <span className={styles.icon}><BarChart3 size={18} /></span>
                  <span className={styles.value}>
                    Progress: {post.currentAmount || 0} / {post.targetAmount} kg
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className={styles.progressContainer}>
                  <div 
                    className={styles.progressBar}
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                <div className={styles.progressText}>
                  {Math.round(calculateProgress())}% Complete
                </div>
              </>
            )}

            {post.endDate && (
              <div className={styles.detailItem}>
                <span className={styles.icon}><Calendar size={18} /></span>
                <span className={styles.value}>Ends: {formatEndDate(post.endDate)}</span>
              </div>
            )}

            {post.supportCount > 0 && (
              <div className={styles.detailItem}>
                <span className={styles.icon}>👥</span>
                <span className={styles.value}>{post.supportCount} supporter{post.supportCount !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Action Button */}
            {showSupportButton && (
              <div className={styles.actionButtons}>
                <button 
                  className={styles.supportButton}
                  onClick={() => setShowSupportModal(true)}
                  disabled={isSupportingInitiative}
                >
                  {isSupportingInitiative ? 'Supporting...' : '🌱 Support Initiative'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* FORUM POST DETAILS */}
        {post.postType === 'Forum' && (
          <div className={styles.detailsSection}>
            <div className={styles.detailItem}>
              <span className={styles.icon}><Tag size={18} /></span>
              <span className={styles.value}>{post.category || 'General'}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.icon}><MapPin size={18} /></span>
              <span className={styles.value}>{post.location}</span>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className={styles.tagsSection}>
                <div className={styles.tagsLabel}>
                  <span className={styles.icon}>#</span>
                  <span>Hashtags</span>
                </div>
                <div className={styles.tagsContainer}>
                  {post.tags.map((tag, index) => (
                    <span key={index} className={styles.forumTag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {post.isPinned && (
              <div className={styles.pinnedBadge}>
                📌 Pinned Post
              </div>
            )}

            {post.isLocked && (
              <div className={styles.lockedBadge}>
                🔒 Locked
              </div>
            )}
          </div>
        )}
      </div>

      {/* Waste Post - Request Pickup Modal */}
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

      {/* Initiative Post - Support Modal */}
      {showSupportModal && (
        <ModalPortal>
          <div className={styles.modalOverlay} onClick={() => setShowSupportModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Support Initiative</h3>
                <button 
                  className={styles.modalClose}
                  onClick={() => setShowSupportModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Contribute materials to support this initiative:</p>
                <div className={styles.supportForm}>
                  <div className={styles.formGroup}>
                    <label>Materials *</label>
                    <input
                      type="text"
                      value={supportData.materials}
                      onChange={(e) => setSupportData({...supportData, materials: e.target.value})}
                      placeholder="e.g., Plastic bottles, cardboard"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Quantity (kg) *</label>
                    <input
                      type="number"
                      value={supportData.quantity}
                      onChange={(e) => setSupportData({...supportData, quantity: e.target.value})}
                      placeholder="0"
                      min="0.1"
                      step="0.1"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Notes (Optional)</label>
                    <textarea
                      value={supportData.notes}
                      onChange={(e) => setSupportData({...supportData, notes: e.target.value})}
                      placeholder="Any additional information..."
                      rows="3"
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button 
                  className={styles.confirmButton}
                  onClick={handleSupportInitiative}
                  disabled={isSupportingInitiative}
                >
                  {isSupportingInitiative ? 'Sending...' : 'Send Support Request'}
                </button>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setShowSupportModal(false)}
                  disabled={isSupportingInitiative}
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