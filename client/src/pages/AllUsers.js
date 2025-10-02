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
    role: 'all',
    status: 'all',
    searchTerm: ''
  });

  useEffect(() => {
    // Check if user is admin before fetching
    if (!authLoading && currentUser) {
      if (!currentUser.isAdmin) {
        alert('You do not have permission to view this page');
        navigate('/posts');
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
        navigate('/posts');
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
        {},
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

  const handleMakeAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to make this user an admin? This action cannot be easily undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3001/api/admin/users/${userId}/make-admin`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        alert('User has been granted admin privileges');
        fetchUsers();
        setShowModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error making user admin:', error);
      alert(error.response?.data?.error || 'Failed to grant admin privileges');
    }
  };

  const handleRevokeAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to revoke admin privileges from this user? They will be set to their previous role based on their collector application status.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3001/api/admin/users/${userId}/revoke-admin`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        alert(response.data.message);
        fetchUsers();
        setShowModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error revoking admin privileges:', error);
      alert(error.response?.data?.error || 'Failed to revoke admin privileges');
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
    const roleMatch = filters.role === 'all' || 
      (filters.role === 'admin' && user.isAdmin) ||
      (filters.role === 'collector' && user.isCollector) ||
      (filters.role === 'giver' && !user.isCollector) ||
      (filters.role === 'organization' && user.isOrganization);
    
    // Filter by status
    const statusMatch = filters.status === 'all' || 
      (filters.status === 'verified' && user.status === 'Verified') ||
      (filters.status === 'submitted' && user.status === 'Submitted') ||
      (filters.status === 'suspended' && user.status === 'Suspended') ||
      (filters.status === 'pending' && user.status === 'Pending');
    
    // Filter by search term
    const searchMatch = filters.searchTerm === '' || 
      user.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    return roleMatch && statusMatch && searchMatch;
  });

  // Get status badge styling
  const getStatusBadge = (status) => {
    if (status === 'Suspended') {
      return styles.statusSuspended;
    }
    return styles.statusActive;
  };

  // Get user type badge styling
  const getUserRoleBadge = (user) => {
    if (user.isAdmin) return styles.typeAdmin;
    if (user.isCollector) return styles.typeCollector;
    if (user.isOrganization) return styles.typeOrganization;
    return styles.typeGiver;
  };

  // Get all roles for a user
  const getUserRoles = (user) => {
    const roles = [];
    if (user.isAdmin) roles.push({ label: 'Admin', className: styles.typeAdmin });
    if (user.isCollector) roles.push({ label: 'Collector', className: styles.typeCollector });
    if (user.isOrganization) roles.push({ label: 'Organization', className: styles.typeOrganization });
    
    // If no special roles, user is a Giver
    if (roles.length === 0) {
      roles.push({ label: 'Giver', className: styles.typeGiver });
    }
    
    return roles;
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
            <span className={styles.filterLabel}>Role:</span>
            <button
              className={filters.role === 'all' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, role: 'all' })}
            >
              All Roles
            </button>
            <button
              className={filters.role === 'giver' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, role: 'giver' })}
            >
              Givers
            </button>
            <button
              className={filters.role === 'collector' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, role: 'collector' })}
            >
              Collectors
            </button>
            <button
              className={filters.role === 'organization' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, role: 'organization' })}
            >
              Organizations
            </button>
            <button
              className={filters.role === 'admin' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, role: 'admin' })}
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
             <button
              className={filters.status === 'active' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, status: 'verified' })}
            >
              Verified
            </button>
            <button
              className={filters.status === 'suspended' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, status: 'suspended' })}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className={styles.usersContainer}>
        {filteredUsers.length === 0 ? (
          <div className={styles.noUsers}>
            <p>No users found matching your filters.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.usersTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>User Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.userID || user.uid} className={styles.userRow}>
                    <td className={styles.nameCell}>
                      <strong>{user.firstName} {user.lastName}</strong>
                    </td>
                    <td className={styles.emailCell}>
                      {user.email}
                    </td>
                    <td>
                      <div className={styles.rolesContainer}>
                        {getUserRoles(user).map((role, index) => (
                          <span key={index} className={role.className}>
                            {role.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadge(user.status)}>
                        {user?.status === 'Verified' ? 'Verified' :
                        user?.status === 'Submitted' ? 'Submitted' :
                        user?.status === 'Suspended' ? 'Suspended' :
                        user?.status === 'Rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.tableActions}>
                        {user.isAdmin && currentUser?.userID !== user.userID ? (
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleRevokeAdmin(user.userID || user.uid)}
                            title="Revoke Admin"
                          >
                            Revoke
                          </button>
                        ) : !user.isAdmin ? (
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleMakeAdmin(user.userID || user.uid)}
                            title="Make Admin"
                          >
                            Admin
                          </button>
                        ) : null}
                        <button
                          className={styles.viewBtn}
                          onClick={() => handleViewDetails(user)}
                          title="View Details"
                        >
                          View
                        </button>
                        {user.status === 'Suspended' ? (
                          <button
                            className={styles.unsuspendBtn}
                            onClick={() => handleUnsuspendUser(user.userID || user.uid)}
                            title="Unsuspend User"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            className={styles.suspendBtn}
                            onClick={() => handleViewDetails(user)}
                            title="Suspend User"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <p><strong>Role:</strong> {selectedUser.isAdmin ? 'Admin' : selectedUser.isCollector ? 'Collector' : selectedUser.isOrganization ? 'Organization' : 'Giver'}</p>
                  <p><strong>Status:</strong> {selectedUser.status}</p>
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
                  {selectedUser.isAdmin && currentUser?.userID !== selectedUser.userID ? (
                    <button
                      className={styles.revokeAdminModalButton}
                      onClick={() => handleRevokeAdmin(selectedUser.userID || selectedUser.uid)}
                    >
                      Revoke Admin Privileges
                    </button>
                  ) : !selectedUser.isAdmin ? (
                    <button
                      className={styles.makeAdminModalButton}
                      onClick={() => handleMakeAdmin(selectedUser.userID || selectedUser.uid)}
                    >
                      Make Admin
                    </button>
                  ) : null}
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