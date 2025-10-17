// client/src/components/pickup/PickupsList.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import PickupStatusBadge from './PickupStatusBadge';
import styles from './PickupsList.module.css';

const PickupsList = ({ pickups, currentUser, viewType = 'grid' }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLocation = (location) => {
    if (!location) return 'Not specified';

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

      return parts.length > 0 ? parts.join(', ') : 'Not specified';
    }

    return 'Not specified';
  };

  const handleViewDetails = (pickupId) => {
    navigate(`/tracking/${pickupId}`);
  };

  if (pickups.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Package size={48} strokeWidth={1.5} />
        </div>
        <h3>No pickups found</h3>
        <p>Your pickup schedules will appear here</p>
      </div>
    );
  }

  return (
    <div className={`${styles.pickupsList} ${styles[viewType]}`}>
      {pickups.map((pickup) => (
        <div key={pickup.id} className={styles.pickupItem}>
          <div className={styles.pickupHeader}>
            <h3 className={styles.pickupTitle}>
              {pickup.postTitle || 'Untitled Pickup'}
            </h3>
            <PickupStatusBadge status={pickup.status} />
          </div>

          <div className={styles.pickupDetails}>
            <div className={styles.detail}>
              <span className={styles.label}>Date:</span>
              <span className={styles.value}>{formatDate(pickup.pickupDate)}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Time:</span>
              <span className={styles.value}>{pickup.pickupTime || 'Not set'}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Location:</span>
              <span className={styles.value}>{formatLocation(pickup.pickupLocation)}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>
                {currentUser.userID === pickup.collectorID ? 'Giver:' : 'Collector:'}
              </span>
              <span className={styles.value}>
                {currentUser.userID === pickup.collectorID ? pickup.giverName : pickup.collectorName}
              </span>
            </div>
          </div>

          <div className={styles.pickupActions}>
            <button
              className={styles.viewButton}
              onClick={() => handleViewDetails(pickup.pickupID || pickup.id)}
            >
              View Details
            </button>
            {pickup.status === 'Confirmed' && (
              <button
                className={styles.messageButton}
                onClick={() => navigate('/chat')}
              >
                Message
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PickupsList;