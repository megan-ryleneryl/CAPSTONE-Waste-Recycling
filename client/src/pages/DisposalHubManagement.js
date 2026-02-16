import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './DisposalHubManagement.module.css';
import ModalPortal from '../components/modal/ModalPortal';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const DisposalHubManagement = () => {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHub, setSelectedHub] = useState(null);
  const [filter, setFilter] = useState('unverified'); // 'all', 'verified', 'unverified'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'MRF', 'Junk Shop'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Active', 'Temporarily Closed', 'Permanently Closed'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDisposalHubs();
  }, []);

  const fetchDisposalHubs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch all hubs (we'll filter client-side)
      const response = await axios.get(
        `${API_BASE_URL}/api/disposal-hubs`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setHubs(response.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch disposal hubs');
      console.error('Error fetching disposal hubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Not available';

    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid Date';

      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleVerify = async (hubID) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.put(
        `${API_BASE_URL}/api/disposal-hubs/${hubID}/verify`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Update the local state
        setHubs(hubs.map(hub =>
          hub.hubID === hubID
            ? { ...hub, verified: true, verifiedBy: response.data.data.verifiedBy, updatedAt: response.data.data.updatedAt }
            : hub
        ));

        setShowDetailsModal(false);
        setSelectedHub(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify hub');
      console.error('Error verifying hub:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (hubID, newStatus) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.put(
        `${API_BASE_URL}/api/disposal-hubs/${hubID}/status`,
        { status: newStatus },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Update the local state
        setHubs(hubs.map(hub =>
          hub.hubID === hubID
            ? { ...hub, status: newStatus, updatedAt: response.data.data.updatedAt }
            : hub
        ));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
      console.error('Error updating status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (hubID) => {
    if (!window.confirm('Are you sure you want to mark this hub as permanently closed? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.delete(
        `${API_BASE_URL}/api/disposal-hubs/${hubID}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Update the local state
        setHubs(hubs.map(hub =>
          hub.hubID === hubID
            ? { ...hub, status: 'Permanently Closed', updatedAt: response.data.data.updatedAt }
            : hub
        ));

        setShowDetailsModal(false);
        setSelectedHub(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete hub');
      console.error('Error deleting hub:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailsModal = (hub) => {
    setSelectedHub(hub);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedHub(null);
  };

  // Apply filters
  const filteredHubs = hubs.filter(hub => {
    // Verification filter
    if (filter === 'verified' && !hub.verified) return false;
    if (filter === 'unverified' && hub.verified) return false;

    // Type filter
    if (typeFilter !== 'all' && hub.type !== typeFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && hub.status !== statusFilter) return false;

    return true;
  });

  const formatAddress = (address) => {
    if (!address) return 'No address provided';
    const parts = [
      address.street,
      address.barangay,
      address.city,
      address.province,
      address.region
    ].filter(Boolean);
    return parts.join(', ') || 'No address provided';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading disposal hubs...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Disposal Hub Management</h1>
        <p className={styles.subtitle}>
          Manage and verify suggested disposal hub locations
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Verification Status:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="MRF">MRF</option>
            <option value="Junk Shop">Junk Shop</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Temporarily Closed">Temporarily Closed</option>
            <option value="Permanently Closed">Permanently Closed</option>
          </select>
        </div>

        <div className={styles.filterStats}>
          <span>Showing {filteredHubs.length} of {hubs.length} hubs</span>
        </div>
      </div>

      {/* Hubs List */}
      <div className={styles.hubsList}>
        {filteredHubs.length === 0 ? (
          <div className={styles.noHubs}>
            No disposal hubs found matching the current filters.
          </div>
        ) : (
          filteredHubs.map((hub) => (
            <div key={hub.hubID} className={styles.hubCard}>
              <div className={styles.hubHeader}>
                <div className={styles.hubTitle}>
                  <h3>{hub.name}</h3>
                  <div className={styles.badges}>
                    <span className={`${styles.badge} ${styles[hub.type.replace(' ', '')]}`}>
                      {hub.type}
                    </span>
                    <span className={`${styles.badge} ${hub.verified ? styles.verified : styles.unverified}`}>
                      {hub.verified ? 'Verified' : 'Unverified'}
                    </span>
                    <span className={`${styles.badge} ${styles['status' + hub.status.replace(/\s/g, '')]}`}>
                      {hub.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.hubInfo}>
                <div className={styles.infoRow}>
                  <strong>Address:</strong>
                  <span>{formatAddress(hub.address)}</span>
                </div>
                <div className={styles.infoRow}>
                  <strong>Coordinates:</strong>
                  <span>
                    {hub.coordinates?.lat && hub.coordinates?.lng
                      ? `${parseFloat(hub.coordinates.lat).toFixed(6)}, ${parseFloat(hub.coordinates.lng).toFixed(6)}`
                      : 'Not provided'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <strong>Accepted Materials:</strong>
                  <span>{hub.acceptedMaterials?.length > 0 ? hub.acceptedMaterials.join(', ') : 'Not specified'}</span>
                </div>
                <div className={styles.infoRow}>
                  <strong>Added:</strong>
                  <span>{formatDate(hub.createdAt)}</span>
                </div>
                {hub.verified && (
                  <div className={styles.infoRow}>
                    <strong>Verified:</strong>
                    <span>{formatDate(hub.updatedAt)}</span>
                  </div>
                )}
              </div>

              <div className={styles.hubActions}>
                <button
                  onClick={() => openDetailsModal(hub)}
                  className={styles.btnView}
                >
                  View Details
                </button>

                {!hub.verified && (
                  <button
                    onClick={() => handleVerify(hub.hubID)}
                    className={styles.btnVerify}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Verify'}
                  </button>
                )}

                <select
                  value={hub.status}
                  onChange={(e) => handleUpdateStatus(hub.hubID, e.target.value)}
                  className={styles.statusSelect}
                  disabled={actionLoading}
                >
                  <option value="Active">Active</option>
                  <option value="Temporarily Closed">Temporarily Closed</option>
                  <option value="Permanently Closed">Permanently Closed</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedHub && (
        <ModalPortal>
          <div className={styles.modalOverlay} onClick={closeDetailsModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{selectedHub.name}</h2>
                <button onClick={closeDetailsModal} className={styles.closeButton}>
                  &times;
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailSection}>
                  <h3>Basic Information</h3>
                  <div className={styles.detailRow}>
                    <strong>Type:</strong>
                    <span>{selectedHub.type}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Status:</strong>
                    <span>{selectedHub.status}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Verified:</strong>
                    <span>{selectedHub.verified ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Location</h3>
                  <div className={styles.detailRow}>
                    <strong>Street:</strong>
                    <span>{selectedHub.address?.street || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Barangay:</strong>
                    <span>{selectedHub.address?.barangay || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>City:</strong>
                    <span>{selectedHub.address?.city || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Province:</strong>
                    <span>{selectedHub.address?.province || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Region:</strong>
                    <span>{selectedHub.address?.region || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Coordinates:</strong>
                    <span>
                      {selectedHub.coordinates?.lat && selectedHub.coordinates?.lng
                        ? `${parseFloat(selectedHub.coordinates.lat).toFixed(6)}, ${parseFloat(selectedHub.coordinates.lng).toFixed(6)}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Contact Information</h3>
                  <div className={styles.detailRow}>
                    <strong>Phone:</strong>
                    <span>{selectedHub.contact?.phone || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Email:</strong>
                    <span>{selectedHub.contact?.email || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Website:</strong>
                    <span>{selectedHub.contact?.website || 'N/A'}</span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Accepted Materials</h3>
                  <div className={styles.materialsList}>
                    {selectedHub.acceptedMaterials?.length > 0 ? (
                      selectedHub.acceptedMaterials.map((material, index) => (
                        <span key={index} className={styles.materialTag}>
                          {material}
                        </span>
                      ))
                    ) : (
                      <span>No materials specified</span>
                    )}
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Operating Hours</h3>
                  {selectedHub.operatingHours && Object.keys(selectedHub.operatingHours).length > 0 ? (
                    Object.entries(selectedHub.operatingHours).map(([day, hours]) => (
                      <div key={day} className={styles.detailRow}>
                        <strong>{day.charAt(0).toUpperCase() + day.slice(1)}:</strong>
                        <span>
                          {hours.closed ? 'Closed' : `${hours.open || 'N/A'} - ${hours.close || 'N/A'}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span>No operating hours specified</span>
                  )}
                </div>

                <div className={styles.detailSection}>
                  <h3>Additional Information</h3>
                  <div className={styles.detailRow}>
                    <strong>Rating:</strong>
                    <span>
                      {selectedHub.ratings?.average > 0
                        ? `${selectedHub.ratings.average.toFixed(1)} / 5.0 (${selectedHub.ratings.count} ratings)`
                        : 'No ratings yet'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Created:</strong>
                    <span>{formatDate(selectedHub.createdAt)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Last Updated:</strong>
                    <span>{formatDate(selectedHub.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                {!selectedHub.verified && (
                  <button
                    onClick={() => handleVerify(selectedHub.hubID)}
                    className={styles.btnVerify}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Verify Hub'}
                  </button>
                )}

                {selectedHub.status !== 'Permanently Closed' && (
                  <button
                    onClick={() => handleDelete(selectedHub.hubID)}
                    className={styles.btnDelete}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Mark as Permanently Closed'}
                  </button>
                )}

                <button onClick={closeDetailsModal} className={styles.btnClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default DisposalHubManagement;
