// client/src/components/chat/PickupCard.js
import React from 'react';
import styles from './PickupCard.module.css';

const PickupCard = ({ pickup, currentUser, onUpdateStatus }) => {
  const getStatusColor = (status) => {
    const colors = {
      'Proposed': 'orange',
      'Confirmed': 'green',
      'In-Progress': 'blue',
      'Completed': 'gray',
      'Cancelled': 'red'
    };
    return colors[status] || 'gray';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const canConfirm = pickup.status === 'Proposed' && 
    pickup.proposedBy !== currentUser.userID &&
    currentUser.userID === pickup.giverID;

  const canCancel = pickup.status !== 'Completed' && 
    pickup.status !== 'Cancelled' &&
    (currentUser.userID === pickup.giverID || currentUser.userID === pickup.collectorID);

  return (
    <div className={styles.pickupCard} style={{ borderLeftColor: getStatusColor(pickup.status) }}>
      <div className={styles.header}>
        <h4 className={styles.title}>
          🚚 Pickup Schedule
        </h4>
        <span className={`${styles.statusBadge} ${styles[pickup.status.toLowerCase()]}`}>
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

      {(canConfirm || canCancel) && (
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
          {canCancel && !canConfirm && (
            <button 
              className={styles.cancelButton}
              onClick={() => onUpdateStatus('Cancelled')}
            >
              Cancel Pickup
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PickupCard;