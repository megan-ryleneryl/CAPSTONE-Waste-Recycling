// client/src/components/posts/InitiativeSupportsModal/InitiativeSupportsModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Package, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import ModalPortal from '../../modal/ModalPortal';
import styles from './InitiativeSupportsModal.module.css';

const InitiativeSupportsModal = ({ isOpen, onClose, initiativeID, initiativeTitle }) => {
  const [supports, setSupports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && initiativeID) {
      fetchSupports();
    }
  }, [isOpen, initiativeID]);

  const fetchSupports = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3001/api/posts/${initiativeID}/supports`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSupports(response.data.supports || []);
      } else {
        setError('Failed to load supports');
      }
    } catch (err) {
      console.error('Error fetching supports:', err);
      setError('Failed to load supports');
    } finally {
      setLoading(false);
    }
  };

  const handleSupportClick = (support) => {
    // Navigate to chat with the support giver
    navigate('/chat', {
      state: {
        postID: initiativeID,
        otherUser: {
          userID: support.giverID,
          name: support.giverName,
          firstName: support.giverName.split(' ')[0],
          lastName: support.giverName.split(' ').slice(1).join(' ')
        },
        postData: {
          postID: initiativeID,
          title: initiativeTitle,
          postType: 'Initiative'
        }
      }
    });
    onClose(); // Close the modal after navigation
  };

  const getFilteredSupports = () => {
    switch (activeTab) {
      case 'pending':
        return supports.filter(s => s.status === 'Pending' || s.status === 'PartiallyAccepted');
      case 'forPickup':
        return supports.filter(s => s.status === 'Accepted' || s.status === 'PickupScheduled');
      case 'completed':
        return supports.filter(s => s.status === 'Completed');
      case 'declined':
        return supports.filter(s => s.status === 'Declined' || s.status === 'Cancelled');
      default:
        return supports;
    }
  };

  const getStatusBadgeStyle = (status) => {
    const colors = {
      'Pending': { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
      'PartiallyAccepted': { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6' },
      'Accepted': { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
      'PickupScheduled': { bg: '#E0E7FF', color: '#3730A3', border: '#6366F1' },
      'Completed': { bg: '#D1FAE5', color: '#065F46', border: '#059669' },
      'Declined': { bg: '#FEE2E2', color: '#991B1B', border: '#EF4444' },
      'Cancelled': { bg: '#F3F4F6', color: '#374151', border: '#9CA3AF' }
    };
    return colors[status] || colors['Pending'];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
      case 'PartiallyAccepted':
        return <Clock size={16} />;
      case 'Accepted':
      case 'Completed':
        return <CheckCircle size={16} />;
      case 'PickupScheduled':
        return <Calendar size={16} />;
      case 'Declined':
      case 'Cancelled':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getCounts = () => {
    return {
      all: supports.length,
      pending: supports.filter(s => s.status === 'Pending' || s.status === 'PartiallyAccepted').length,
      forPickup: supports.filter(s => s.status === 'Accepted' || s.status === 'PickupScheduled').length,
      completed: supports.filter(s => s.status === 'Completed').length,
      declined: supports.filter(s => s.status === 'Declined' || s.status === 'Cancelled').length
    };
  };

  if (!isOpen) return null;

  const filteredSupports = getFilteredSupports();
  const counts = getCounts();

  return (
    <ModalPortal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <h3>Initiative Supports</h3>
            <button className={styles.modalClose} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

        {/* Initiative Title */}
        <div className={styles.initiativeInfo}>
          <p className={styles.initiativeTitle}>{initiativeTitle}</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({counts.all})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'pending' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({counts.pending})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'forPickup' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('forPickup')}
          >
            For Pickup ({counts.forPickup})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'completed' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({counts.completed})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'declined' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('declined')}
          >
            Declined ({counts.declined})
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading supports...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p>{error}</p>
            </div>
          ) : filteredSupports.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={48} strokeWidth={1.5} />
              <p>No supports found</p>
              {activeTab !== 'all' && (
                <span className={styles.emptyHint}>
                  Try switching to a different tab
                </span>
              )}
            </div>
          ) : (
            <div className={styles.supportsList}>
              {filteredSupports.map((support) => {
                const statusStyle = getStatusBadgeStyle(support.status);
                return (
                  <div
                    key={support.supportID}
                    className={styles.supportCard}
                    onClick={() => handleSupportClick(support)}
                  >
                    <div className={styles.supportHeader}>
                      <div className={styles.supportGiver}>
                        <div className={styles.giverAvatar}>
                          {support.giverName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.giverInfo}>
                          <h4>{support.giverName}</h4>
                          <p className={styles.supportDate}>
                            {new Date(support.createdAt?.seconds * 1000 || support.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`
                        }}
                      >
                        {getStatusIcon(support.status)}
                        <span>{support.status}</span>
                      </div>
                    </div>

                    <div className={styles.supportMaterials}>
                      <div className={styles.materialsHeader}>
                        <Package size={16} />
                        <span>Offered Materials:</span>
                      </div>
                      <div className={styles.materialsList}>
                        {support.offeredMaterials?.map((material, idx) => (
                          <div key={idx} className={styles.materialItem}>
                            <span className={styles.materialName}>{material.materialName}:</span>
                            <span className={styles.materialQuantity}>
                              {material.quantity} {material.unit || 'kg'}
                            </span>
                            <span
                              className={styles.materialStatus}
                              style={{
                                color: getStatusBadgeStyle(material.status).color,
                                fontSize: '0.75rem'
                              }}
                            >
                              ({material.status})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {support.notes && (
                      <div className={styles.supportNotes}>
                        <p><strong>Notes:</strong> {support.notes}</p>
                      </div>
                    )}

                    <div className={styles.supportFooter}>
                      <span className={styles.clickHint}>Click to open conversation</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default InitiativeSupportsModal;
