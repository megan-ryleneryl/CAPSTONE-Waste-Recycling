import React from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../../../context/ToastContext';
import Toast from '../Toast/Toast';
import PointsPopup from '../PointsPopup/PointsPopup';
import PickupPopup from '../PickupPopup/PickupPopup';
import { BadgeUnlocked } from '../../badges';
import './ToastContainer.css';

const ToastContainer = () => {
  const {
    toasts,
    pointsPopup,
    unlockedBadge,
    pickupPopup,
    removeToast,
    hidePointsPopup,
    hideBadgePopup,
    hidePickupPopup
  } = useToast();

  // Create portal root if it doesn't exist
  let portalRoot = document.getElementById('toast-root');
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.id = 'toast-root';
    document.body.appendChild(portalRoot);
  }

  return ReactDOM.createPortal(
    <>
      {/* Toast notifications stack */}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            toast={toast}
            index={index}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Points earned popup (centered overlay) */}
      {pointsPopup && (
        <PointsPopup
          popup={pointsPopup}
          onClose={hidePointsPopup}
        />
      )}

      {/* Badge unlocked popup */}
      {unlockedBadge && (
        <BadgeUnlocked
          badge={unlockedBadge}
          onClose={hideBadgePopup}
        />
      )}

      {/* Pickup status popup */}
      {pickupPopup && (
        <PickupPopup
          popup={pickupPopup}
          onClose={hidePickupPopup}
        />
      )}
    </>,
    portalRoot
  );
};

export default ToastContainer;
