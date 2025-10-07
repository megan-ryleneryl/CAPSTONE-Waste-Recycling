// client/src/components/pickup/PickupStatusBadge.js
import React from 'react';
import { FileText, CheckCircle, Truck, Check, X, Package } from 'lucide-react';
import styles from './PickupStatusBadge.module.css';

const PickupStatusBadge = ({ status }) => {
  const getStatusClass = () => {
    return status.toLowerCase().replace('-', '');
  };

  const getStatusIcon = () => {
    const iconMap = {
      'Proposed': FileText,
      'Confirmed': CheckCircle,
      'In-Progress': Truck,
      'Completed': Check,
      'Cancelled': X
    };
    const IconComponent = iconMap[status] || Package;
    return <IconComponent size={16} />;
  };

  return (
    <span className={`${styles.badge} ${styles[getStatusClass()]}`}>
      <span className={styles.icon}>{getStatusIcon()}</span>
      <span className={styles.text}>{status}</span>
    </span>
  );
};

export default PickupStatusBadge;