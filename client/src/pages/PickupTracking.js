// client/src/pages/PickupTracking.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Truck, Package, Check, Trash2, Scale, MapPin, Calendar, Phone, User, Clock, DollarSign, FileText } from 'lucide-react';
import PickupCompletionModal from '../components/pickup/PickupCompletionModal';
import styles from './PickupTracking.module.css';

const PickupTracking = () => {
  const { pickupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [pickup, setPickup] = useState(null);
  const [postData, setPostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!pickupId) {
      navigate('/pickups');
      return;
    }

    // Subscribe to real-time pickup updates
    const pickupRef = doc(db, 'pickups', pickupId);
    const unsubscribe = onSnapshot(pickupRef, async (pickupDoc) => {
      if (pickupDoc.exists()) {
        const pickupData = { id: pickupDoc.id, ...pickupDoc.data() };
        setPickup(pickupData);

        // Fetch post data for more details
        if (pickupData.postID) {
          try {
            const postRef = doc(db, 'posts', pickupData.postID);
            const postSnap = await getDoc(postRef);
            if (postSnap.exists()) {
              const data = { id: postSnap.id, ...postSnap.data() };
              setPostData(data);
            } else {
              console.log('Post not found:', pickupData.postID);
            }
          } catch (error) {
            console.error('Error fetching post data:', error);
          }
        }
      } else {
        console.error('Pickup not found');
        navigate('/pickups');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pickupId, navigate]);

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return { date: '', time: '' };
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return {
      date: dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getTimelineSteps = () => {
    const steps = [
      {
        label: 'Pickup Confirmed',
        status: 'completed',
        timestamp: pickup?.confirmedAt,
        icon: 'check-circle'
      },
      {
        label: 'Collector on the Way',
        status: pickup?.status === 'In-Transit' || pickup?.status === 'ArrivedAtPickup' || pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.inTransitAt,
        icon: 'truck'
      },
      {
        label: 'Arrived at Pickup',
        status: pickup?.status === 'ArrivedAtPickup' || pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.arrivedAt,
        icon: 'package'
      },
      {
        label: 'Complete Pickup',
        status: pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.completedAt,
        icon: 'check'
      }
    ];
    return steps;
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      const pickupRef = doc(db, 'pickups', pickupId);
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // Add timestamp for specific status changes
      if (newStatus === 'In-Transit') {
        updateData.inTransitAt = serverTimestamp();
      } else if (newStatus === 'ArrivedAtPickup') {
        updateData.arrivedAt = serverTimestamp();
      }

      await updateDoc(pickupRef, updateData);

      // Send notification message with current user as sender
      const messagesRef = collection(db, 'messages');
      const receiverID = isCollector ? pickup.giverID : pickup.collectorID;
      const actorName = `${currentUser.firstName} ${currentUser.lastName}`;
      const otherUserName = isCollector ? pickup.giverName : pickup.collectorName;
      const actorRole = isCollector ? 'Collector' : 'Giver';
      const otherRole = isCollector ? 'Giver' : 'Collector';

      // Generate user-friendly message with actor and guidance
      let message = '';
      if (newStatus === 'Confirmed') {
        message = `[Status] ${actorName} [${actorRole}] confirmed the pickup schedule. ${otherUserName} [${otherRole}] can now proceed with the pickup.`;
      } else if (newStatus === 'In-Transit') {
        message = `[Status] ${actorName} [${actorRole}] is on the way to the pickup location. ${otherUserName} [${otherRole}], please be ready for the pickup.`;
      } else if (newStatus === 'ArrivedAtPickup') {
        message = `[Status] ${actorName} [${actorRole}] has arrived at the pickup location. Waiting for ${otherUserName} [${otherRole}] to complete the pickup.`;
      } else if (newStatus === 'Cancelled') {
        message = `[Status] ${actorName} [${actorRole}] cancelled the pickup. This pickup has been terminated.`;
      } else {
        message = `[Status] ${getStatusLabel(newStatus)}`;
      }

      const statusMessage = {
        messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderID: currentUser.userID,
        senderName: actorName,
        receiverID: receiverID,
        receiverName: otherUserName,
        postID: pickup.postID,
        postTitle: pickup.postTitle || postData?.title || 'Pickup',
        postType: pickup.postType || postData?.postType || 'Waste',
        message: message,
        messageType: 'system',
        metadata: {
          pickupID: pickup.id,
          newStatus: newStatus,
          statusLabel: getStatusLabel(newStatus)
        },
        isRead: false,
        isDeleted: false,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      await addDoc(messagesRef, statusMessage);

    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async (completionData) => {
    setUpdating(true);
    try {
      const pickupRef = doc(db, 'pickups', pickupId);
      await updateDoc(pickupRef, {
        status: 'Completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        actualWaste: completionData.wasteDetails || [],
        paymentReceived: completionData.totalPayment || 0,
        paymentMethod: completionData.paymentMethod || '',
        completionNotes: completionData.notes || '',
        identityVerified: true,
        finalAmount: completionData.totalAmount || 0
      });

      // Update post status
      if (pickup.postID) {
        const postRef = doc(db, 'posts', pickup.postID);
        await updateDoc(postRef, {
          status: 'Completed',
          updatedAt: serverTimestamp()
        });
      }

      // Send completion message with current user as sender
      const messagesRef = collection(db, 'messages');
      const receiverID = isCollector ? pickup.giverID : pickup.collectorID;
      const actorName = `${currentUser.firstName} ${currentUser.lastName}`;
      const otherUserName = isCollector ? pickup.giverName : pickup.collectorName;
      const actorRole = isCollector ? 'Collector' : 'Giver';

      await addDoc(messagesRef, {
        messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderID: currentUser.userID,
        senderName: actorName,
        receiverID: receiverID,
        receiverName: otherUserName,
        postID: pickup.postID,
        postTitle: pickup.postTitle || postData?.title || 'Pickup',
        postType: pickup.postType || postData?.postType || 'Waste',
        message: `[Completed] ${actorName} [${actorRole}] completed the pickup successfully. Thank you for completing this transaction!`,
        messageType: 'system',
        metadata: {
          pickupID: pickup.id,
          totalWeight: completionData.totalAmount || 0,
          totalPayment: completionData.totalPayment || 0
        },
        isRead: false,
        isDeleted: false,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      setShowCompletionModal(false);
      alert('Pickup completed successfully!');
      navigate('/pickups');
    } catch (error) {
      console.error('Error completing pickup:', error);
      alert('Failed to complete pickup. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'Proposed': 'Pickup Proposed by Collector',
      'Confirmed': 'Pickup Confirmed by Giver',
      'In-Transit': 'Collector on the Way',
      'ArrivedAtPickup': 'Arrived at Pickup',
      'Completed': 'Pickup Completed',
      'Cancelled': 'Pickup Cancelled'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Proposed': '#f59e0b',
      'Confirmed': '#10b981',
      'In-Transit': '#3b82f6',
      'ArrivedAtPickup': '#8b5cf6',
      'Completed': '#059669',
      'Cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading pickup details...</p>
      </div>
    );
  }

  if (!pickup) {
    return (
      <div className={styles.errorContainer}>
        <p>Pickup not found</p>
        <button onClick={() => navigate('/pickups')}>Back to Pickups</button>
      </div>
    );
  }

  const isGiver = currentUser?.userID === pickup.giverID;
  const isCollector = currentUser?.userID === pickup.collectorID;
  const canUpdateStatus = isCollector && pickup.status !== 'Completed' && pickup.status !== 'Cancelled';
  const canComplete = isGiver && (pickup.status === 'ArrivedAtPickup' || pickup.status === 'In-Transit');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.title}>Pickup Tracking</h1>
        <div className={styles.statusBadge} style={{ backgroundColor: getStatusColor(pickup.status) }}>
          {pickup.status === 'In-Transit' ? 'In Transit' : pickup.status}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          {/* Pickup Overview Card */}
          <div className={styles.pickupInfo}>
            <div className={styles.infoHeader}>
              <h2 className={styles.pickupTitle}>{postData?.title || pickup.postTitle || 'Waste Pickup'}</h2>
              <span className={styles.pickupId}>#{pickup.id?.substring(0, 8).toUpperCase()}</span>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <Calendar className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Pickup Date</span>
                  <span className={styles.infoValue}>{pickup.pickupDate || 'TBD'}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Clock className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Pickup Time</span>
                  <span className={styles.infoValue}>{pickup.pickupTime || 'TBD'}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <MapPin className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>{pickup.pickupLocation || postData?.location || 'Not specified'}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Scale className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Estimated Weight</span>
                  <span className={styles.infoValue}>{postData?.quantity || 'N/A'} {postData?.unit || 'kg'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.timeline}>
            {getTimelineSteps().map((step, index) => {
              const dateTime = step.timestamp ? formatDateTime(step.timestamp) : { date: '', time: '' };
              return (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineLeft}>
                    {step.timestamp ? (
                      <>
                        <span className={styles.timelineDate}>{dateTime.date}</span>
                        <span className={styles.timelineTime}>{dateTime.time}</span>
                      </>
                    ) : (
                      <span className={styles.timelinePending}>Pending</span>
                    )}
                  </div>
                  <div className={styles.timelineCenter}>
                    <div className={`${styles.timelineIcon} ${styles[step.status]}`}>
                      {step.status === 'completed' ? '✓' : '○'}
                    </div>
                    {index < getTimelineSteps().length - 1 && (
                      <div className={`${styles.timelineLine} ${
                        getTimelineSteps()[index + 1].status === 'completed' ? styles.completed : ''
                      }`} />
                    )}
                  </div>
                  <div className={styles.timelineRight}>
                    <span className={`${styles.timelineLabel} ${styles[step.status]}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            {/* Collector Actions */}
            {isCollector && canUpdateStatus && (
              <>
                {pickup.status === 'Confirmed' && (
                  <button
                    className={styles.primaryButton}
                    onClick={() => handleStatusUpdate('In-Transit')}
                    disabled={updating}
                  >
                    <Truck size={20} />
                    <span>{updating ? 'Updating...' : "I'm On the Way"}</span>
                  </button>
                )}
                {pickup.status === 'In-Transit' && (
                  <button
                    className={styles.primaryButton}
                    onClick={() => handleStatusUpdate('ArrivedAtPickup')}
                    disabled={updating}
                  >
                    <Package size={20} />
                    <span>{updating ? 'Updating...' : 'Arrived at Pickup'}</span>
                  </button>
                )}
              </>
            )}

            {/* Giver Actions */}
            {isGiver && canComplete && (
              <div className={styles.completeSection}>
                <p className={styles.completeInfo}>
                  <FileText size={18} />
                  Ready to complete the pickup? Fill in the actual details below.
                </p>
                <button
                  className={styles.completeButton}
                  onClick={() => setShowCompletionModal(true)}
                  disabled={updating}
                >
                  <CheckCircle size={20} />
                  <span>Fill Completion Form</span>
                </button>
              </div>
            )}

            {/* Show message when no actions available */}
            {!canUpdateStatus && !canComplete && pickup.status !== 'Completed' && (
              <div className={styles.waitingMessage}>
                <Package size={24} />
                <p>Waiting for {isGiver ? 'collector' : 'giver'} action...</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          {/* Waste Details - Combined Section */}
          {pickup.status !== 'Completed' && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>
                <Trash2 size={20} />
                Waste Details
              </h3>

              {/* Materials */}
              <div className={styles.materials}>
                {postData?.materials ? (
                  Array.isArray(postData.materials) ? (
                    postData.materials.map((material, index) => (
                      <span key={index} className={styles.materialTag}>
                        {typeof material === 'object' ? material.materialName : material}
                      </span>
                    ))
                  ) : (
                    postData.materials.split(',').map((material, index) => (
                      <span key={index} className={styles.materialTag}>{material.trim()}</span>
                    ))
                  )
                ) : (
                  <span className={styles.materialTag}>Mixed Waste</span>
                )}
              </div>

              {/* Estimated Details */}
              <div className={styles.estimatedSection}>
                {postData?.quantity && postData.quantity > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Estimated Quantity:</span>
                    <span className={styles.detailValue}>
                      {postData.quantity} {postData.unit || 'kg'}
                    </span>
                  </div>
                )}
                {postData?.price !== undefined && postData?.price !== null && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Estimated Price:</span>
                    <span className={styles.detailValue}>₱{postData.price}</span>
                  </div>
                )}
                {postData?.condition && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Condition:</span>
                    <span className={styles.detailValue}>{postData.condition}</span>
                  </div>
                )}
                {postData?.description && (
                  <div className={styles.estimateDescription}>
                    <span className={styles.detailLabel}>Description:</span>
                    <p>{postData.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              {isGiver ? <Truck size={20} /> : <User size={20} />}
              {isGiver ? 'Collector Info' : 'Giver Info'}
            </h3>
            <div className={styles.contactDetails}>
              <div className={styles.contactItem}>
                <User size={18} className={styles.contactIcon} />
                <div>
                  <span className={styles.contactLabel}>Name</span>
                  <span className={styles.contactValue}>
                    {isGiver ? pickup.collectorName : pickup.giverName}
                  </span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <Phone size={18} className={styles.contactIcon} />
                <div>
                  <span className={styles.contactLabel}>Contact</span>
                  <span className={styles.contactValue}>
                    {pickup.contactNumber || 'Not provided'}
                  </span>
                </div>
              </div>
              {pickup.alternateContact && (
                <div className={styles.contactItem}>
                  <Phone size={18} className={styles.contactIcon} />
                  <div>
                    <span className={styles.contactLabel}>Alternate</span>
                    <span className={styles.contactValue}>
                      {pickup.alternateContact}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          {pickup.specialInstructions && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>
                <FileText size={20} />
                Special Instructions
              </h3>
              <p className={styles.instructions}>{pickup.specialInstructions}</p>
            </div>
          )}

          {/* Completion Details (if completed) */}
          {pickup.status === 'Completed' && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>
                <CheckCircle size={20} />
                Actual Waste Collected
              </h3>
              <div className={styles.completionDetails}>
                {/* Waste Items Breakdown */}
                {pickup.actualWaste && pickup.actualWaste.length > 0 && (
                  <div className={styles.wasteBreakdown}>
                    <h4 className={styles.breakdownTitle}>Waste Details:</h4>
                    {pickup.actualWaste.map((item, index) => (
                      <div key={index} className={styles.wasteItem}>
                        <div className={styles.wasteItemHeader}>
                          <span className={styles.wasteType}>{item.type}</span>
                        </div>
                        <div className={styles.wasteItemDetails}>
                          <span className={styles.wasteAmount}>{item.amount} kg</span>
                          {item.payment > 0 && (
                            <span className={styles.wastePayment}>₱{item.payment.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div className={styles.summarySection}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total Weight:</span>
                    <span className={styles.detailValue}>{pickup.finalAmount || 0} kg</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total Payment:</span>
                    <span className={styles.detailValue}>₱{pickup.paymentReceived?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Payment Method:</span>
                    <span className={styles.detailValue}>{pickup.paymentMethod || 'N/A'}</span>
                  </div>
                </div>

                {pickup.completionNotes && (
                  <div className={styles.notes}>
                    <span className={styles.detailLabel}>Notes:</span>
                    <p>{pickup.completionNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <PickupCompletionModal
          pickup={{ ...pickup, postData }}
          onComplete={handleComplete}
          onCancel={() => setShowCompletionModal(false)}
          loading={updating}
        />
      )}
    </div>
  );
};

export default PickupTracking;