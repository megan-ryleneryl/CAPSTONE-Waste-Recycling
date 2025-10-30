// client/src/components/chat/ProposedPickupsModal.js
import React, { useState } from 'react';
import { Calendar, MapPin, DollarSign, User, X, Check, XCircle, MessageCircle } from 'lucide-react';
import ModalPortal from '../modal/ModalPortal';
import styles from './ProposedPickupsModal.module.css';

const ProposedPickupsModal = ({ proposedPickups, onConfirm, onReject, onGoToChat, onClose }) => {
  const [confirmingPickupId, setConfirmingPickupId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);

  const handleConfirmClick = (pickup) => {
    setSelectedPickup(pickup);
    setShowConfirmDialog(true);
  };

  const handleConfirmPickup = async () => {
    if (!selectedPickup) return;

    setConfirmingPickupId(selectedPickup.id);
    await onConfirm(selectedPickup.id);
    setConfirmingPickupId(null);
    setShowConfirmDialog(false);
    setSelectedPickup(null);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    return time;
  };

  const formatLocation = (location) => {
    if (!location) return 'No location specified';
    if (typeof location === 'string') return location;

    return `${location.barangay?.name || ''}, ${location.city?.name || ''}`;
  };

  const formatTotalPrice = (totalPrice) => {
    if (!totalPrice || totalPrice === 0) return null;
    return `₱${parseFloat(totalPrice).toFixed(2)}`;
  };

  if (proposedPickups.length === 0) {
    return (
      <ModalPortal>
        <div className={styles.modalOverlay} onClick={onClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Proposed Pickups</h2>
              <button className={styles.closeButton} onClick={onClose}>
                <X size={24} />
              </button>
            </div>
            <div className={styles.emptyState}>
              <p>No proposed pickups yet. Collectors will appear here once they schedule a pickup.</p>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  return (
    <ModalPortal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Proposed Pickups ({proposedPickups.length})</h2>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className={styles.pickupsList}>
            {proposedPickups.map((pickup) => (
              <div key={pickup.id} className={styles.pickupCard}>
                <div className={styles.pickupHeader}>
                  <div className={styles.collectorInfo}>
                    <User size={20} />
                    <h3>{pickup.collectorName}</h3>
                  </div>
                  <span className={styles.statusBadge}>Pending Approval</span>
                </div>

                <div className={styles.pickupDetails}>
                  <div className={styles.detailRow}>
                    <Calendar size={16} />
                    <span>
                      {formatDate(pickup.pickupDate)} at {formatTime(pickup.pickupTime)}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <MapPin size={16} />
                    <span>{formatLocation(pickup.pickupLocation)}</span>
                  </div>

                  {/* Material Pricing Breakdown */}
                  {pickup.proposedPrice && pickup.proposedPrice.length > 0 && (
                    <div className={styles.pricingBreakdown}>
                      <div className={styles.pricingHeader}>
                        <DollarSign size={16} />
                        <strong>Offered Price:</strong>
                      </div>
                      {pickup.proposedPrice.map((material, index) => (
                        <div key={index} className={styles.materialPrice}>
                          <span className={styles.materialName}>{material.materialName}</span>
                          <span className={styles.materialDetails}>
                            {material.quantity} kg × ₱{parseFloat(material.proposedPricePerKilo || 0).toFixed(2)}/kg
                            {material.quantity > 0 && material.proposedPricePerKilo > 0 && (
                              <span className={styles.materialSubtotal}>
                                {' '}= ₱{(material.quantity * material.proposedPricePerKilo).toFixed(2)}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      {pickup.totalPrice > 0 && (
                        <div className={styles.totalPrice}>
                          <strong>Total:</strong>
                          <strong>{formatTotalPrice(pickup.totalPrice)}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {pickup.contactPerson && (
                    <div className={styles.detailRow}>
                      <User size={16} />
                      <span>Contact: {pickup.contactPerson} ({pickup.contactNumber})</span>
                    </div>
                  )}

                  {pickup.specialInstructions && (
                    <div className={styles.instructions}>
                      <strong>Special Instructions:</strong>
                      <p>{pickup.specialInstructions}</p>
                    </div>
                  )}
                </div>

                <div className={styles.pickupActions}>
                  <button
                    className={styles.acceptButton}
                    onClick={() => handleConfirmClick(pickup)}
                    disabled={confirmingPickupId !== null}
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    className={styles.rejectButton}
                    onClick={() => onReject(pickup.id)}
                    disabled={confirmingPickupId !== null}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    className={styles.chatButton}
                    onClick={() => onGoToChat(pickup.collectorID)}
                  >
                    <MessageCircle size={16} />
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedPickup && (
        <div className={styles.confirmOverlay} onClick={() => setShowConfirmDialog(false)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Pickup Selection</h3>
            <p>
              Are you sure you want to proceed with <strong>{selectedPickup.collectorName}</strong>?
            </p>
            <p className={styles.warningText}>
              This will automatically cancel all other proposed pickups for this post.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmYes}
                onClick={handleConfirmPickup}
                disabled={confirmingPickupId !== null}
              >
                {confirmingPickupId === selectedPickup.id ? 'Confirming...' : 'Yes, Confirm'}
              </button>
              <button
                className={styles.confirmNo}
                onClick={() => setShowConfirmDialog(false)}
                disabled={confirmingPickupId !== null}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
};

export default ProposedPickupsModal;
