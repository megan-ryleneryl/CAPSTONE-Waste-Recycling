import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pencil, Trash2, MapPin, Sprout, Recycle, TrendingUp, Heart, Leaf, Trophy, Users, Package, Plus, Trees, Droplets, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import styles from './Profile.module.css';
import ModalPortal from '../components/modal/ModalPortal';
import DeleteAccountModal from '../components/profile/DeleteAccountModal/DeleteAccountModal';
import ApplicationStatusTracker from '../components/profile/ApplicationStatusTracker/ApplicationStatusTracker';
import PreferredTimesModal from '../components/profile/PreferredTimesModal';
import PreferredLocationsModal from '../components/profile/PreferredLocationsModal';
import UserLocationModal from '../components/profile/UserLocationModal';
import { BadgesSection } from '../components/badges';
import GuideLink from '../components/guide/GuideLink';

// Component for Organization Application Form
const OrganizationForm = ({ onClose, onSubmit }) => {
  const [requestType, setRequestType] = useState('create'); // 'create' or 'join'
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  
  const [formData, setFormData] = useState({
    requestType: 'create',
    organizationName: '',      // For 'create' requests
    targetOrganizationID: '',  // For 'join' requests
    reason: '',
    proofDocument: null
  });

  // Fetch available organizations when component mounts
  useEffect(() => {
    if (requestType === 'join') {
      fetchOrganizations();
    }
  }, [requestType]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3001/api/protected/profile/organizations/list',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        // Sort alphabetically by name
        const sorted = response.data.organizations.sort((a, b) => 
          a.organizationName.localeCompare(b.organizationName)
        );
        setOrganizations(sorted);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      alert('Failed to load organizations. Please try again.');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleRequestTypeChange = (type) => {
    setRequestType(type);
    setFormData({
      ...formData,
      requestType: type,
      organizationName: '',
      targetOrganizationID: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, proofDocument: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate based on request type
    if (requestType === 'join' && !formData.targetOrganizationID) {
      alert('Please select an organization to join');
      return;
    }
    if (requestType === 'create' && !formData.organizationName) {
      alert('Please enter an organization name');
      return;
    }
    
    onSubmit({ ...formData, requestType });
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
            <h2>Apply for Organization Account</h2>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Request Type Selection */}
            <div className={styles.formGroup}>
              <label>Request Type</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="requestType"
                    value="create"
                    checked={requestType === 'create'}
                    onChange={() => handleRequestTypeChange('create')}
                  />
                  <span>Create New Organization</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="requestType"
                    value="join"
                    checked={requestType === 'join'}
                    onChange={() => handleRequestTypeChange('join')}
                  />
                  <span>Join Existing Organization</span>
                </label>
              </div>
            </div>

            {/* Conditional Fields Based on Request Type */}
            {requestType === 'create' ? (
              <>
                {/* Organization Name Input - For Create */}
                <div className={styles.formGroup}>
                  <label>Organization Name</label>
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter your organization's name"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                {/* Organization Dropdown - For Join */}
                <div className={styles.formGroup}>
                  <label>Select Organization</label>
                  {loadingOrgs ? (
                    <p>Loading organizations...</p>
                  ) : (
                    <select
                      name="targetOrganizationID"
                      value={formData.targetOrganizationID}
                      onChange={handleInputChange}
                      className={styles.select}
                      required
                    >
                      <option value="">-- Select an organization --</option>
                      {organizations.map(org => (
                        <option key={org.organizationID} value={org.organizationID}>
                          {org.organizationName}
                        </option>
                      ))}
                    </select>
                  )}
                  {organizations.length === 0 && !loadingOrgs && (
                    <p className={styles.helpText}>
                      No organizations available. Consider creating a new one instead.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Reason - Common to both */}
            <div className={styles.formGroup}>
              <label>
                {requestType === 'create' 
                  ? 'Why are you creating this organization?' 
                  : 'Why do you want to join this organization?'}
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className={styles.textarea}
                rows="5"
                placeholder={
                  requestType === 'create'
                    ? "Explain your organization's mission and goals..."
                    : "Explain your affiliation with this organization..."
                }
                required
              />
            </div>

            {/* Proof Document - Common to both */}
            <div className={styles.formGroup}>
              <label>
                {requestType === 'create'
                  ? 'Proof of Organization Registration'
                  : 'Proof of Organization Membership'}
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className={styles.fileInput}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
              <p className={styles.helpText}>
                {requestType === 'create'
                  ? 'Upload registration documents, certificates, or official letters'
                  : 'Upload ID card, certificate, or official letter from the organization'}
              </p>
            </div>

            <button type="submit" className={styles.submitButton}>
              Submit Application
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
  const { success, showPointsEarned } = useToast();
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
  const [activeTab, setActiveTab] = useState('preferences');
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [analyticsData, setAnalyticsData] = useState({
    giverStats: {
      totalKgRecycled: 0,
      activePickups: 0,
      successfulPickups: 0,
      activeForumPosts: 0,
      totalPoints: 0
    },
    collectorStats: {
      activeWastePosts: 0,
      claimedPosts: 0,
      totalCollected: 0,
      completionRate: 0
    },
    organizationStats: {
      activeInitiatives: 0,
      totalSupporters: 0,
      materialsReceived: 0,
      topContributors: []
    }
  });
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

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3001/api/analytics/dashboard?timeRange=${selectedTimeRange}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Check and award eligible badges
  const checkAndAwardBadges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/protected/profile/check-badges',
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success && response.data.newBadges?.length > 0) {
        // Refresh user profile to get updated badges
        await fetchUserProfile();

        // Show notification for each new badge
        response.data.newBadges.forEach((badge, index) => {
          setTimeout(() => {
            success(`Badge unlocked: ${badge.badgeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
          }, index * 1000);
        });
      }
    } catch (error) {
      console.error('Error checking badges:', error);
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
            preferredLocations: profileData.preferredLocations || [],
            userLocation: profileData.userLocation || null
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
    fetchAnalyticsData();
    // Check and award any eligible badges on profile load
    checkAndAwardBadges();
  }, [fetchUserProfile]);

  // Fetch analytics when time range changes
  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [selectedTimeRange]);

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
      uploadData.append('requestType', formData.requestType);
      uploadData.append('reason', formData.reason);
      
      // Add organization-specific fields based on request type
      if (formData.requestType === 'create') {
        uploadData.append('organizationName', formData.organizationName);
      } else if (formData.requestType === 'join') {
        uploadData.append('targetOrganizationID', formData.targetOrganizationID);
      }
      
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

        // Show success toast and points popup if this is first time setting
        success('Preferred times updated successfully!');
        if (response.data.pointsAwarded) {
          showPointsEarned(1, 'Profile Completed: Preferred Times');
        }
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

        // Show success toast and points popup if this is first time setting
        success('Preferred locations updated successfully!');
        if (response.data.pointsAwarded) {
          showPointsEarned(1, 'Profile Completed: Preferred Locations');
        }
      }
    } catch (error) {
      console.error('Error updating preferred locations:', error);
      setError('Failed to update preferred locations');
    }
  };

  const handleUserLocationSubmit = async (locationData) => {
    try {
      const token = localStorage.getItem('token');

      // Send to backend
      const response = await axios.put(
        'http://localhost:3001/api/protected/profile',
        { userLocation: locationData },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // If backend returns updated user, use it
        const updatedUser = response.data.user || { ...user, userLocation: locationData };

        // Update local state with backend response
        setUser(updatedUser);

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Close modal
        setActiveModal(null);

        alert('Your recycling community has been set successfully!');
      }
    } catch (error) {
      console.error('Error updating user location:', error);
      setError('Failed to update location');
      alert('Failed to save your location. Please try again.');
    }
  };

  // Handle privacy settings toggle changes
  const handlePrivacySettingChange = async (setting, value) => {
    try {
      const token = localStorage.getItem('token');
      const newPrivacySettings = {
        ...user.privacySettings,
        [setting]: value
      };

      // If showEarnings is disabled, also disable showNameOnLeaderboard
      if (setting === 'showEarnings' && !value) {
        newPrivacySettings.showNameOnLeaderboard = false;
      }

      const response = await axios.put(
        'http://localhost:3001/api/protected/profile',
        { privacySettings: newPrivacySettings },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const updatedUser = { ...user, privacySettings: newPrivacySettings };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      alert('Failed to update privacy settings. Please try again.');
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
                  {user?.organizationID && user?.organizationName && (
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
                    {user?.organizationID !== null && (
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

            {/* Stats - Quick Overview */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span>Points: {user.points || 0}</span>
              </div>
              <div className={styles.statItem}>
                <strong>{user.totalDonations || '0'}</strong> kg Donations
              </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabNavigation}>
              <button
                className={`${styles.tabButton} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                Preferences
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'badges' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('badges')}
              >
                Badges
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                My Stats
              </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className={styles.preferencesTab}>
                  {/* User Location Section */}
                  <div className={styles.userLocationSection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>Your Recycling Community</h3>
                      <button
                        onClick={() => setActiveModal('userLocation')}
                        className={styles.editPreferenceButton}
                      >
                        {user?.userLocation ? 'Change' : 'Set Community'}
                      </button>
                    </div>

                    <div className={styles.locationContent}>
                      {user?.userLocation ? (
                        <div className={styles.currentLocation}>
                          <div className={styles.locationIcon}>
                            <MapPin size={24} />
                          </div>
                          <div className={styles.locationDetails}>
                            <div className={styles.locationPrimary}>
                              {user.userLocation.barangay?.name}, {user.userLocation.city?.name}
                            </div>
                            <div className={styles.locationSecondary}>
                              {user.userLocation.province?.name && user.userLocation.province.name !== 'NCR' && (
                                <>{user.userLocation.province.name}, </>
                              )}
                              {user.userLocation.region?.name}
                            </div>
                            {user.userLocation.coordinates && (
                              <div className={styles.locationCoords}>
                                <MapPin size={14} /> {user.userLocation.coordinates.lat.toFixed(4)}, {user.userLocation.coordinates.lng.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.noLocation}>
                          <p className={styles.inviteText}>
                            <Sprout size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                            <strong>Set your current recycling community!</strong>
                          </p>
                          <p className={styles.benefitText}>
                            Join your local barangay community to see relevant posts and help us track active recyclers in your area.
                          </p>
                          <button
                            onClick={() => setActiveModal('userLocation')}
                            className={styles.setCommunityButton}
                          >
                            Choose Your Barangay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pickup Preferences Section */}
                  <div className={styles.preferencesSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Pickup Preferences</h3>
                      <GuideLink text="How to set up preferences" targetPage={3} icon={<HelpCircle size={16} />} />
                    </div>

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

                  {/* Privacy Settings Section */}
                  <div className={styles.privacySection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>Privacy Settings</h3>
                    </div>
                    <p className={styles.sectionDescription}>
                      Control how your information appears on community leaderboards.
                    </p>

                    <div className={styles.privacyContent}>
                      <div className={styles.privacyItem}>
                        <div className={styles.privacyItemInfo}>
                          <h4>Show Earnings on Leaderboard</h4>
                          <p className={styles.privacyDescription}>
                            Allow your earnings to appear on the Community Top Earners leaderboard.
                            This helps inspire others to recycle!
                          </p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={user?.privacySettings?.showEarnings || false}
                            onChange={(e) => handlePrivacySettingChange('showEarnings', e.target.checked)}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                      </div>

                      <div className={styles.privacyItem}>
                        <div className={styles.privacyItemInfo}>
                          <h4>Show Name on Leaderboard</h4>
                          <p className={styles.privacyDescription}>
                            Display your name instead of "Anonymous User" on leaderboards.
                            {!user?.privacySettings?.showEarnings && (
                              <span className={styles.privacyNote}> (Enable "Show Earnings" first)</span>
                            )}
                          </p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={user?.privacySettings?.showNameOnLeaderboard || false}
                            onChange={(e) => handlePrivacySettingChange('showNameOnLeaderboard', e.target.checked)}
                            disabled={!user?.privacySettings?.showEarnings}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Call to Action Cards */}
                  <div className={styles.ctaSection}>
                    {user.status === 'Pending' && (
                      <div className={styles.ctaCard}>
                        <p>Submit your proof of identity and unlock the rank and league features!</p>
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

                    {user.organizationID === null && !hasPendingOrganizationApplication() && (
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

                    {(!user.isCollector && !user.isAdmin && !hasPendingCollectorApplication()) || (user.organizationID === null && !hasPendingOrganizationApplication()) ? (
                      <p className={styles.ctaNote}>
                        <strong>Note: If you're applying for verification or applications</strong>, your application requires admin approval before your account status changes. Please give us 3-5 business days to review and process your application.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Badges Tab */}
              {activeTab === 'badges' && (
                <BadgesSection
                  userBadges={user?.badges || []}
                  userStats={{
                    points: user?.points || 0,
                    postsCreated: analyticsData?.giverStats?.totalPostsCreated || 0,
                    pickupsCompleted: (analyticsData?.giverStats?.successfulPickups || 0) + (analyticsData?.collectorStats?.successfulPickups || 0),
                    kgRecycled: analyticsData?.giverStats?.totalKgRecycled || 0,
                    initiativesSupported: analyticsData?.giverStats?.initiativesSupported || 0,
                  }}
                  onClaimBadge={async () => {
                    await checkAndAwardBadges();
                  }}
                />
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className={styles.statsTab}>
                  <div className={styles.detailedStatsSection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>My Activity Stats</h3>
                      <div className={styles.timeRangeSelector}>
                        {['week', 'month', 'year', 'all'].map(range => (
                          <button
                            key={range}
                            className={`${styles.timeButton} ${selectedTimeRange === range ? styles.activeTimeButton : ''}`}
                            onClick={() => setSelectedTimeRange(range)}
                          >
                            {range === 'all' ? 'All' : range.charAt(0).toUpperCase() + range.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Giver Stats - Everyone has this */}
                    <div className={styles.statsGrid}>
                      <div className={styles.statCard}>
                        <div className={styles.statCardHeader}>
                          <Recycle size={24} className={styles.statIcon} />
                          <h4>Recycling Stats</h4>
                        </div>
                        <div className={styles.statCardBody}>
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>Total Recycled</span>
                            <span className={styles.statValue}>{analyticsData.giverStats.totalKgRecycled || 0} kg</span>
                          </div>
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>Successful Pickups</span>
                            <span className={styles.statValue}>{analyticsData.giverStats.successfulPickups || 0}</span>
                          </div>
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>Active Pickups</span>
                            <span className={styles.statValue}>{analyticsData.giverStats.activePickups || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.statCard}>
                        <div className={styles.statCardHeader}>
                          <Users size={24} className={styles.statIcon} />
                          <h4>Community Engagement</h4>
                        </div>
                        <div className={styles.statCardBody}>
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>Forum Posts</span>
                            <span className={styles.statValue}>{analyticsData.giverStats.activeForumPosts || 0}</span>
                          </div>
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>Total Points</span>
                            <span className={styles.statValue}>{analyticsData.giverStats.totalPoints || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.statCard}>
                        <div className={styles.statCardHeader}>
                          <Leaf size={24} className={styles.statIcon} />
                          <h4>Environmental Impact</h4>
                        </div>
                        <div className={styles.statCardBody}>
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>CO₂ Saved</span>
                            <span className={styles.statValue}>{(analyticsData.giverStats.totalKgRecycled * 2.5).toFixed(1)} kg</span>
                          </div>
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>Trees Equivalent</span>
                            <span className={styles.statValue}>{Math.floor(analyticsData.giverStats.totalKgRecycled / 10)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Collector Stats - Only for collectors */}
                    {user?.isCollector && (
                      <div className={styles.roleStatsSection}>
                        <h4 className={styles.roleStatsTitle}>
                          <Package size={20} /> Collector Performance
                        </h4>
                        <div className={styles.statsGrid}>
                          <div className={styles.statCard}>
                            <div className={styles.statCardHeader}>
                              <Package size={24} className={styles.statIcon} />
                              <h4>Collection Stats</h4>
                            </div>
                            <div className={styles.statCardBody}>
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>Available Posts</span>
                                <span className={styles.statValue}>{analyticsData.collectorStats.activeWastePosts || 0}</span>
                              </div>
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>Posts Claimed</span>
                                <span className={styles.statValue}>{analyticsData.collectorStats.claimedPosts || 0}</span>
                              </div>
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>Total Collected</span>
                                <span className={styles.statValue}>{analyticsData.collectorStats.totalCollected || 0} kg</span>
                              </div>
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>Completion Rate</span>
                                <span className={styles.statValue}>{analyticsData.collectorStats.completionRate || 0}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Organization Stats - Only for organizations */}
                    {user?.organizationID !== null && (
                      <div className={styles.roleStatsSection}>
                        <h4 className={styles.roleStatsTitle}>
                          <Heart size={20} /> Organization Impact
                        </h4>
                        <div className={styles.statsGrid}>
                          <div className={styles.statCard}>
                            <div className={styles.statCardHeader}>
                              <Heart size={24} className={styles.statIcon} />
                              <h4>Initiatives</h4>
                            </div>
                            <div className={styles.statCardBody}>
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>Active Initiatives</span>
                                <span className={styles.statValue}>{analyticsData.organizationStats.activeInitiatives || 0}</span>
                              </div>
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>Total Supporters</span>
                                <span className={styles.statValue}>{analyticsData.organizationStats.totalSupporters || 0}</span>
                              </div>
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>Materials Received</span>
                                <span className={styles.statValue}>{analyticsData.organizationStats.materialsReceived || 0} kg</span>
                              </div>
                            </div>
                          </div>

                          {analyticsData.organizationStats.topContributors && analyticsData.organizationStats.topContributors.length > 0 && (
                            <div className={styles.statCard}>
                              <div className={styles.statCardHeader}>
                                <Trophy size={24} className={styles.statIcon} />
                                <h4>Top Contributors</h4>
                              </div>
                              <div className={styles.statCardBody}>
                                {analyticsData.organizationStats.topContributors.slice(0, 3).map((contributor, index) => (
                                  <div key={index} className={styles.contributorRow}>
                                    <span className={styles.contributorRank}>#{index + 1}</span>
                                    <span className={styles.contributorName}>{contributor.name}</span>
                                    <span className={styles.contributorAmount}>{contributor.amount} kg</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Badges Section (Legacy - Commented Out) */}
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

                {activeModal === 'userLocation' && (
                  <UserLocationModal
                    onClose={() => setActiveModal(null)}
                    onSubmit={handleUserLocationSubmit}
                    currentLocation={user?.userLocation || null}
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