import React from 'react';
import styles from './ApplicationStatusTracker.module.css';
import ModalPortal from '../common/ModalPortal';

const ApplicationStatusTracker = ({ application, onClose }) => {
  const getStatusSteps = (applicationType) => {
    const baseSteps = [
      { status: 'Submitted', label: 'Application Submitted' },
      { status: 'Under Review', label: 'Under Review' },
      { status: 'Approved', label: 'Approved' },
      { status: 'Rejected', label: 'Rejected' }
    ];

    if (applicationType === 'Account_Verification') {
      baseSteps[0].label = 'Verification Documents Submitted';
      baseSteps[2].label = 'Account Verified';
    } else if (applicationType === 'Org_Verification') {
      baseSteps[0].label = 'Organization Application Submitted';
      baseSteps[2].label = 'Organization Approved';
    } else if (applicationType === 'Collector_Privilege') {
      baseSteps[0].label = 'Collector Application Submitted';
      baseSteps[2].label = 'Collector Status Granted';
    }

    return baseSteps;
  };

  const getCurrentStepIndex = (status) => {
    switch (status) {
      case 'Submitted':
      case 'Pending':
        return 0;
      case 'Under Review':
        return 1;
      case 'Approved':
        return 2;
      case 'Rejected':
        return 3;
      default:
        return 0;
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    
    // Handle Firestore Timestamp objects
    let dateObj;
    
    if (date.seconds) {
      // Firestore Timestamp format
      dateObj = new Date(date.seconds * 1000);
    } else if (date.toDate && typeof date.toDate === 'function') {
      // Firestore Timestamp with toDate method
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      // String date
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      // Already a Date object
      dateObj = date;
    } else {
      // Try to parse it anyway
      dateObj = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Date not available';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!application) return null;

  const steps = getStatusSteps(application.applicationType);
  const currentStepIndex = getCurrentStepIndex(application.status);
  const isRejected = application.status === 'Rejected';

  return (
    <ModalPortal>
      <div className={styles.modalBackdrop} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Application Status</h2>
              <button className={styles.closeButton} onClick={onClose}>
                ×
              </button>
            </div>

            <div className={styles.trackerContainer}>
              <div className={styles.applicationInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Application Type:</span>
                  <span className={styles.value}>
                    {application.applicationType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Application ID:</span>
                  <span className={styles.value}>{application.applicationID}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Current Status:</span>
                  <span className={`${styles.statusBadge} ${styles[application.status.toLowerCase().replace(' ', '')]}`}>
                    {application.status}
                  </span>
                </div>
              </div>

              <div className={styles.timeline}>
                {steps.map((step, index) => {
                  const isActive = index === currentStepIndex;
                  const isCompleted = index < currentStepIndex && !isRejected;
                  const isRejectedStep = isRejected && index === 3;
                  
                  return (
                    <div key={index} className={styles.timelineItem}>
                      <div className={`${styles.timelineNode} ${
                        isCompleted ? styles.completed : 
                        isActive ? styles.active : 
                        isRejectedStep ? styles.rejected : ''
                      }`}>
                        <div className={styles.nodeIcon}>
                          {isCompleted ? '✓' : isRejectedStep ? '×' : step.icon}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`${styles.timelineLine} ${
                            isCompleted ? styles.lineCompleted : ''
                          }`} />
                        )}
                      </div>
                      <div className={styles.timelineContent}>
                        <h4 className={styles.stepTitle}>{step.label}</h4>
                        {isActive && (
                          <p className={styles.stepDate}>
                            {formatDate(
                              index === 0 ? application.submittedAt : 
                              index === currentStepIndex ? application.reviewedAt || new Date() : 
                              null
                            )}
                          </p>
                        )}
                        {isCompleted && index === 0 && (
                          <p className={styles.stepDate}>
                            {formatDate(application.submittedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {application.justification && (
                <div className={styles.justificationSection}>
                  <h4>Additional Information</h4>
                  <p>{application.justification}</p>
                </div>
              )}

              {application.documents && application.documents.length > 0 && (
                <div className={styles.documentsSection}>
                  <h4>Submitted Documents</h4>
                  <ul className={styles.documentsList}>
                    {application.documents.map((doc, index) => {
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
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ApplicationStatusTracker;