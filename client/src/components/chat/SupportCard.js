// client/src/components/chat/SupportCard.js
import React, { useState } from 'react';
import { CheckCircle, XCircle, Calendar, Package, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './PickupCard.module.css'; // Reuse PickupCard styles

const SupportCard = ({ support, currentUser, onAccept, onDecline, onSchedulePickup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Track which material is being declined
  const [decliningMaterialID, setDecliningMaterialID] = useState(null);
  const [materialDeclineReason, setMaterialDeclineReason] = useState('');

  const isCollector = currentUser.userID === support.collectorID;
  const isGiver = currentUser.userID === support.giverID;

  const getStatusColor = () => {
    switch(support.status) {
      case 'Pending': return '#f59e0b'; // Orange
      case 'PartiallyAccepted': return '#3b82f6'; // Blue
      case 'Accepted': return '#10b981'; // Green
      case 'Declined': return '#ef4444'; // Red
      case 'PickupScheduled': return '#3b82f6'; // Blue
      case 'Completed': return '#059669'; // Dark green
      case 'Cancelled': return '#6b7280'; // Gray
      default: return '#9ca3af';
    }
  };

  const getMaterialStatusColor = (status) => {
    switch(status) {
      case 'Pending': return '#f59e0b';
      case 'Accepted': return '#10b981';
      case 'Declined': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const getStatusBadgeStyle = () => {
    const color = getStatusColor();
    return {
      backgroundColor: `${color}20`,
      color: color,
      borderLeft: `4px solid ${color}`
    };
  };

  // Accept specific material
  const handleAcceptMaterial = async (materialID) => {
    setIsLoading(true);
    try {
      await onAccept(support.supportID, materialID);
    } catch (error) {
      console.error('Error accepting material:', error);
      alert('Failed to accept material');
    } finally {
      setIsLoading(false);
    }
  };

  // Decline specific material
  const handleDeclineMaterial = async (materialID, reason) => {
    if (!reason.trim()) {
      alert('Please provide a reason for declining');
      return;
    }

    setIsLoading(true);
    try {
      await onDecline(support.supportID, materialID, reason);
      setDecliningMaterialID(null);
      setMaterialDeclineReason('');
    } catch (error) {
      console.error('Error declining material:', error);
      alert('Failed to decline material');
    } finally {
      setIsLoading(false);
    }
  };

  // Accept ALL materials (backward compatible)
  const handleAcceptAll = async () => {
    setIsLoading(true);
    try {
      await onAccept(support.supportID);
    } catch (error) {
      console.error('Error accepting support:', error);
      alert('Failed to accept support request');
    } finally {
      setIsLoading(false);
    }
  };

  // Decline ALL materials
  const handleDeclineAll = async () => {
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining');
      return;
    }

    setIsLoading(true);
    try {
      await onDecline(support.supportID, null, declineReason);
      setShowDeclineReason(false);
      setDeclineReason('');
    } catch (error) {
      console.error('Error declining support:', error);
      alert('Failed to decline support request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pickupCard} style={getStatusBadgeStyle()}>
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        <h3 className={styles.title}>Support Request</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(), color: 'white' }}>
            {support.status}
          </span>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className={styles.details}>
            <div className={styles.detailItem}>
              <Package className={styles.icon} size={20} />
              <span><strong>Offered Materials:</strong></span>
            </div>

            {support.offeredMaterials && support.offeredMaterials.map((material, index) => (
              <div key={material.materialID || index} style={{ marginLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    backgroundColor: `${getMaterialStatusColor(material.status)}20`,
                    color: getMaterialStatusColor(material.status),
                    fontWeight: '500'
                  }}>
                    {material.status}
                  </span>
                  <span><strong>{material.materialName}:</strong> {material.quantity} {material.unit || 'kg'}</span>
                </div>

                {material.status === 'Declined' && material.rejectionReason && (
                  <div style={{ fontSize: '0.875rem', color: '#ef4444', marginTop: '0.25rem' }}>
                    Reason: {material.rejectionReason}
                  </div>
                )}

                {/* Individual material actions for collector */}
                {isCollector && material.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {decliningMaterialID === material.materialID ? (
                      <div style={{ width: '100%' }}>
                        <textarea
                          value={materialDeclineReason}
                          onChange={(e) => setMaterialDeclineReason(e.target.value)}
                          placeholder="Reason for declining..."
                          style={{
                            width: '100%',
                            padding: '0.375rem',
                            marginBottom: '0.25rem',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                            minHeight: '50px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleDeclineMaterial(material.materialID, materialDeclineReason)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.875rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            disabled={isLoading}
                          >
                            Confirm Decline
                          </button>
                          <button
                            onClick={() => {
                              setDecliningMaterialID(null);
                              setMaterialDeclineReason('');
                            }}
                            style={{
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.875rem',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAcceptMaterial(material.materialID)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          disabled={isLoading}
                        >
                          <CheckCircle size={14} />
                          Accept
                        </button>
                        <button
                          onClick={() => setDecliningMaterialID(material.materialID)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          disabled={isLoading}
                        >
                          <XCircle size={14} />
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {support.notes && (
              <div className={styles.detailItem}>
                <span><strong>Notes:</strong> {support.notes}</span>
              </div>
            )}

            <div className={styles.detailItem}>
              <span><strong>Giver:</strong> {support.giverName}</span>
            </div>

            <div className={styles.detailItem}>
              <span><strong>Collector:</strong> {support.collectorName}</span>
            </div>
          </div>

          {/* Actions for Collector (Initiative Owner) */}
      {/* Accept All/Decline All - only show if all materials are still pending */}
      {isCollector && support.status === 'Pending' && support.offeredMaterials && support.offeredMaterials.every(m => m.status === 'Pending') && (
        <div className={styles.actions}>
          {!showDeclineReason ? (
            <>
              <button
                onClick={handleAcceptAll}
                className={styles.confirmButton}
                disabled={isLoading}
              >
                <CheckCircle size={16} />
                {isLoading ? 'Processing...' : 'Accept Support'}
              </button>
              <button
                onClick={() => setShowDeclineReason(true)}
                className={styles.declineButton}
                disabled={isLoading}
              >
                <XCircle size={16} />
                Decline
              </button>
            </>
          ) : (
            <div style={{ width: '100%' }}>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Please provide a reason for declining..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  minHeight: '60px'
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleDeclineAll}
                  className={styles.declineButton}
                  disabled={isLoading || !declineReason.trim()}
                >
                  {isLoading ? 'Processing...' : 'Confirm Decline'}
                </button>
                <button
                  onClick={() => {
                    setShowDeclineReason(false);
                    setDeclineReason('');
                  }}
                  className={styles.cancelEditButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule pickup button for Accepted or PartiallyAccepted support */}
      {isCollector && ['Accepted', 'PartiallyAccepted'].includes(support.status) && !support.pickupScheduled && (
        <div className={styles.actions}>
          <button
            onClick={() => onSchedulePickup(support)}
            className={styles.trackButton}
          >
            <Calendar size={16} />
            Schedule Pickup (Accepted Materials)
          </button>
        </div>
      )}

      {/* Info for Giver */}
      {isGiver && support.status === 'Pending' && (
        <div className={styles.actions}>
          <div style={{ padding: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Waiting for initiative owner to review your support offer...
          </div>
        </div>
      )}

      {isGiver && support.status === 'Accepted' && !support.pickupScheduled && (
        <div className={styles.actions}>
          <div style={{ padding: '0.5rem', color: '#10b981', fontSize: '0.875rem' }}>
            ✓ Support accepted! Waiting for pickup schedule...
          </div>
        </div>
      )}

      {support.status === 'PickupScheduled' && (
        <div className={styles.actions}>
          <div style={{ padding: '0.5rem', color: '#3b82f6', fontSize: '0.875rem' }}>
            Pickup has been scheduled. See details above.
          </div>
        </div>
      )}

      {support.status === 'Declined' && support.rejectionReason && (
        <div className={styles.actions}>
          <div style={{ padding: '0.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
            <strong>Declined:</strong> {support.rejectionReason}
          </div>
        </div>
      )}

      {support.status === 'Completed' && (
        <div className={styles.actions}>
          <div style={{ padding: '0.5rem', color: '#059669', fontSize: '0.875rem' }}>
            ✓ Support completed! Thank you for your contribution.
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default SupportCard;
