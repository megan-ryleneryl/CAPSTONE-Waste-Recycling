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

  // Support form data for Initiative posts - NEW: Multiple materials
  const [supportData, setSupportData] = useState({
    notes: ''  // Overall notes for the support request
  });

  // Track multiple materials to offer
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  // { materialID, materialName, quantity, unit: 'kg' }

  useEffect(() => {
    if (post && post.postType === 'Waste') {
      checkClaimStatus();
    }
  }, [post]);

  // Reset selected materials when modal opens/closes
  useEffect(() => {
    if (!showSupportModal) {
      setSelectedMaterials([]);
      setSupportData({ notes: '' });
    }
  }, [showSupportModal]);

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

  const handleAddMaterial = (materialID) => {
    const material = post.materials.find(m => m.materialID === materialID);
    if (!material) return;

    // Check if already added
    if (selectedMaterials.some(m => m.materialID === materialID)) {
      alert('This material is already added');
      return;
    }

    setSelectedMaterials([...selectedMaterials, {
      materialID: material.materialID,
      materialName: material.materialName,
      quantity: '',
      unit: 'kg'
    }]);
  };

  const handleRemoveMaterial = (materialID) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.materialID !== materialID));
  };

  const handleUpdateMaterialQuantity = (materialID, quantity) => {
    setSelectedMaterials(selectedMaterials.map(m =>
      m.materialID === materialID ? { ...m, quantity } : m
    ));
  };

  const handleSupportInitiative = async () => {
    if (!currentUser) {
      alert('Please log in to support this initiative');
      navigate('/login');
      return;
    }

    if (selectedMaterials.length === 0) {
      alert('Please add at least one material to offer');
      return;
    }

    // Validate all materials have quantities
    const invalidMaterials = selectedMaterials.filter(m => !m.quantity || parseFloat(m.quantity) <= 0);
    if (invalidMaterials.length > 0) {
      alert('Please provide valid quantities for all materials');
      return;
    }

    setIsSupportingInitiative(true);
    try {
      const token = localStorage.getItem('token');

      // Prepare offered materials array
      const offeredMaterials = selectedMaterials.map(m => ({
        materialID: m.materialID,
        materialName: m.materialName,
        quantity: parseFloat(m.quantity),
        unit: m.unit || 'kg',
        status: 'Pending' // All materials start as pending
      }));

      const response = await axios.post(
        `http://localhost:3001/api/posts/${post.postID}/support`,
        {
          offeredMaterials,  // NEW: Send multiple materials
          notes: supportData.notes
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Support request sent successfully! You can now chat with the initiative owner.');
        setShowSupportModal(false);
        setSupportData({ notes: '' });
        setSelectedMaterials([]);

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
  const isCollector = currentUser?.isCollector === true || currentUser?.isAdmin === true;
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
      if (materials.length === 0) return 'Not specified';

      // Check if materials are objects with materialName
      if (typeof materials[0] === 'object' && materials[0].materialName) {
        return materials.map(m => m.materialName).join(', ');
      }

      // Fallback for old string format
      return materials.join(', ');
    }
    return materials;
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
              <span className={styles.value}>{formatLocation(post.location)}</span>
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
              <span className={styles.value}>{formatLocation(post.location)}</span>
            </div>

            {/* Show per-material progress if materials array exists */}
            {post.materials && Array.isArray(post.materials) && post.materials.length > 0 ? (
              <div className={styles.materialsProgress}>
                <div className={styles.detailItem}>
                  <span className={styles.icon}><Package size={18} /></span>
                  <span className={styles.value}>Materials Needed:</span>
                </div>

                {post.materials.map((material, index) => {
                  const materialProgress = material.targetQuantity > 0
                    ? Math.min(((material.currentQuantity || 0) / material.targetQuantity) * 100, 100)
                    : 0;

                  return (
                    <div key={material.materialID || index} className={styles.materialItem}>
                      <div className={styles.materialHeader}>
                        <span className={styles.materialName}>{material.materialName || material.materialID}</span>
                        <span className={styles.materialQuantity}>
                          {material.currentQuantity || 0} / {material.targetQuantity} kg
                        </span>
                      </div>
                      <div className={styles.progressContainer}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${materialProgress}%` }}
                        />
                      </div>
                      <div className={styles.progressText}>
                        {Math.round(materialProgress)}% Complete
                      </div>
                    </div>
                  );
                })}

                {/* Overall progress */}
                <div className={styles.overallProgress}>
                  <div className={styles.detailItem}>
                    <span className={styles.icon}><BarChart3 size={18} /></span>
                    <span className={styles.value}>
                      Overall Progress: {post.currentAmount || 0} / {post.targetAmount} kg
                    </span>
                  </div>
                  <div className={styles.progressContainer}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                  <div className={styles.progressText}>
                    {Math.round(calculateProgress())}% Complete
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback for old initiatives without materials array */
              post.targetAmount && (
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
              )
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
                  {isSupportingInitiative ? 'Supporting...' : 'Support Initiative'}
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
              <span className={styles.value}>{formatLocation(post.location)}</span>
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
                  <p><strong>Location:</strong> {formatLocation(post.location)}</p>
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
                <div className={styles.guideBox}>
                  <strong>How to offer support:</strong>
                  <ol className={styles.guideList}>
                    <li>Click the dropdown below to select a material</li>
                    <li>Click "Add" to add it to your offer</li>
                    <li>Enter the quantity you can provide for each material</li>
                    <li>You can offer multiple materials by repeating steps 1-3</li>
                    <li>Add any notes and submit your support request</li>
                  </ol>
                </div>

                {/* Show initiative's needed materials */}
                {post.materials && Array.isArray(post.materials) && post.materials.length > 0 && (
                  <div className={styles.neededMaterials}>
                    <strong>Materials needed:</strong>
                    <ul className={styles.materialsList}>
                      {post.materials.map((mat) => (
                        <li key={mat.materialID}>
                          {mat.materialName}: {mat.currentQuantity || 0} / {mat.targetQuantity} kg
                          {mat.currentQuantity >= mat.targetQuantity &&
                            <span className={styles.completedLabel}> ✓ Completed</span>
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={styles.supportForm}>
                  {/* Material Selector */}
                  <div className={styles.formGroup}>
                    <label>Add Material</label>
                    {post.materials && Array.isArray(post.materials) && post.materials.length > 0 ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          id="materialSelector"
                          style={{ flex: 1 }}
                        >
                          <option value="">Choose a material to add...</option>
                          {post.materials
                            .filter(mat =>
                              (mat.currentQuantity || 0) < mat.targetQuantity &&
                              !selectedMaterials.some(sm => sm.materialID === mat.materialID)
                            )
                            .map((mat) => (
                              <option key={mat.materialID} value={mat.materialID}>
                                {mat.materialName} (Need: {mat.targetQuantity - (mat.currentQuantity || 0)} kg)
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className={styles.addButton}
                          onClick={() => {
                            const select = document.getElementById('materialSelector');
                            if (select.value) {
                              handleAddMaterial(select.value);
                              select.value = '';
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <p className={styles.noMaterials}>This initiative has not specified materials yet.</p>
                    )}
                  </div>

                  {/* Selected Materials List */}
                  {selectedMaterials.length > 0 && (
                    <div className={styles.selectedMaterials}>
                      <strong>Materials you're offering:</strong>
                      {selectedMaterials.map((mat) => (
                        <div key={mat.materialID} className={styles.selectedMaterialItem}>
                          <div className={styles.materialInfo}>
                            <span className={styles.materialLabel}>{mat.materialName}</span>
                            <input
                              type="number"
                              value={mat.quantity}
                              onChange={(e) => handleUpdateMaterialQuantity(mat.materialID, e.target.value)}
                              placeholder="Quantity"
                              min="0.1"
                              step="0.1"
                              className={styles.quantityInput}
                            />
                            <span>kg</span>
                          </div>
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => handleRemoveMaterial(mat.materialID)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

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