import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Profile.module.css';
import ModalPortal from '../components/modal/ModalPortal';
import DeleteAccountModal from '../components/profile/DeleteAccountModal/DeleteAccountModal';
import ApplicationStatusTracker from '../components/profile/ApplicationStatusTracker/ApplicationStatusTracker';
import PreferredTimesModal from '../components/profile/PreferredTimesModal';
import PreferredLocationsModal from '../components/profile/PreferredLocationsModal';

// Component for Organization Application Form
const OrganizationForm = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    organizationName: '',
    reason: '',
    proofDocument: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, proofDocument: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <button onClick={onClose} className={styles.closeButton}>×</button>
            <h2>Apply for Org Account</h2>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Organization Name</label>
              <input
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Reason for applying</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className={styles.textarea}
                rows="5"
                placeholder="Explain why your organization wants to join..."
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Proof of Organization Membership</label>
              <input
                type="file"
                onChange={handleFileChange}
                className={styles.fileInput}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </div>

            <button type="submit" className={styles.submitButton}>
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Component for Collector Application Form
const CollectorForm = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    businessJustification: '',
    mrfProof: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, mrfProof: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <button onClick={onClose} className={styles.closeButton}>×</button>
            <h2>Apply to be a Collector</h2>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Business justification</label>
              <textarea
                name="businessJustification"
                value={formData.businessJustification}
                onChange={handleInputChange}
                className={styles.textarea}
                rows="5"
                placeholder="Explain why you want to become a collector..."
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Proof of Business Identity (Document Upload)</label>
              <input
                type="file"
                onChange={handleFileChange}
                className={styles.fileInput}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </div>

            <button type="submit" className={styles.submitButton}>
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Component for Uploading Verification Documents
const VerificationForm = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    identityProof: null
  });

  const handleFileChange = (e) => {
    setFormData({ ...formData, identityProof: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <button onClick={onClose} className={styles.closeButton}>×</button>
            <h2>Upload Proof of Identity for Verification</h2>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Proof of Identity (Document Upload)</label>
              <input
                type="file"
                onChange={handleFileChange}
                className={styles.fileInput}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </div>

            <button type="submit" className={styles.submitButton}>
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Component for Edit Profile Form
const EditProfileForm = ({ user, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    profilePicture: null
  });
  
  // Construct the initial profile picture URL
  const getInitialPictureUrl = () => {
    const pictureField = user?.profilePictureUrl || user?.profilePicture;
    if (!pictureField) return null;
    
    if (pictureField.startsWith('http')) {
      return pictureField;
    }
    
    const baseUrl = 'http://localhost:3001';
    const pictureUrl = pictureField.startsWith('/') 
      ? pictureField 
      : '/' + pictureField;
    
    return baseUrl + pictureUrl;
  };
  
  const [previewUrl, setPreviewUrl] = useState(getInitialPictureUrl());
  const fileInputRef = useRef(null);

  // Format phone number: 09XX XXX XXXX
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 11 digits
    const limited = digits.slice(0, 11);
    
    // Format as 09XX XXX XXXX
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 4)} ${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7)}`;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Ensure it starts with 09
      let phoneValue = value.replace(/\D/g, ''); // Remove non-digits
      
      if (phoneValue.length > 0 && !phoneValue.startsWith('09')) {
        // If user tries to type something other than 09 at the start
        if (phoneValue.length === 1 && phoneValue !== '0') {
          phoneValue = '09' + phoneValue;
        } else if (phoneValue.length === 2 && !phoneValue.startsWith('09')) {
          phoneValue = '09' + phoneValue.slice(1);
        }
      }
      
      const formatted = formatPhoneNumber(phoneValue);
      setFormData({ ...formData, [name]: formatted });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPEG, PNG, or GIF)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      setFormData({ ...formData, profilePicture: file });
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 11) {
      alert('Phone number must be exactly 11 digits');
      return;
    }
    if (phoneDigits && !phoneDigits.startsWith('09')) {
      alert('Phone number must start with 09');
      return;
    }
    
    // Create FormData for file upload
    const submitData = new FormData();
    submitData.append('firstName', formData.firstName);
    submitData.append('lastName', formData.lastName);
    submitData.append('phone', formData.phone);
    
    if (formData.profilePicture) {
      submitData.append('profilePicture', formData.profilePicture);
    }
    
    onSubmit(submitData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <button onClick={onClose} className={styles.closeButton}>×</button>
            <h2>Edit Profile</h2>
          </div>
          
          {/* Profile Picture Section */}
          <div className={styles.profilePictureSection}>
            <div className={styles.profilePictureContainer}>
              {previewUrl ? (
                <img 
                  key={previewUrl}
                  src={previewUrl} 
                  alt="Profile" 
                  className={styles.profilePicturePreview}
                  onError={(e) => {
                    console.error('Preview image failed to load:', e.target.src);
                    // If the current profile picture fails to load, show placeholder
                    setPreviewUrl(null);
                  }}
                />
              ) : (
                <div className={styles.profilePicturePlaceholder}>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="40" fill="#E0E0E0"/>
                    <circle cx="40" cy="30" r="15" fill="#666"/>
                    <ellipse cx="40" cy="65" rx="25" ry="20" fill="#666"/>
                  </svg>
                </div>
              )}
              <button 
                type="button" 
                className={styles.changePictureButton}
                onClick={triggerFileInput}
              >
                Change Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="09XX XXX XXXX"
                maxLength="13" // Account for spaces in formatting
              />
              <small className={styles.helpText}>
                Philippine mobile number (11 digits starting with 09)
              </small>
            </div>

            <button type="submit" className={styles.saveButton}>
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Application Selector Component
const ApplicationSelector = ({ applications, onSelect, onClose }) => {
  
  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return 'Date not available';
    
    // Handle Firestore Timestamp objects
    let dateObj;
    
    if (date?.seconds) {
      // Firestore Timestamp format
      dateObj = new Date(date.seconds * 1000);
    } else if (date?.toDate && typeof date.toDate === 'function') {
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
      year: 'numeric'
    });
  };

  return (
    <ModalPortal>
      <div className={styles.modalBackdrop} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Your Applications</h2>
              <button className={styles.closeButton} onClick={onClose}>×</button>
            </div>
            
            <div className={styles.applicationsList}>
              {applications.length === 0 ? (
                <p className={styles.emptyMessage}>No applications found</p>
              ) : (
                applications.map((app, index) => (
                  <div 
                    key={app.applicationID}
                    className={styles.applicationItem}
                    onClick={() => onSelect(app)}
                  >
                    <div className={styles.appItemHeader}>
                      <span className={styles.appType}>
                        {app.applicationType.replace(/_/g, ' ')}
                      </span>
                      <span className={`${styles.appStatus} ${styles[app.status.toLowerCase()]}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className={styles.appItemDate}>
                      Submitted: {formatDate(app.submittedAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

// Main Profile Component
const Profile = ({ user: propsUser }) => {
  const [user, setUser] = useState(propsUser || null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [userApplications, setUserApplications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApplicationSelector, setShowApplicationSelector] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const fetchUserApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3001/api/protected/profile/applications',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.success && response.data.applications) {
        setUserApplications(response.data.applications);
        // Don't automatically set submitted application for new users
        // Only set it when user clicks to view
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        navigate('/login');
        return;
      }

      setError('');

      try {
        const response = await axios.get('http://localhost:3001/api/protected/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success) {
          const profileData = response.data.user;
          setUser({
            ...profileData,
            preferredTimes: profileData.preferredTimes || [],
            preferredLocations: profileData.preferredLocations || []
          });
          localStorage.setItem('user', JSON.stringify(profileData));
        }
      } catch (apiError) {
        console.log('Using cached user data');
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Helper function to construct full image URL
  const getProfilePictureUrl = useCallback(() => {
    // First check profilePictureUrl (standard field), then profilePicture (legacy)
    const pictureField = user?.profilePictureUrl || user?.profilePicture;
    if (!pictureField) return null;
    
    // If it's already a full URL (http/https), return as is
    if (pictureField.startsWith('http')) {
      return pictureField;
    }
    
    // If it's a relative path, prepend the server URL
    const baseUrl = 'http://localhost:3001';
    const pictureUrl = pictureField.startsWith('/') 
      ? pictureField 
      : '/' + pictureField;
    
    return baseUrl + pictureUrl;
  }, [user]);

  // Use effect to update profilePictureUrl when user changes
  useEffect(() => {
    setProfilePictureUrl(getProfilePictureUrl());
  }, [user, getProfilePictureUrl]);

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Call the delete endpoint
      const response = await axios.delete(
        'http://localhost:3001/api/protected/profile/account',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('rememberedUser');
        
        // Redirect to landing page
        alert('Your account has been deleted successfully.');
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
      setShowDeleteModal(false);
    }
  };

  // useEffect hooks
  useEffect(() => {
    fetchUserProfile();
    fetchUserApplications();
  }, [fetchUserProfile]);

  // Handle body scroll lock
  useEffect(() => {
    if (activeModal) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Optional: Hide navigation with class
      document.body.classList.add('modal-open');
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [activeModal]);

  // Close modal when clicking backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setActiveModal(null);
      setShowStatusTracker(false);
      setShowDeleteModal(false);
      setShowApplicationSelector(false);
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && activeModal) {
        setActiveModal(null);
      }
    };
    
    if (activeModal) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [activeModal]);

    const handleEditSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      if (formData instanceof FormData) {
        // Handle profile picture upload if present
        if (formData.get('profilePicture')) {
          try {
            const pictureResponse = await axios.post(
              'http://localhost:3001/api/protected/upload/profile-picture',
              formData,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
            
            if (pictureResponse.data.success) {
              const updatedUser = pictureResponse.data.user;
              
              // Update local state
              setUser(updatedUser);
              setProfilePictureUrl(updatedUser.profilePicture || updatedUser.profilePictureUrl);
              
              // Update localStorage
              localStorage.setItem('user', JSON.stringify(updatedUser));
              
              // Update auth context for TopNav refresh
              if (refreshUser) {
                refreshUser(); // This will trigger AuthContext to refresh
              }
            }
          } catch (uploadError) {
            console.error('Error uploading profile picture:', uploadError);
            alert('Failed to upload profile picture');
            return;
          }
        }
        
        // Now update the text fields
        const updateData = {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          phone: formData.get('phone')
        };
        
        const response = await axios.put(
          'http://localhost:3001/api/protected/profile',
          updateData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.success) {
          const updatedUser = { ...response.data.user };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Update auth context
          if (refreshUser) {
            refreshUser();
          }
          
          setActiveModal(null);
          setError('');
          alert('Profile updated successfully!');
          
          // Refresh profile to get latest data
          fetchUserProfile();
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    }
  };

  const handleCollectorSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('businessJustification', formData.businessJustification);
      if (formData.mrfProof) {
        uploadData.append('mrfProof', formData.mrfProof);
      }
      
      const response = await axios.post(
        'http://localhost:3001/api/protected/profile/apply-collector',
        uploadData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setActiveModal(null);
        setSubmittedApplication(response.data.application);
        setShowStatusTracker(true);
        setError('');
        alert('Collector application submitted successfully! Please wait for approval.');
        fetchUserProfile();
        fetchUserApplications();
      }
    } catch (error) {
      console.error('Error submitting collector application:', error);
      console.error('Response data:', error.response?.data);
      
      let errorMessage = 'Failed to submit application';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      }
  };

  const handleOrganizationSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('organizationName', formData.organizationName);
      uploadData.append('reason', formData.reason);
      if (formData.proofDocument) {
        uploadData.append('proofDocument', formData.proofDocument);
      }
      
      const response = await axios.post(
        'http://localhost:3001/api/protected/profile/apply-organization',
        uploadData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setActiveModal(null);
        setSubmittedApplication(response.data.application);
        setShowStatusTracker(true);
        setError('');

        // Update user state to reflect organization status
        setUser(prevUser => ({
          ...prevUser,
          isOrganization: true,
          organizationName: formData.organizationName
        }));
        
        // Update localStorage
        const updatedUser = {
          ...user,
          isOrganization: true,
          organizationName: formData.organizationName
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        alert('Organization application submitted successfully! Please wait for approval.');
        fetchUserProfile();
        fetchUserApplications();
      }
    } catch (error) {
      console.error('Error submitting organization application:', error);
      console.error('Response data:', error.response?.data);
      
      let errorMessage = 'Failed to submit application';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleVerificationSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Create FormData for file upload
      const uploadData = new FormData();
      if (formData.identityProof) {
        uploadData.append('proofDocument', formData.identityProof);
      } else {
        alert('Please select a document to upload');
        return;
      }
      
      const response = await axios.post(
        'http://localhost:3001/api/protected/profile/verification',
        uploadData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setActiveModal(null);
        setSubmittedApplication(response.data.application);
        setShowStatusTracker(true);
        setError(''); // Clear any existing errors
        alert('Verification application submitted successfully! Please wait for approval.');
        
        // Update local user state immediately to reflect the status change
        const updatedUser = { ...user, status: 'Submitted' };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      
        // Refresh profile to reflect submitted status
        fetchUserProfile();
        fetchUserApplications();
      }
    } catch (error) {
      console.error('Error submitting verification application:', error);
      console.error('Response data:', error.response?.data);
      
      let errorMessage = 'Failed to submit application';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      }
  };

  const handlePreferredTimesSubmit = async (times) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:3001/api/protected/profile',
        { preferredTimes: times },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // If backend returns updated user, use it
        const updatedUser = response.data.user || { ...user, preferredTimes: times };
        
        // Update local state with backend response
        setUser(updatedUser);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Close modal
        setActiveModal(null);
      }
    } catch (error) {
      console.error('Error updating preferred times:', error);
      setError('Failed to update preferred times');
    }
  };

  const handlePreferredLocationsSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Extract the preferredLocations from FormData
      const locationsJSON = formData.get('preferredLocations');
      const locations = JSON.parse(locationsJSON);
      
      // Send to backend
      const response = await axios.put(
        'http://localhost:3001/api/protected/profile',
        { preferredLocations: locations },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'  // Use JSON since we're sending parsed data
          }
        }
      );

      if (response.data.success) {
        // If backend returns updated user, use it
        const updatedUser = response.data.user || { ...user, preferredLocations: locations };
        
        // Update local state with backend response
        setUser(updatedUser);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Close modal
        setActiveModal(null);
      }
    } catch (error) {
      console.error('Error updating preferred locations:', error);
      setError('Failed to update preferred locations');
      alert('Failed to save locations. Please try again.');
    }
  };

  const hasPendingCollectorApplication = () => {
    return userApplications.some(app => 
      app.applicationType === 'Collector_Privilege' && 
      (app.status === 'Pending' || app.status === 'Submitted')
    );
  };

  const hasPendingOrganizationApplication = () => {
    return userApplications.some(app => 
      app.applicationType === 'Org_Verification' && 
      (app.status === 'Pending' || app.status === 'Submitted')
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return <div>No user data found</div>;
  }

  return (
    <div className={styles.container}>
        {/* Main Content */}
          <div className={styles.profileCard}>
            {/* Profile Header */}
            <div className={styles.profileHeader}>
              <div className={styles.profileAvatar}>
                {profilePictureUrl ? (
                  <img 
                    src={profilePictureUrl}
                    alt={`${user?.firstName} ${user?.lastName}`}
                    className={styles.avatarImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector(`.${styles.avatarFallback}`);
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className={styles.avatarFallback} 
                  style={profilePictureUrl ? {display: 'none'} : {}}
                >
                  {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()}
                </div>
              </div>
              
              <div className={styles.profileInfo}>
                <div className={styles.profileDetails}>
                  <h2>
                    {user.firstName} {user.lastName}
                  </h2>
                  
                  {/* Display organization name if user is an organization */}
                  {user?.isOrganization && user?.organizationName && (
                    <p className={styles.organizationName}>
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        style={{ marginRight: '8px' }}
                      >
                        <path d="M3 21h18"/>
                        <path d="M5 21V7l8-4v18"/>
                        <path d="M19 21V11l-6-4"/>
                        <rect x="9" y="9" width="4" height="4"/>
                        <rect x="9" y="14" width="4" height="4"/>
                      </svg>
                      {user.organizationName}
                    </p>
                  )}
                  
                  <p className={styles.email}>{user?.email}</p>
                  
                  {user?.phone && (
                    <p className={styles.phone}>
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        style={{ marginRight: '8px' }}
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      {user.phone}
                    </p>
                  )}
                  
                  <div className={styles.badgesContainer}>
                    {/* User Status Badge */}
                    <span className={`${styles.badge} ${styles[`status${user?.status || 'Pending'}`]}`}>
                      {user?.status === 'Verified' ? 'Verified' :
                      user?.status === 'Submitted' ? 'Submitted' :
                      user?.status === 'Suspended' ? 'Suspended' :
                      user?.status === 'Rejected' ? 'Rejected' : 'Pending'}
                    </span>
                    
                    {/* Giver Badge - All users have this */}
                    <span className={`${styles.badge} ${styles.roleGiver}`}>
                      Giver
                    </span>
                    
                    {/* Collector Badge */}
                    {user?.isCollector && (
                      <span className={`${styles.badge} ${styles.roleCollector}`}>
                        Collector
                      </span>
                    )}
                    
                    {/* Admin Badge */}
                    {user?.isAdmin && (
                      <span className={`${styles.badge} ${styles.roleAdmin}`}>
                        Admin
                      </span>
                    )}
                    
                    {/* Organization Badge */}
                    {user?.isOrganization && (
                      <span className={`${styles.badge} ${styles.roleOrganization}`}>
                        Organization
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={styles.profileActions}>
                  <div className={styles.iconButtonGroup}>
                    <button
                      className={styles.iconButton}
                      onClick={() => setActiveModal('edit')}
                      title="Edit Profile"
                    >
                      <Pencil size={20} />
                    </button>

                    <button
                      className={styles.iconButtonDelete}
                      onClick={() => {
                        setActiveModal(null);
                        setShowDeleteModal(true);
                      }}
                      title="Delete Account"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {userApplications.length > 0 && (
                    <button
                      className={styles.statusButton}
                      onClick={() => {
                        if (userApplications.length === 1) {
                          // If only one application, show it directly
                          setSubmittedApplication(userApplications[0]);
                          setShowStatusTracker(true);
                        } else {
                          // Show selector for multiple applications
                          setShowApplicationSelector(true);
                        }
                      }}
                    >
                      View Application Status ({userApplications.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span>Points: {user.points || 0}</span>
              </div>
              <div className={styles.statItem}>
                <strong>{user.totalDonations || '0'}</strong> kg Donations
              </div>
            </div>

            {/* Preferences Section */}
            <div className={styles.preferencesSection}>
              <h3 className={styles.sectionTitle}>Pickup Preferences</h3>
              
              <div className={styles.preferencesContent}>
                {/* Preferred Times */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceHeader}>
                    <h4>Preferred Pickup Times</h4>
                    <button 
                      onClick={() => setActiveModal('preferredTimes')}
                      className={styles.editPreferenceButton}
                    >
                      {user?.preferredTimes?.length > 0 ? 'Edit' : 'Set Times'}
                    </button>
                  </div>
                  <div className={styles.preferenceValue}>
                    {user?.preferredTimes?.length > 0 ? (
                      <ul className={styles.preferenceList}>
                        {user.preferredTimes.map((time, index) => (
                          <li key={index}>
                            {time.day}: {time.startTime}
                            {time.startTime !== 'Flexible' && (
                              <> - {time.endTime}</>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.noPreference}>Add your preferred times to get started</p>
                    )}
                  </div>
                </div>

                {/* Preferred Locations */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceHeader}>
                    <h4>Preferred Pickup Locations</h4>
                    <button 
                      onClick={() => setActiveModal('preferredLocations')}
                      className={styles.editPreferenceButton}
                    >
                      {user?.preferredLocations?.length > 0 ? 'Edit' : 'Set Locations'}
                    </button>
                  </div>
                  <div className={styles.preferenceValue}>
                    {user?.preferredLocations?.length > 0 ? (
                      <ul className={styles.preferenceList}>
                        {user.preferredLocations.map((location, index) => {
                          // Handle both old string format and new structured format
                          if (typeof location === 'string') {
                            return <li key={index}>{location}</li>;
                          }
                          
                          // New structured format
                          return (
                            <li key={index}>
                              <div>
                                <strong>{location.name}</strong>
                                <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                                  {location.addressLine}
                                </div>
                                <div style={{ fontSize: '0.8em', color: '#999', marginTop: '2px' }}>
                                  {location.barangay?.name && (
                                    <>
                                      {location.barangay.name}, {location.city?.name}
                                      {location.province?.name && location.province.name !== 'NCR' && (
                                        <>, {location.province.name}</>
                                      )}
                                      {location.region?.name && (
                                        <>, {location.region.name}</>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className={styles.noPreference}>Add your preferred locations to get started</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action Cards */}
            <div className={styles.ctaSection}>
              {user.status === 'Pending' && (
                <div className={styles.ctaCard}>
                  <p>Submit your proof of identity and unlock the posting, commenting, and chat features!</p>
                  <button 
                    className={styles.ctaButton}
                    onClick={() => setActiveModal('verification')}
                  >
                    Verify Your Account
                  </button>
                </div>
              )}
              
              {!user.isCollector && !user.isAdmin && !hasPendingCollectorApplication() && (
                <div className={styles.ctaCard}>
                  <p>Join EcoTayo as a Collector and help close the loop on recycling in your community. Claim posts, manage pickups, and turn waste into a resource. Apply now and start earning points for every successful collection!</p>
                  <button 
                    className={styles.ctaButton}
                    onClick={() => setActiveModal('collector')}
                  >
                    Apply to be a Collector
                  </button>
                </div>
              )}

              {!user.isOrganization && !hasPendingOrganizationApplication() && (
                <div className={styles.ctaCard}>
                  <p>Join EcoTayo as a Verified Organization and connect directly with thousands of givers. Showcase your projects and build your reputation by making Initiative Posts.</p>
                  <button 
                    className={styles.ctaButton}
                    onClick={() => setActiveModal('organization')}
                  >
                    Apply for an Org Account
                  </button>
                </div>
              )}

              {(!user.isCollector && !user.isAdmin && !hasPendingCollectorApplication()) || (!user.isOrganization && !hasPendingOrganizationApplication()) ? (
                <p className={styles.ctaNote}>
                  <strong>Note:</strong> These preferences help collectors schedule pickups more conveniently. If you're applying for <strong>verification or collector status</strong>, your application requires admin approval before your account status changes.
                </p>
              ) : null}
            </div>

            {/* Badges Section */}
            {/* <div className={styles.badgesSection}>
              <h3>Badges:</h3>
                <div className={styles.badgesList}>
                  {user.badges && user.badges.length > 0 ? (
                    user.badges.map((badge, index) => (
                      <div key={index} className={styles.badge}>
                        {badge.name || badge}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className={styles.badgePlaceholder}></div>
                      <div className={styles.badgePlaceholder}></div>
                      <div className={styles.badgePlaceholder}></div>
                    </>
                  )}
                </div>
            </div> */}
          </div>

      {/* MODALS RENDERED THROUGH PORTAL */}
      
      {/* 1. Active Modal Forms (Edit, Verification, Collector, Organization) */}
      {activeModal && (
        <ModalPortal>
          <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalContent}>
                {activeModal === 'edit' && (
                  <EditProfileForm 
                    user={user}
                    onClose={() => setActiveModal(null)}
                    onSubmit={handleEditSubmit}
                  />
                )}

                {activeModal === 'verification' && (
                  <VerificationForm
                    onClose={() => setActiveModal(null)}
                    onSubmit={handleVerificationSubmit} 
                  />
                )}
                
                {activeModal === 'collector' && (
                  <CollectorForm
                    onClose={() => setActiveModal(null)}
                    onSubmit={handleCollectorSubmit} 
                  />
                )}

                {activeModal === 'organization' && (
                  <OrganizationForm
                    onClose={() => setActiveModal(null)}
                    onSubmit={handleOrganizationSubmit}
                  />
                )}

                {activeModal === 'preferredTimes' && (
                  <PreferredTimesModal
                    onClose={() => setActiveModal(null)}
                    onSubmit={handlePreferredTimesSubmit}
                    currentTimes={user?.preferredTimes || []}
                  />
                )}

                {activeModal === 'preferredLocations' && (
                  <PreferredLocationsModal
                    onClose={() => setActiveModal(null)}
                    onSubmit={handlePreferredLocationsSubmit}
                    currentLocations={user?.preferredLocations || []}
                  />
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 2. Application Selector Modal */}
      {showApplicationSelector && (
        <ApplicationSelector
          applications={userApplications}
          onSelect={(app) => {
            setSubmittedApplication(app);
            setShowApplicationSelector(false);
            setShowStatusTracker(true);
          }}
          onClose={() => setShowApplicationSelector(false)}
        />
      )}

      {/* 3. Application Status Tracker Modal */}
      {showStatusTracker && submittedApplication && (
        <ApplicationStatusTracker
          application={submittedApplication}
          onClose={() => {
            setShowStatusTracker(false);
            setSubmittedApplication(null);
          }}
        />
      )}

      {/* 4. Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
};

export default Profile;