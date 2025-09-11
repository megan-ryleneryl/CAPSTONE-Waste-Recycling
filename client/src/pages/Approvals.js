import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './Approvals.module.css';

const Approvals = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3001/api/admin/applications/pending',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setApplications(response.data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
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
      
      if (response.data.success) {
        alert('Application approved successfully!');
        fetchApplications();
        setSelectedApplication(null);
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application');
    }
  };

  const handleReject = async (applicationId, reason) => {
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
      
      if (response.data.success) {
        alert('Application rejected');
        fetchApplications();
        setSelectedApplication(null);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application');
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.applicationType === filter;
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading applications...</p>
      </div>
    );
  }

  return (
    <div className={styles.approvalsContainer}>
      <header className={styles.header}>
        <h1>Application Approvals</h1>
        <div className={styles.filters}>
          <button 
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('all')}
          >
            All ({applications.length})
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
      </header>

      <div className={styles.applicationsGrid}>
        {filteredApplications.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No pending applications</p>
          </div>
        ) : (
          filteredApplications.map(application => (
            <div key={application.applicationID} className={styles.applicationCard}>
              <div className={styles.cardHeader}>
                <span className={styles.applicationType}>
                  {application.applicationType.replace(/_/g, ' ')}
                </span>
                <span className={styles.applicationDate}>
                  {new Date(application.submittedAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className={styles.cardBody}>
                <p className={styles.applicantInfo}>
                  <strong>User ID:</strong> {application.userID}
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
              </div>

              <div className={styles.cardActions}>
                <button 
                  className={styles.viewButton}
                  onClick={() => setSelectedApplication(application)}
                >
                  View Details
                </button>
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
              </div>
            </div>
          ))
        )}
      </div>

      {selectedApplication && (
        <div className={styles.modalOverlay} onClick={() => setSelectedApplication(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Application Details</h2>
            <div className={styles.detailsContent}>
              <p><strong>Application ID:</strong> {selectedApplication.applicationID}</p>
              <p><strong>Type:</strong> {selectedApplication.applicationType}</p>
              <p><strong>User ID:</strong> {selectedApplication.userID}</p>
              <p><strong>Submitted:</strong> {new Date(selectedApplication.submittedAt).toLocaleString()}</p>
              {selectedApplication.justification && (
                <p><strong>Justification:</strong> {selectedApplication.justification}</p>
              )}
              {selectedApplication.documents && selectedApplication.documents.length > 0 && (
                <div>
                  <strong>Documents:</strong>
                  <ul>
                    {selectedApplication.documents.map((doc, index) => (
                      <li key={index}>
                        <a href={doc} target="_blank" rel="noopener noreferrer">
                          Document {index + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button className={styles.closeButton} onClick={() => setSelectedApplication(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;