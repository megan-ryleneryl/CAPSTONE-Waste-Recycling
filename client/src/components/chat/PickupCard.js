// client/src/components/chat/PickupCard.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Calendar, Clock, MapPin, User, Phone, FileText, Save, Edit, CheckCircle, X, MapPinned } from 'lucide-react';
import styles from './PickupCard.module.css';

const PickupCard = ({ pickup, currentUser, onUpdateStatus, onEditPickup }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Helper to convert location object to string for editing
  const getLocationString = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;

    // If it's an object, format it as a string
    const parts = [];
    if (location.addressLine) parts.push(location.addressLine);
    if (location.barangay?.name) parts.push(location.barangay.name);
    if (location.city?.name) parts.push(location.city.name);
    if (location.province?.name) parts.push(location.province.name);
    if (location.region?.name) parts.push(location.region.name);
    return parts.join(', ');
  };

  const [editForm, setEditForm] = useState({
    pickupDate: pickup.pickupDate || '',
    pickupTime: pickup.pickupTime || '',
    pickupLocation: getLocationString(pickup.pickupLocation),
    contactPerson: pickup.contactPerson || '',
    contactNumber: pickup.contactNumber || '',
    specialInstructions: pickup.specialInstructions || ''
  });

  const getStatusColor = (status) => {
    const colors = {
      'Proposed': '#f59e0b',
      'Confirmed': '#10b981',
      'In-Transit': '#3b82f6',
      'ArrivedAtPickup': '#8b5cf6',
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

  const formatLocation = (location) => {
    if (!location) return 'Location not set';

    // If location is a string (old format), return it as is
    if (typeof location === 'string') {
      return location;
    }

    // If location is an object (new PSGC format), format it nicely
    if (typeof location === 'object') {
      const parts = [];

      if (location.addressLine) parts.push(location.addressLine);
      if (location.barangay?.name) parts.push(location.barangay.name);
      if (location.city?.name) parts.push(location.city.name);
      if (location.province?.name) parts.push(location.province.name);
      if (location.region?.name) parts.push(location.region.name);

      return parts.length > 0 ? parts.join(', ') : 'Location not set';
    }

    return 'Location not set';
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
      pickupLocation: getLocationString(pickup.pickupLocation),
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
  // Removed canComplete - completion should only happen through the modal
  const canStartPickup = pickup.status === 'Confirmed' && isCollector;

  if (isEditing) {
    return (
      <div className={styles.pickupCard} style={{ borderLeftColor: getStatusColor(pickup.status) }}>
        <div className={styles.header}>
          <h4 className={styles.title}>
            <Edit size={18} />
            <span>Edit Pickup Schedule</span>
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
              <Save size={18} />
              <span>Save Changes</span>
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
          <Truck size={15} />
          <span> Pickup Schedule</span>
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
          <Calendar className={styles.icon} size={18} />
          <span>{formatDate(pickup.pickupDate)}</span>
        </div>
        <div className={styles.detailItem}>
          <Clock className={styles.icon} size={18} />
          <span>{pickup.pickupTime || 'Time not set'}</span>
        </div>
        <div className={styles.detailItem}>
          <MapPin className={styles.icon} size={18} />
          <span>{formatLocation(pickup.pickupLocation)}</span>
        </div>
        <div className={styles.detailItem}>
          <User className={styles.icon} size={18} />
          <span>{pickup.contactPerson || 'Contact not set'}</span>
        </div>
        <div className={styles.detailItem}>
          <Phone className={styles.icon} size={18} />
          <span>{pickup.contactNumber || 'Number not set'}</span>
        </div>
        {pickup.specialInstructions && (
          <div className={styles.detailItem}>
            <FileText className={styles.icon} size={18} />
            <span>{pickup.specialInstructions}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {/* Track Pickup button - always show for confirmed/in-progress/completed pickups */}
        {['Confirmed', 'In-Transit', 'ArrivedAtPickup', 'Completed'].includes(pickup.status) && (
          <button
            className={styles.trackButton}
            onClick={() => navigate(`/tracking/${pickup.pickupID || pickup.id}`)}
          >
            <MapPinned size={18} />
            <span>Track Pickup</span>
          </button>
        )}

        {canEdit && (
          <button
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
          >
            <Edit size={18} />
            <span>Edit</span>
          </button>
        )}

        {canConfirm && (
          <>
            <button
              className={styles.confirmButton}
              onClick={() => onUpdateStatus('Confirmed')}
            >
              <CheckCircle size={18} />
              <span>Confirm</span>
            </button>
            <button
              className={styles.declineButton}
              onClick={() => onUpdateStatus('Cancelled')}
            >
              <X size={18} />
              <span>Decline</span>
            </button>
          </>
        )}

        {canStartPickup && (
          <button
            className={styles.startButton}
            onClick={() => onUpdateStatus('In-Transit')}
          >
            <Truck size={18} />
            <span>On the Way</span>
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