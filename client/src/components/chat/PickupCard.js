// client/src/components/chat/PickupCard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Calendar, Clock, MapPin, User, Phone, FileText, CheckCircle, X, MapPinned, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import ModalPortal from '../modal/ModalPortal';
import styles from './PickupCard.module.css';

const PickupCard = ({ pickup, currentUser, onUpdateStatus, onConfirmPickup, onRejectPickup }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [averagePrices, setAveragePrices] = useState({});
  const [isPriceExpanded, setIsPriceExpanded] = useState(false);

  // Fetch average prices for materials when component mounts
  useEffect(() => {
    const fetchAveragePrices = async () => {
      if (!pickup.proposedPrice || pickup.proposedPrice.length === 0) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || '${API_BASE_URL}/api'}/materials`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const materialsData = data.materials || data;

          // Build a map of materialID -> average price
          const priceMap = {};
          materialsData.forEach(material => {
            priceMap[material.materialID] = material.averagePricePerKg || 0;
          });
          setAveragePrices(priceMap);
        }
      } catch (error) {
        console.error('Error fetching average prices:', error);
      }
    };

    fetchAveragePrices();
  }, [pickup.proposedPrice]);

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

  const handleCancelPickup = () => {
    setShowCancelDialog(true);
  };

  const confirmCancelPickup = () => {
    onUpdateStatus('Cancelled', cancelReason || undefined);
    setShowCancelDialog(false);
    setCancelReason('');
  };

  const isGiver = currentUser?.userID === pickup.giverID;
  const isCollector = currentUser?.userID === pickup.collectorID;
  const canConfirm = pickup.status === 'Proposed' && isGiver;

  // Check if pickup can be cancelled (5-hour policy)
  const canCancelPickupCheck = () => {
    if (pickup.status === 'Completed' || pickup.status === 'Cancelled') {
      return false;
    }

    // Proposals can always be cancelled
    if (pickup.status === 'Proposed') {
      return true;
    }

    // For confirmed pickups, check 5-hour rule
    if (pickup.pickupDate && pickup.pickupTime) {
      try {
        const pickupDateTime = new Date(`${pickup.pickupDate} ${pickup.pickupTime}`);
        const hoursUntilPickup = (pickupDateTime - new Date()) / (1000 * 60 * 60);
        return hoursUntilPickup >= 5;
      } catch (error) {
        console.error('Error calculating hours until pickup:', error);
        return false;
      }
    }

    return false;
  };

  const canCancel = canCancelPickupCheck();
  const canCancelProposal = pickup.status === 'Proposed' && isCollector && pickup.proposedBy === currentUser?.userID;
  const canStartPickup = pickup.status === 'Confirmed' && isCollector;

  return (
    <div className={styles.pickupCard} style={{ borderLeftColor: getStatusColor(pickup.status) }}>
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        <h4 className={styles.title}>
          <Truck size={15} />
          <span> Pickup Schedule</span>
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: `${getStatusColor(pickup.status)}20`, color: getStatusColor(pickup.status) }}
          >
            {pickup.status}
          </span>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <>
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

            {/* Price Breakdown - Expandable */}
            {pickup.proposedPrice && pickup.proposedPrice.length > 0 && (
              <div className={`${styles.priceBreakdown} ${isPriceExpanded ? styles.expanded : ''}`}>
                <div
                  className={`${styles.priceHeader} ${isPriceExpanded ? styles.expanded : ''}`}
                  onClick={() => setIsPriceExpanded(!isPriceExpanded)}
                  style={{ cursor: 'pointer' }}

                >
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={18} />
                    <strong>{isPriceExpanded ? 'Price Breakdown' : 'Price Offered'}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Show total when collapsed */}
                    {!isPriceExpanded && pickup.totalPrice > 0 && (
                      <div className={styles.collapsedTotal}>
                        ₱{parseFloat(pickup.totalPrice).toFixed(2)}
                      </div>
                    )}

                    {isPriceExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>



                {/* Show full breakdown when expanded */}
                {isPriceExpanded && (
                  <>
                    {pickup.proposedPrice.map((material, index) => {
                      const avgPrice = averagePrices[material.materialID] || 0;
                      const proposedPrice = parseFloat(material.proposedPricePerKilo) || 0;
                      const priceDiff = proposedPrice - avgPrice;
                      const isHigher = priceDiff > 0;
                      const isEqual = avgPrice > 0 && Math.abs(priceDiff) < 0.01;

                      return (
                        <div key={index} className={styles.materialPriceRow}>
                          <div className={styles.materialNameQty}>
                            <span className={styles.materialName}>{material.materialName}</span>
                            <span className={styles.materialQuantity}>({material.quantity} kg)</span>
                          </div>
                          <div className={styles.priceComparison}>
                            <div className={styles.priceRow}>
                              <span className={styles.priceLabel}>Proposed:</span>
                              <span className={styles.proposedPrice}>₱{proposedPrice.toFixed(2)}/kg</span>
                            </div>
                            {avgPrice > 0 && (
                              <>
                                <div className={styles.priceRow}>
                                  <span className={styles.priceLabel}>Average:</span>
                                  <span className={styles.avgPrice}>₱{avgPrice.toFixed(2)}/kg</span>
                                </div>
                                <div className={styles.priceDiffRow}>
                                  <span className={`${styles.priceDiff} ${isEqual ? styles.equal : (isHigher ? styles.higher : styles.lower)}`}>
                                    {isEqual ? '= Market average' : `${isHigher ? '+' : ''}${priceDiff.toFixed(2)} (${isHigher ? 'above' : 'below'} avg)`}
                                  </span>
                                </div>
                              </>
                            )}
                            {material.quantity > 0 && proposedPrice > 0 && (
                              <div className={styles.subtotalRow}>
                                <span className={styles.subtotalLabel}>Subtotal:</span>
                                <span className={styles.subtotal}>₱{(material.quantity * proposedPrice).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {pickup.totalPrice > 0 && (
                      <div className={styles.totalPriceRow}>
                        <strong>Total Offered:</strong>
                        <strong className={styles.totalAmount}>₱{parseFloat(pickup.totalPrice).toFixed(2)}</strong>
                      </div>
                    )}
                  </>
                )}
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

        {canCancelProposal && (
          <button
            className={styles.cancelButton}
            onClick={handleCancelPickup}
          >
            <X size={18} />
            <span>Cancel Proposal</span>
          </button>
        )}

        {canConfirm && (
          <>
            <button
              className={styles.confirmButton}
              onClick={() => onConfirmPickup && onConfirmPickup(pickup.pickupID || pickup.id)}
            >
              <CheckCircle size={18} />
              <span>Confirm</span>
            </button>
            <button
              className={styles.declineButton}
              onClick={() => onRejectPickup && onRejectPickup(pickup.pickupID || pickup.id)}
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

        {canCancel && !canConfirm && !canCancelProposal && (
          <button
            className={styles.cancelButton}
            onClick={handleCancelPickup}
          >
            <X size={18} />
            <span>Cancel Pickup</span>
          </button>
        )}
          </div>
        </>
      )}

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <ModalPortal>
          <div className={styles.cancelDialogOverlay} onClick={() => setShowCancelDialog(false)}>
            <div className={styles.cancelDialog} onClick={(e) => e.stopPropagation()}>
              <h3>Cancel Pickup</h3>
              <p>Are you sure you want to cancel this pickup? You can provide a reason below (optional).</p>
              <textarea
                className={styles.cancelReasonInput}
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows="4"
              />
              <div className={styles.cancelDialogActions}>
                <button
                  className={styles.confirmCancelButton}
                  onClick={confirmCancelPickup}
                >
                  Yes, Cancel
                </button>
                <button
                  className={styles.keepButton}
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelReason('');
                  }}
                >
                  Keep Pickup
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PickupCard;