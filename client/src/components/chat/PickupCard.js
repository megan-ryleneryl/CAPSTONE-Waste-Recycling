// client/src/components/chat/PickupCard.js
import React, { useState } from 'react';
import styles from './PickupCard.module.css';

const PickupCard = ({ pickup, currentUser, onUpdateStatus, onEditPickup }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    pickupDate: pickup.pickupDate || '',
    pickupTime: pickup.pickupTime || '',
    pickupLocation: pickup.pickupLocation || '',
    contactPerson: pickup.contactPerson || '',
    contactNumber: pickup.contactNumber || '',
    specialInstructions: pickup.specialInstructions || ''
  });

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

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async () => {
    try {
      await onEditPickup(pickup.id, editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating pickup:', error);
      alert('Failed to update pickup schedule');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    setEditForm({
      pickupDate: pickup.pickupDate || '',
      pickupTime: pickup.pickupTime || '',
      pickupLocation: pickup.pickupLocation || '',
      contactPerson: pickup.contactPerson || '',
      contactNumber: pickup.contactNumber || '',
      specialInstructions: pickup.specialInstructions || ''
    });
  };

  const isGiver = currentUser?.userID === pickup.giverID;
  const isCollector = currentUser?.userID === pickup.collectorID;
  const canEdit = pickup.status === 'Proposed' && isCollector && pickup.proposedBy === currentUser?.userID;
  const canConfirm = pickup.status === 'Proposed' && isGiver;
  const canCancel = pickup.status !== 'Completed' && pickup.status !== 'Cancelled';
  const canComplete = pickup.status === 'In-Progress' && isGiver;
  const canStartPickup = pickup.status === 'Confirmed' && isCollector;

  if (isEditing) {
    return (
      <div className={styles.pickupCard} style={{ borderLeftColor: getStatusColor(pickup.status) }}>
        <div className={styles.header}>
          <h4 className={styles.title}>
            📝 Edit Pickup Schedule
          </h4>
          <span className={styles.statusBadge} style={{ backgroundColor: `${getStatusColor(pickup.status)}20`, color: getStatusColor(pickup.status) }}>
            {pickup.status}
          </span>
        </div>

        <div className={styles.editForm}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Date</label>
              <input
                type="date"
                name="pickupDate"
                value={editForm.pickupDate}
                onChange={handleEditChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.formField}>
              <label>Time</label>
              <input
                type="time"
                name="pickupTime"
                value={editForm.pickupTime}
                onChange={handleEditChange}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label>Location</label>
            <input
              type="text"
              name="pickupLocation"
              value={editForm.pickupLocation}
              onChange={handleEditChange}
              placeholder="Enter pickup location"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                value={editForm.contactPerson}
                onChange={handleEditChange}
                placeholder="Name of contact person"
              />
            </div>
            <div className={styles.formField}>
              <label>Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                value={editForm.contactNumber}
                onChange={handleEditChange}
                placeholder="Contact number"
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label>Special Instructions</label>
            <textarea
              name="specialInstructions"
              value={editForm.specialInstructions}
              onChange={handleEditChange}
              rows="3"
              placeholder="Any special instructions..."
            />
          </div>

          <div className={styles.editActions}>
            <button className={styles.saveButton} onClick={handleEditSubmit}>
              💾 Save Changes
            </button>
            <button className={styles.cancelEditButton} onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {pickup.specialInstructions && (
          <div className={styles.detailItem}>
            <span className={styles.icon}>📝</span>
            <span>{pickup.specialInstructions}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {canEdit && (
          <button 
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit
          </button>
        )}
        
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
        
        {canCancel && !canConfirm && !canEdit && (
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