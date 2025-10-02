// client/src/pages/PickupTracking.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import PickupCompletionModal from '../components/pickup/PickupCompletionModal';
import styles from './PickupTracking.module.css';

const PickupTracking = () => {
  const { pickupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [pickup, setPickup] = useState(null);
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
    const unsubscribe = onSnapshot(pickupRef, (doc) => {
      if (doc.exists()) {
        setPickup({ id: doc.id, ...doc.data() });
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

  const getTimelineSteps = () => {
    const steps = [
      {
        label: 'Pickup Confirmed',
        status: 'completed',
        timestamp: pickup?.confirmedAt,
        icon: '✅'
      },
      {
        label: 'Collector on the Way',
        status: pickup?.status === 'In-Transit' || pickup?.status === 'Picking-Ongoing' || pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.inTransitAt,
        icon: '🚚'
      },
      {
        label: 'Picking Ongoing',
        status: pickup?.status === 'Picking-Ongoing' || pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.pickingStartedAt,
        icon: '📦'
      },
      {
        label: 'Complete Pickup',
        status: pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.completedAt,
        icon: '✔️'
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
      } else if (newStatus === 'Picking-Ongoing') {
        updateData.pickingStartedAt = serverTimestamp();
      }

      await updateDoc(pickupRef, updateData);

      // Send notification message
      const messagesRef = collection(db, 'messages');
      const statusMessage = {
        senderID: 'system',
        receiverID: isCollector ? pickup.giverID : pickup.collectorID,
        postID: pickup.postID,
        message: `📍 Pickup status updated: ${getStatusLabel(newStatus)}`,
        messageType: 'system',
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

      // Send completion message
      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, {
        senderID: 'system',
        receiverID: isCollector ? pickup.giverID : pickup.collectorID,
        postID: pickup.postID,
        message: '✅ Pickup completed successfully!',
        messageType: 'system',
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
      'Confirmed': 'Pickup Confirmed',
      'In-Transit': 'Collector on the Way',
      'Picking-Ongoing': 'Picking Up Items',
      'Completed': 'Pickup Completed',
      'Cancelled': 'Pickup Cancelled'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Confirmed': '#10b981',
      'In-Transit': '#3b82f6',
      'Picking-Ongoing': '#f59e0b',
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
  const canComplete = isGiver && (pickup.status === 'Picking-Ongoing' || pickup.status === 'In-Transit');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.title}>Tracking</h1>
        <div className={styles.statusBadge} style={{ backgroundColor: getStatusColor(pickup.status) }}>
          {pickup.status === 'In-Transit' ? 'In Transit' : pickup.status}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <div className={styles.pickupInfo}>
            <h2 className={styles.pickupTitle}>
              Pickup at {pickup.pickupTime || '8:00 AM'}
            </h2>
            <p className={styles.location}>{pickup.pickupLocation || 'Quezon City'}</p>
            <p className={styles.pickupId}>#{pickup.id?.substring(0, 6).toUpperCase() || '00001'}</p>
          </div>

          <div className={styles.timeline}>
            {getTimelineSteps().map((step, index) => (
              <div key={index} className={styles.timelineItem}>
                <div className={styles.timelineLeft}>
                  <span className={styles.timelineTime}>
                    {step.timestamp ? formatTime(step.timestamp) : '--:--'}
                  </span>
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
            ))}
          </div>

          {/* Action Buttons for Collectors */}
          {isCollector && canUpdateStatus && (
            <div className={styles.actionButtons}>
              {pickup.status === 'Confirmed' && (
                <button
                  className={styles.primaryButton}
                  onClick={() => handleStatusUpdate('In-Transit')}
                  disabled={updating}
                >
                  🚚 Mark as On the Way
                </button>
              )}
              {pickup.status === 'In-Transit' && (
                <button
                  className={styles.primaryButton}
                  onClick={() => handleStatusUpdate('Picking-Ongoing')}
                  disabled={updating}
                >
                  📦 Start Picking Up
                </button>
              )}
            </div>
          )}

          {/* Complete Button for Givers */}
          {isGiver && canComplete && (
            <button
              className={styles.completeButton}
              onClick={() => setShowCompletionModal(true)}
              disabled={updating}
            >
              Complete Pickup
            </button>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.postDetails}>
            <h3>Post Details:</h3>
            <div className={styles.detailItem}>
              <span className={styles.icon}>🗑️</span>
              <span>{pickup.postType || 'Plastic, Glass, Paper'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.icon}>⚖️</span>
              <span>{pickup.estimatedWeight || '15'} kg</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.icon}>📍</span>
              <span>{pickup.pickupLocation || 'Quezon City'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.icon}>📅</span>
              <span>Weekdays after 5 PM</span>
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.contactInfo}>
            <h4>Contact Information</h4>
            <p className={styles.contactName}>
              {isGiver ? pickup.collectorName : pickup.giverName}
            </p>
            <p className={styles.contactNumber}>
              {pickup.contactNumber || '+63 9XX XXX XXXX'}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <PickupCompletionModal
          pickup={pickup}
          onComplete={handleComplete}
          onCancel={() => setShowCompletionModal(false)}
          loading={updating}
        />
      )}
    </div>
  );
};

export default PickupTracking;