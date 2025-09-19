import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Approvals.module.css';
import ModalPortal from '../components/modal/ModalPortal';

const Approvals = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userDetails, setUserDetails] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

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

  // Fetch user details for a given userID
  const fetchUserDetails = async (userID) => {
    if (userDetails[userID]) return userDetails[userID];
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3001/api/admin/users/${userID}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        const user = response.data.user;
        const userInfo = {
          displayName: user.isOrganization && user.organizationName 
            ? `${user.organizationName} (${user.firstName} ${user.lastName})`
            : `${user.firstName} ${user.lastName}`,
          isAdmin: user.userType === 'Admin',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        };
        
        setUserDetails(prev => ({
          ...prev,
          [userID]: userInfo
        }));
        
        return userInfo;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      return { displayName: userID, isAdmin: false };
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all applications, not just pending
      const response = await axios.get(
        'http://localhost:3001/api/admin/applications',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        const apps = response.data.applications;
        setApplications(apps);
        
        // Fetch user details for all applications
        const userIDs = [...new Set([
          ...apps.map(app => app.userID),
          ...apps.filter(app => app.reviewedBy).map(app => app.reviewedBy)
        ])];
        
        for (const userID of userIDs) {
          await fetchUserDetails(userID);
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error.response || error);
      if (error.response?.status === 403) {
        setError('Admin access required. Please ensure you are logged in with an admin account.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please login again.');
        navigate('/login');
      } else {
        setError('Failed to fetch applications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplay = (userID, isReviewer = false) => {
    const user = userDetails[userID];
    if (!user) return userID;
    
    if (isReviewer && user.isAdmin) {
      return `Admin ${user.displayName}`;
    }
    
    return user.displayName;
  };

  const handleApprove = async (applicationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3001/api/admin/applications/${applicationId}/review`,
        {
          status: 'Approved',
          justification: 'Application meets all requirements'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Check response properly
      if (response.data && response.data.success) {
        alert('Application approved successfully!');
        fetchApplications();
        setSelectedApplication(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert(error.response?.data?.error || 'Failed to approve application');
    }
  };

  const handleReject = async (applicationId, reason) => {
    if (!reason || reason.trim() === '') {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3001/api/admin/applications/${applicationId}/review`,
        {
          status: 'Rejected',
          justification: reason
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Check response properly
      if (response.data && response.data.success) {
        alert('Application rejected');
        fetchApplications();
        setSelectedApplication(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert(error.response?.data?.error || 'Failed to reject application');
    }
  };

  const filteredApplications = applications.filter(app => {
    // Filter out deleted users
    const user = userDetails[app.userID];
    if (user && user.firstName === 'Deleted' && user.lastName === 'User') {
      return false;
    }
    
    // Filter by type
    const typeMatch = filter === 'all' || app.applicationType === filter;
    
    // Filter by status
    const statusMatch = statusFilter === 'all' || app.status === statusFilter;
    
    return typeMatch && statusMatch;
  });

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusStyles = {
      'Pending': styles.statusPending,
      'Submitted': styles.statusSubmitted,
      'Approved': styles.statusApproved,
      'Rejected': styles.statusRejected
    };
    return statusStyles[status] || styles.statusDefault;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          <h2>Access Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/posts')} 
            className={styles.backButton}
          >
            Go Back to Posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.approvalsContainer}>
      <header className={styles.header}>
        <h1>Application Approvals</h1>
        <div className={styles.stats}>
          <span className={styles.statItem}>Total: {applications.length}</span>
          <span className={styles.statItem}>Filtered: {filteredApplications.length}</span>
        </div>
      </header>

      {/* Type Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Type:</span>
          <button 
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('all')}
          >
            All Types
          </button>
          <button 
            className={filter === 'Account_Verification' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('Account_Verification')}
          >
            Account Verification
          </button>
          <button 
            className={filter === 'Org_Verification' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('Org_Verification')}
          >
            Organization
          </button>
          <button 
            className={filter === 'Collector_Privilege' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('Collector_Privilege')}
          >
            Collector
          </button>
        </div>
        
        {/* Status Filters */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status:</span>
          <button 
            className={statusFilter === 'all' ? styles.filterActive : styles.filterButton}
            onClick={() => setStatusFilter('all')}
          >
            All Statuses
          </button>
          <button 
            className={statusFilter === 'Pending' ? styles.filterActive : styles.filterButton}
            onClick={() => setStatusFilter('Pending')}
          >
            Pending
          </button>
          <button 
            className={statusFilter === 'Submitted' ? styles.filterActive : styles.filterButton}
            onClick={() => setStatusFilter('Submitted')}
          >
            Submitted
          </button>
          <button 
            className={statusFilter === 'Approved' ? styles.filterActive : styles.filterButton}
            onClick={() => setStatusFilter('Approved')}
          >
            Approved
          </button>
          <button 
            className={statusFilter === 'Rejected' ? styles.filterActive : styles.filterButton}
            onClick={() => setStatusFilter('Rejected')}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* White container wrapper for the applications grid */}
      <div className={styles.applicationsContainer}>
        <div className={styles.applicationsGrid}>
          {filteredApplications.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No applications found matching your filters</p>
            </div>
          ) : (
            filteredApplications.map(application => (
              <div key={application.applicationID} className={styles.applicationCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.applicationType}>
                    {application.applicationType.replace(/_/g, ' ')}
                  </span>
                  <span className={`${styles.statusBadge} ${getStatusBadge(application.status)}`}>
                    {application.status}
                  </span>
                </div>
                
                <div className={styles.cardBody}>
                  <p className={styles.applicantInfo}>
                    <strong>Submitted by:</strong> {getUserDisplay(application.userID)}
                  </p>
                  {application.organizationName && (
                    <p className={styles.applicantInfo}>
                      <strong>Organization:</strong> {application.organizationName}
                    </p>
                  )}
                  {application.justification && (
                    <p className={styles.justification}>
                      <strong>Reason:</strong> {application.justification}
                    </p>
                  )}
                  <p className={styles.applicationDate}>
                    <strong>Submitted:</strong> {formatDate(application.submittedAt)}
                  </p>
                  {application.reviewedAt && (
                    <p className={styles.applicationDate}>
                      <strong>Reviewed:</strong> {formatDate(application.reviewedAt)}
                    </p>
                  )}
                  {application.reviewedBy && (
                    <p className={styles.applicantInfo}>
                      <strong>Reviewed by:</strong> {getUserDisplay(application.reviewedBy, true)}
                    </p>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => setSelectedApplication(application)}
                  >
                    View Details
                  </button>
                  {(application.status === 'Submitted') && (
                    <>
                      <button 
                        className={styles.approveButton}
                        onClick={() => handleApprove(application.applicationID)}
                      >
                        Approve
                      </button>
                      <button 
                        className={styles.rejectButton}
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason) {
                            handleReject(application.applicationID, reason);
                          }
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Application Details Modal with ModalPortal wrapper */}
      {selectedApplication && (
        <ModalPortal>
          <div className={styles.modalBackdrop} onClick={() => setSelectedApplication(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h2>Application Details</h2>
                  <button onClick={() => setSelectedApplication(null)} className={styles.closeButton}>×</button>
                </div>
                
                <div className={styles.detailsContent}>
                  <p><strong>Application ID:</strong> {selectedApplication.applicationID}</p>
                  <p><strong>Type:</strong> {selectedApplication.applicationType.replace(/_/g, ' ')}</p>
                  <p><strong>Submitted by:</strong> {getUserDisplay(selectedApplication.userID)}</p>
                  <p>
                    <strong>Status:</strong> 
                    <span className={`${styles.statusBadge} ${getStatusBadge(selectedApplication.status)}`}>
                      {selectedApplication.status}
                    </span>
                  </p>
                  <p><strong>Submitted:</strong> {formatDate(selectedApplication.submittedAt)}</p>
                  
                  {selectedApplication.reviewedAt && (
                    <>
                      <p><strong>Reviewed:</strong> {formatDate(selectedApplication.reviewedAt)}</p>
                      <p><strong>Reviewed By:</strong> {getUserDisplay(selectedApplication.reviewedBy, true)}</p>
                    </>
                  )}
                  
                  {selectedApplication.organizationName && (
                    <p><strong>Organization Name:</strong> {selectedApplication.organizationName}</p>
                  )}
                  
                  {selectedApplication.justification && (
                    <div className={styles.justificationDetail}>
                      <strong>Justification:</strong>
                      <p>{selectedApplication.justification}</p>
                    </div>
                  )}
                  
                  {selectedApplication.documents && selectedApplication.documents.length > 0 && (
                    <div className={styles.documentsSection}>
                      <strong>Documents:</strong>
                      <ul>
                        {selectedApplication.documents.map((doc, index) => {
                          // Ensure the URL points to the backend server
                          let documentUrl = doc;
                          
                          // If it's a relative path, prepend the server URL
                          if (!doc.startsWith('http')) {
                            documentUrl = `http://localhost:3001${doc.startsWith('/') ? doc : '/' + doc}`;
                          }
                          
                          return (
                            <li key={index}>
                              <a 
                                href={documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.open(documentUrl, '_blank');
                                }}
                              >
                                Document {index + 1}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className={styles.modalActions}>
                  {selectedApplication.status === 'Pending' && (
                    <>
                      <button 
                        className={styles.approveButton}
                        onClick={() => handleApprove(selectedApplication.applicationID)}
                      >
                        Approve
                      </button>
                      <button 
                        className={styles.rejectButton}
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason) {
                            handleReject(selectedApplication.applicationID, reason);
                          }
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button className={styles.cancelButton} onClick={() => setSelectedApplication(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Approvals;