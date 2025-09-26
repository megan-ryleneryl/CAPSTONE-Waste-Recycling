// client/src/components/pickup/PickupConfirmation.js
import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, Phone, AlertCircle, Check, X } from 'lucide-react';
import styles from './PickupConfirmation.module.css';

const PickupConfirmation = ({ pickup, userType, onConfirm, onDecline, onCancel }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate time until pickup
  const getTimeUntilPickup = () => {
    const pickupDateTime = new Date(`${pickup.pickupDate} ${pickup.pickupTime}`);
    const now = new Date();
    const hoursUntil = (pickupDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) return 'Overdue';
    if (hoursUntil < 24) return `${Math.floor(hoursUntil)} hours`;
    const daysUntil = Math.floor(hoursUntil / 24);
    return `${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
  };

  // Check if can cancel (5 hours before pickup)
  const canCancel = () => {
    const pickupDateTime = new Date(`${pickup.pickupDate} ${pickup.pickupTime}`);
    const now = new Date();
    const hoursUntil = (pickupDateTime - now) / (1000 * 60 * 60);
    return hoursUntil >= 5;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(pickup.pickupID);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error confirming pickup:', error);
    }
    setLoading(false);
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining');
      return;
    }
    setLoading(true);
    try {
      await onDecline(pickup.pickupID, declineReason);
      setShowDeclineModal(false);
    } catch (error) {
      console.error('Error declining pickup:', error);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    setLoading(true);
    try {
      await onCancel(pickup.pickupID, cancelReason);
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error cancelling pickup:', error);
    }
    setLoading(false);
  };

  const getStatusBadge = () => {
    const statusStyles = {
      'Proposed': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'In-Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[pickup.status]}`}>
        {pickup.status}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{pickup.postTitle}</h3>
            <p className={styles.subtitle}>Pickup Schedule</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Pickup Details */}
        <div className={styles.details}>
          <div className={styles.detailRow}>
            <Calendar className={styles.icon} />
            <div>
              <p className={styles.label}>Date</p>
              <p className={styles.value}>{pickup.pickupDate}</p>
            </div>
          </div>

          <div className={styles.detailRow}>
            <Clock className={styles.icon} />
            <div>
              <p className={styles.label}>Time</p>
              <p className={styles.value}>{pickup.pickupTime}</p>
              <p className={styles.timeUntil}>In {getTimeUntilPickup()}</p>
            </div>
          </div>

          <div className={styles.detailRow}>
            <MapPin className={styles.icon} />
            <div>
              <p className={styles.label}>Location</p>
              <p className={styles.value}>{pickup.pickupLocation}</p>
            </div>
          </div>

          <div className={styles.detailRow}>
            <User className={styles.icon} />
            <div>
              <p className={styles.label}>Contact Person</p>
              <p className={styles.value}>{pickup.contactPerson}</p>
            </div>
          </div>

          <div className={styles.detailRow}>
            <Phone className={styles.icon} />
            <div>
              <p className={styles.label}>Contact Number</p>
              <p className={styles.value}>{pickup.contactNumber}</p>
            </div>
          </div>
        </div>

        {/* Expected Waste */}
        {pickup.expectedWaste && (
          <div className={styles.wasteInfo}>
            <h4>Expected Waste</h4>
            <div className={styles.wasteDetails}>
              <p><strong>Types:</strong> {pickup.expectedWaste.types.join(', ')}</p>
              <p><strong>Amount:</strong> {pickup.expectedWaste.estimatedAmount} {pickup.expectedWaste.unit}</p>
              {pickup.expectedWaste.description && (
                <p><strong>Description:</strong> {pickup.expectedWaste.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        {pickup.specialInstructions && (
          <div className={styles.instructions}>
            <AlertCircle className={styles.alertIcon} />
            <div>
              <p className={styles.instructionLabel}>Special Instructions:</p>
              <p>{pickup.specialInstructions}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          {pickup.status === 'Proposed' && userType === 'Giver' && (
            <>
              <button 
                className={styles.confirmBtn}
                onClick={() => setShowConfirmModal(true)}
              >
                <Check /> Confirm Pickup
              </button>
              <button 
                className={styles.declineBtn}
                onClick={() => setShowDeclineModal(true)}
              >
                <X /> Decline
              </button>
            </>
          )}

          {pickup.status === 'Confirmed' && (
            <>
              {userType === 'Collector' && (
                <button className={styles.startBtn}>
                  Start Pickup (On Arrival)
                </button>
              )}
              {canCancel() ? (
                <button 
                  className={styles.cancelBtn}
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Pickup
                </button>
              ) : (
                <p className={styles.cancelWarning}>
                  <AlertCircle /> Cannot cancel (less than 5 hours until pickup)
                </p>
              )}
            </>
          )}

          {pickup.status === 'In-Progress' && userType === 'Giver' && (
            <button className={styles.completeBtn}>
              Complete Pickup
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Confirm Pickup Schedule</h3>
            <p>Are you sure you want to confirm this pickup schedule?</p>
            
            <div className={styles.confirmDetails}>
              <p><strong>Date:</strong> {pickup.pickupDate}</p>
              <p><strong>Time:</strong> {pickup.pickupTime}</p>
              <p><strong>Location:</strong> {pickup.pickupLocation}</p>
              <p><strong>Contact:</strong> {pickup.contactPerson} ({pickup.contactNumber})</p>
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={handleConfirm} 
                disabled={loading}
                className={styles.primaryBtn}
              >
                {loading ? 'Confirming...' : 'Yes, Confirm'}
              </button>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className={styles.secondaryBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Decline Pickup Schedule</h3>
            <p>Please provide a reason for declining:</p>
            
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter your reason..."
              className={styles.textarea}
              rows="4"
            />

            <div className={styles.modalActions}>
              <button 
                onClick={handleDecline} 
                disabled={loading || !declineReason.trim()}
                className={styles.dangerBtn}
              >
                {loading ? 'Declining...' : 'Decline Pickup'}
              </button>
              <button 
                onClick={() => setShowDeclineModal(false)}
                className={styles.secondaryBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Cancel Pickup</h3>
            <div className={styles.warning}>
              <AlertCircle />
              <p>Cancelling a confirmed pickup may affect your reputation score.</p>
            </div>
            
            <p>Please provide a reason for cancellation:</p>
            
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter your reason..."
              className={styles.textarea}
              rows="4"
            />

            <div className={styles.modalActions}>
              <button 
                onClick={handleCancel} 
                disabled={loading || !cancelReason.trim()}
                className={styles.dangerBtn}
              >
                {loading ? 'Cancelling...' : 'Cancel Pickup'}
              </button>
              <button 
                onClick={() => setShowCancelModal(false)}
                className={styles.secondaryBtn}
              >
                Keep Pickup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupConfirmation;