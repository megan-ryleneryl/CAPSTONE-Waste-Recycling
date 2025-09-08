import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Profile.module.css';
import ModalPortal from '../components/common/ModalPortal';

// Component for Organization Application Form
const OrganizationForm = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationLocation: '',
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
              <label>Organization Location</label>
              <select
                name="organizationLocation"
                value={formData.organizationLocation}
                onChange={handleInputChange}
                className={styles.select}
                required
              >
                <option value="">Select Location</option>
                <option value="Metro Manila">Metro Manila</option>
                <option value="Luzon">Luzon</option>
                <option value="Visayas">Visayas</option>
                <option value="Mindanao">Mindanao</option>
              </select>
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

// Component for Edit Profile Form
const EditProfileForm = ({ user, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    userName: `${user.firstName} ${user.lastName}`,
    phone: user.phone || '',
    address: user.address || ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
            <div className={styles.profileIcon}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="40" fill="#E0E0E0"/>
                <circle cx="40" cy="30" r="15" fill="#666"/>
                <ellipse cx="40" cy="65" rx="25" ry="20" fill="#666"/>
              </svg>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>User_Name</label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
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
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="City, Province"
                required
              />
            </div>

            <button type="submit" className={styles.saveButton}>
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Main Profile Component
const Profile = ({ user: propsUser, activeFilter }) => {
  const [user, setUser] = useState(propsUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      setLoading(false);
    } else {
      navigate('/login');
    }
  }, [navigate]);

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

    const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        navigate('/login');
        return;
      }

      // Clear any previous errors when fetching
      setError('');

      try {
        const response = await axios.get('http://localhost:3001/api/protected/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success) {
          const profileData = response.data.user;
          setUser(profileData);
          setEditForm({
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            phone: profileData.phone || '',
            address: profileData.address || ''
          });
          localStorage.setItem('user', JSON.stringify(profileData));
        }
      } catch (apiError) {
        console.log('Using cached user data');
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setEditForm({
          firstName: parsedUser.firstName || '',
          lastName: parsedUser.lastName || '',
          phone: parsedUser.phone || '',
          address: parsedUser.address || ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

      useEffect(() => {
        fetchUserProfile();
      }, [fetchUserProfile]
    ); // Add fetchUserProfile as dependency

    const handleEditSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Parse userName to firstName and lastName if needed
      const nameParts = formData.userName.split(' ');
      const updateData = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: formData.phone,
        address: formData.address
      };

      const response = await axios.put(
        'http://localhost:3001/api/protected/profile',
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setActiveModal(null);
        setError(''); // Clear any existing errors
        alert('Profile updated successfully!');
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
      const submitData = new FormData();
      submitData.append('businessJustification', formData.businessJustification);
      if (formData.mrfProof) {
        submitData.append('mrfProof', formData.mrfProof);
      }
      
      const response = await axios.post(
        'http://localhost:3001/api/protected/profile/apply-collector',
        submitData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setActiveModal(null);
        setError(''); // Clear any existing errors
        alert('Collector application submitted successfully! Please wait for approval.');
        // Refresh profile to reflect pending status
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Error submitting collector application:', error);
      setError(error.response?.data?.message || 'Failed to submit application');
    }
  };

  const handleOrganizationSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:3001/api/protected/profile/apply-organization',
        {
          organizationName: formData.organizationName,
          organizationLocation: formData.organizationLocation,
          reason: formData.reason,
          proofDocument: formData.proofDocument // Handle file upload if needed
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setActiveModal(null);
        setError(''); // Clear any existing errors
        alert('Organization application submitted successfully! Please wait for approval.');
        // Refresh profile to reflect pending status
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Error submitting organization application:', error);
      setError(error.response?.data?.message || 'Failed to submit application');
    }
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
        <main className={styles.content}>
          <div className={styles.profileCard}>
            {/* Profile Header */}
            <div className={styles.profileHeader}>
              <div className={styles.profileInfo}>
                <div className={styles.profileAvatar}>
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                    <circle cx="30" cy="30" r="30" fill="#E0E0E0"/>
                    <circle cx="30" cy="24" r="10" fill="#666"/>
                    <ellipse cx="30" cy="45" rx="18" ry="15" fill="#666"/>
                  </svg>
                </div>
                <div className={styles.profileDetails}>
                  <h2>{user.firstName} {user.lastName}</h2>
                  <span className={styles.userType}>{user.userType}</span>
                </div>
                <button 
                  className={styles.editButton}
                  onClick={() => setActiveModal('edit')}
                >
                  Edit
                </button>
              </div>
              <div className={styles.verifiedBadge}>
                {user.status === 'verified' ? 'Verified' : 'Pending'}
              </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span>Points: {user.points || 0}</span>
              </div>
              <div className={styles.statItem}>
                <strong>{user.totalDonations || '50 kg'}</strong> Donations
              </div>
            </div>

            {/* Contact Info */}
            <div className={styles.contactInfo}>
              <p><strong>Phone number:</strong> {user.phone || 'No phone set'}</p>
              <p><strong>Email:</strong> {user.email || ''}</p>
            </div>

            {/* Call to Action Cards */}
            <div className={styles.ctaSection}>
              {user.userType === 'Giver' && (
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

              {!user.isOrganization && (
                <div className={styles.ctaCard}>
                  <p>Join EcoTayo as a Verified Organization and connect directly with thousands of givers. Showcase your projects, collect materials at scale, and build your reputation as a leader in sustainable waste management.</p>
                  <button 
                    className={styles.ctaButton}
                    onClick={() => setActiveModal('organization')}
                  >
                    Apply for an Org Account
                  </button>
                </div>
              )}
            </div>

            {/* Badges Section */}
            <div className={styles.badgesSection}>
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
            </div>
          </div>
        </main>

      {/* MODALS RENDERED THROUGH PORTAL */}
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
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorToast}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Profile;