import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import axios from 'axios';
import styles from './AllUsers.module.css';
import ModalPortal from '../components/modal/ModalPortal';

const AllUsers = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [filters, setFilters] = useState({
    userType: 'all',
    status: 'all',
    searchTerm: ''
  });

  useEffect(() => {
    // Check if user is admin before fetching
    if (!authLoading && currentUser) {
      if (currentUser.userType !== 'Admin') {
        alert('You do not have permission to view this page');
        navigate('/dashboard');
        return;
      }
      fetchUsers();
    } else if (!authLoading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, authLoading, navigate]);

  // Helper function to format Firestore dates
  const formatDate = (date) => {
    if (!date) return 'Not available';
    
    let dateObj;
    
    // Handle different date formats from Firestore
    if (date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date?._seconds) {
      dateObj = new Date(date._seconds * 1000);
    } else if (typeof date === 'string') {
      // Handle string format: "Sep 11, 2025, 8:04:41.697 PM"
      dateObj = new Date(date.replace(/,/g, ''));
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
    
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:3001/api/admin/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.data && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        // Token is invalid, AuthContext will handle logout
        navigate('/login');
      } else if (error.response?.status === 403) {
        alert('You do not have permission to view this page');
        navigate('/dashboard');
      } else {
        alert('Failed to fetch users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!suspendReason || suspendReason.trim() === '') {
      alert('Please provide a reason for suspension');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3001/api/admin/users/${userId}/suspend`,
        { 
          status: 'Suspended',
          reason: suspendReason 
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        alert('User suspended successfully');
        fetchUsers();
        setShowModal(false);
        setSelectedUser(null);
        setSuspendReason('');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      alert(error.response?.data?.error || 'Failed to suspend user');
    }
  };

  const handleUnsuspendUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3001/api/admin/users/${userId}/unsuspend`,
        { status: 'Active' },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        alert('User unsuspended successfully');
        fetchUsers();
        setShowModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error unsuspending user:', error);
      alert(error.response?.data?.error || 'Failed to unsuspend user');
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setSuspendReason('');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setSuspendReason('');
  };

  const filteredUsers = users.filter(user => {
    // Filter by user type
    const typeMatch = filters.userType === 'all' || user.userType === filters.userType;
    
    // Filter by status
    const statusMatch = filters.status === 'all' || 
      (filters.status === 'active' && user.status !== 'Suspended') ||
      (filters.status === 'suspended' && user.status === 'Suspended');
    
    // Filter by search term
    const searchMatch = filters.searchTerm === '' || 
      user.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    return typeMatch && statusMatch && searchMatch;
  });

  // Get status badge styling
  const getStatusBadge = (status) => {
    if (status === 'Suspended') {
      return styles.statusSuspended;
    }
    return styles.statusActive;
  };

  // Get user type badge styling
  const getUserTypeBadge = (userType) => {
    const typeStyles = {
      'Admin': styles.typeAdmin,
      'User': styles.typeUser,
      'Collector': styles.typeCollector,
      'Organization': styles.typeOrganization
    };
    return typeStyles[userType] || styles.typeDefault;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className={styles.allUsersContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Manage Users</h1>
        <div className={styles.stats}>
          <span className={styles.statItem}>Total: {users.length}</span>
          <span className={styles.statItem}>
            Active: {users.filter(u => u.status !== 'Suspended').length}
          </span>
          <span className={styles.statItem}>
            Suspended: {users.filter(u => u.status === 'Suspended').length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {/* Search Bar */}
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className={styles.searchInput}
          />
        </div>

        {/* Filter Buttons */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>User Type:</span>
            <button
              className={filters.userType === 'all' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, userType: 'all' })}
            >
              All Types
            </button>
            <button
              className={filters.userType === 'User' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, userType: 'User' })}
            >
              Users
            </button>
            <button
              className={filters.userType === 'Collector' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, userType: 'Collector' })}
            >
              Collectors
            </button>
            <button
              className={filters.userType === 'Organization' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, userType: 'Organization' })}
            >
              Organizations
            </button>
            <button
              className={filters.userType === 'Admin' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, userType: 'Admin' })}
            >
              Admins
            </button>
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Status:</span>
            <button
              className={filters.status === 'all' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, status: 'all' })}
            >
              All Status
            </button>
            <button
              className={filters.status === 'active' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, status: 'active' })}
            >
              Active
            </button>
            <button
              className={filters.status === 'suspended' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, status: 'suspended' })}
            >
              Suspended
            </button>
            <button
              className={filters.status === 'pending' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, status: 'pending' })}
            >
              Pending
            </button>
            <button
              className={filters.status === 'submitted' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, status: 'submitted' })}
            >
              Submitted
            </button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className={styles.usersContainer}>
        {filteredUsers.length === 0 ? (
          <div className={styles.noUsers}>
            <p>No users found matching your filters.</p>
          </div>
        ) : (
          <div className={styles.usersGrid}>
            {filteredUsers.map(user => (
              <div key={user.userID || user.uid} className={styles.userCard}>
                <div className={styles.cardHeader}>
                  <span className={getUserTypeBadge(user.userType)}>
                    {user.userType}
                  </span>
                  <span className={getStatusBadge(user.status)}>
                    {user.status === 'Suspended' ? 'Suspended' : 'Active'}
                  </span>
                </div>
                
                <div className={styles.cardBody}>
                  <h3>{user.firstName} {user.lastName}</h3>
                  <p className={styles.userEmail}>{user.email}</p>
                  
                  <div className={styles.userStats}>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>User Since:</span>
                      <span className={styles.statValue}>
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={styles.viewButton}
                    onClick={() => handleViewDetails(user)}
                  >
                    View Details
                  </button>
                  {user.status === 'Suspended' ? (
                    <button
                      className={styles.unsuspendButton}
                      onClick={() => handleUnsuspendUser(user.userID || user.uid)}
                    >
                      Unsuspend
                    </button>
                  ) : (
                    <button
                      className={styles.suspendButton}
                      onClick={() => handleViewDetails(user)}
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedUser && (
        <ModalPortal>
          <div className={styles.modalBackdrop} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h2>User Details</h2>
                  <button className={styles.closeButton} onClick={closeModal}>
                    ×
                  </button>
                </div>
                
                <div className={styles.detailsContent}>
                  <p><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>User Type:</strong> {selectedUser.userType}</p>
                  <p><strong>Status:</strong> {selectedUser.status === 'Suspended' ? 'Suspended' : 'Active'}</p>
                  <p><strong>Verified:</strong> {selectedUser.isVerified ? 'Yes' : 'No'}</p>
                  <p><strong>User Since:</strong> {formatDate(selectedUser.createdAt)}</p>
                  {selectedUser.updatedAt && (
                    <p><strong>Last Updated:</strong> {formatDate(selectedUser.updatedAt)}</p>
                  )}
                  {selectedUser.suspendedAt && selectedUser.status === 'Suspended' && (
                    <p><strong>Suspended At:</strong> {formatDate(selectedUser.suspendedAt)}</p>
                  )}
                  
                  {selectedUser.phone && (
                    <p><strong>Phone:</strong> {selectedUser.phone}</p>
                  )}
                  {selectedUser.location && (
                    <p><strong>Location:</strong> {selectedUser.location}</p>
                  )}
                  {selectedUser.bio && (
                    <div className={styles.bioSection}>
                      <strong>Bio:</strong>
                      <p>{selectedUser.bio}</p>
                    </div>
                  )}
                  
                  {selectedUser.status === 'Suspended' && selectedUser.suspensionReason && (
                    <div className={styles.suspensionDetail}>
                      <strong>Suspension Reason:</strong>
                      <p>{selectedUser.suspensionReason}</p>
                    </div>
                  )}
                  
                  {selectedUser.status !== 'Suspended' && (
                    <div className={styles.suspendSection}>
                      <label htmlFor="suspendReason">
                        <strong>Reason for Suspension:</strong>
                      </label>
                      <textarea
                        id="suspendReason"
                        className={styles.reasonTextarea}
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="Please provide a reason for suspending this user..."
                        rows="4"
                      />
                    </div>
                  )}
                </div>
                
                <div className={styles.modalActions}>
                  {selectedUser.status === 'Suspended' ? (
                    <>
                      <button
                        className={styles.unsuspendModalButton}
                        onClick={() => handleUnsuspendUser(selectedUser.userID || selectedUser.uid)}
                      >
                        Unsuspend User
                      </button>
                      <button className={styles.cancelButton} onClick={closeModal}>
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={styles.suspendModalButton}
                        onClick={() => handleSuspendUser(selectedUser.userID || selectedUser.uid)}
                      >
                        Suspend User
                      </button>
                      <button className={styles.cancelButton} onClick={closeModal}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AllUsers;