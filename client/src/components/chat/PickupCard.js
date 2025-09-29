// client/src/components/chat/PickupCard.js
import React from 'react';
import styles from './PickupCard.module.css';

const PickupCard = ({ pickup, currentUser, onUpdateStatus }) => {
  const getStatusColor = (status) => {
    const colors = {
      'Proposed': '#f59e0b',
      'Confirmed': '#10b981',
      'In-Progress': '#3b82f6',
      'Completed': '#6b7280',
      'Cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isGiver = currentUser?.userID === pickup.giverID;
  const canConfirm = pickup.status === 'Proposed' && isGiver;
  const canCancel = pickup.status !== 'Completed' && pickup.status !== 'Cancelled';
  const canComplete = pickup.status === 'In-Progress' && isGiver;
  const canStartPickup = pickup.status === 'Confirmed' && !isGiver;

  return (
    <div className={styles.pickupCard} style={{ borderLeftColor: getStatusColor(pickup.status) }}>
      <div className={styles.header}>
        <h4 className={styles.title}>
          🚚 Pickup Schedule
        </h4>
        <span 
          className={styles.statusBadge} 
          style={{ backgroundColor: `${getStatusColor(pickup.status)}20`, color: getStatusColor(pickup.status) }}
        >
          {pickup.status}
        </span>
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.icon}>📅</span>
          <span>{formatDate(pickup.pickupDate)}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.icon}>🕐</span>
          <span>{pickup.pickupTime || 'Time not set'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.icon}>📍</span>
          <span>{pickup.pickupLocation || 'Location not set'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.icon}>👤</span>
          <span>{pickup.contactPerson || 'Contact not set'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.icon}>📱</span>
          <span>{pickup.contactNumber || 'Number not set'}</span>
        </div>
      </div>

      <div className={styles.actions}>
        {canConfirm && (
          <>
            <button 
              className={styles.confirmButton}
              onClick={() => onUpdateStatus('Confirmed')}
            >
              ✅ Confirm
            </button>
            <button 
              className={styles.declineButton}
              onClick={() => onUpdateStatus('Cancelled')}
            >
              ❌ Decline
            </button>
          </>
        )}
        
        {canStartPickup && (
          <button 
            className={styles.startButton}
            onClick={() => onUpdateStatus('In-Progress')}
          >
            🚚 Start Pickup
          </button>
        )}
        
        {canComplete && (
          <button 
            className={styles.completeButton}
            onClick={() => onUpdateStatus('Completed')}
          >
            ✔️ Complete
          </button>
        )}
        
        {canCancel && !canConfirm && (
          <button 
            className={styles.cancelButton}
            onClick={() => onUpdateStatus('Cancelled')}
          >
            Cancel Pickup
          </button>
        )}
      </div>
    </div>
  );
};

export default PickupCard;