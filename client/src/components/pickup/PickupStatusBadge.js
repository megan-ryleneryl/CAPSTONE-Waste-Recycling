// client/src/components/pickup/PickupStatusBadge.js
import React from 'react';
import styles from './PickupStatusBadge.module.css';

const PickupStatusBadge = ({ status }) => {
  const getStatusClass = () => {
    return status.toLowerCase().replace('-', '');
  };

  const getStatusIcon = () => {
    const icons = {
      'Proposed': '📝',
      'Confirmed': '✅',
      'In-Progress': '🚚',
      'Completed': '✔️',
      'Cancelled': '❌'
    };
    return icons[status] || '📦';
  };

  return (
    <span className={`${styles.badge} ${styles[getStatusClass()]}`}>
      <span className={styles.icon}>{getStatusIcon()}</span>
      <span className={styles.text}>{status}</span>
    </span>
  );
};

export default PickupStatusBadge;