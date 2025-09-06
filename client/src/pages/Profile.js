import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Profile.module.css';

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

  return (
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
              <option value="Cebu">Cebu</option>
              <option value="Davao">Davao</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Reason for applying</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className={styles.textarea}
              rows="4"
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

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <button onClick={onClose} className={styles.closeButton}>×</button>
          <h2>Apply for Collector</h2>
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
            <label>Proof of MRF (Document Upload)</label>
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

  return (
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
  );
};

// Main Profile Component
const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [activeFilter, setActiveFilter] = useState('recyclables');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        navigate('/login');
        return;
      }

      // Parse stored user data
      const parsedUser = JSON.parse(userData);
      
      // Fetch updated profile from server
      const response = await axios.get('http://localhost:3001/api/protected/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        setUser(parsedUser);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Use stored user data as fallback
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const [firstName, ...lastNameParts] = formData.userName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const response = await axios.put(
        'http://localhost:3001/api/protected/profile',
        {
          firstName,
          lastName,
          phone: formData.phone,
          address: formData.address
        },
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
      }
    } catch (err) {
      setError('Failed to update profile');
      console.error('Update error:', err);
    }
  };

  const handleCollectorApplication = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:3001/api/protected/applications',
        {
          type: 'collector',
          businessJustification: formData.businessJustification,
          mrfProof: formData.mrfProof?.name || 'document.pdf'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        alert('Application submitted successfully!');
        setActiveModal(null);
      }
    } catch (err) {
      setError('Failed to submit application');
      console.error('Application error:', err);
    }
  };

  const handleOrganizationApplication = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:3001/api/protected/applications',
        {
          type: 'organization',
          organizationName: formData.organizationName,
          organizationLocation: formData.organizationLocation,
          reason: formData.reason,
          proofDocument: formData.proofDocument?.name || 'document.pdf'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        alert('Application submitted successfully!');
        setActiveModal(null);
      }
    } catch (err) {
      setError('Failed to submit application');
      console.error('Application error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedUser');
    navigate('/login');
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
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.binIcon}>🗑️</span>
            <span className={styles.logoText}>BinGo</span>
          </div>
          
          <nav className={styles.nav}>
            <button className={styles.navIcon}>💬</button>
            <button className={styles.navIcon}>🔔</button>
            <button className={styles.navIcon}>👤</button>
          </nav>
        </div>
      </header>

      <div className={styles.mainContainer}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <button className={styles.sidebarItem}>
              <span className={styles.icon}>🔔</span>
              <span>Notifications</span>
            </button>
            <button className={styles.sidebarItem}>
              <span className={styles.icon}>📊</span>
              <span>Charts and Data</span>
            </button>
            <button className={styles.sidebarItem}>
              <span className={styles.icon}>📧</span>
              <span>Inbox</span>
            </button>
            <button className={styles.sidebarItem}>
              <span className={styles.icon}>ℹ️</span>
              <span>About</span>
            </button>
            <button className={`${styles.sidebarItem} ${styles.active}`}>
              <span className={styles.icon}>👤</span>
              <span>Profile</span>
            </button>
          </nav>

          <div className={styles.filterSection}>
            <h3>Filter Posts</h3>
            <button 
              className={`${styles.filterItem} ${activeFilter === 'recyclables' ? styles.activeFilter : ''}`}
              onClick={() => setActiveFilter('recyclables')}
            >
              <span className={styles.icon}>♻️</span>
              <span>Recyclables</span>
            </button>
            <button 
              className={`${styles.filterItem} ${activeFilter === 'initiatives' ? styles.activeFilter : ''}`}
              onClick={() => setActiveFilter('initiatives')}
            >
              <span className={styles.icon}>📋</span>
              <span>Initiatives</span>
            </button>
            <button 
              className={`${styles.filterItem} ${activeFilter === 'forums' ? styles.activeFilter : ''}`}
              onClick={() => setActiveFilter('forums')}
            >
              <span className={styles.icon}>👥</span>
              <span>Forums</span>
            </button>
          </div>

          <button className={styles.createPostButton}>
            <span>+ Create Post</span>
          </button>
        </aside>

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
                  ✏️
                </button>
              </div>
              <div className={styles.verifiedBadge}>
                {user.status === 'verified' ? 'Verified' : 'Pending'}
              </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <strong>{user.points || 100}</strong> Points
              </div>
              <div className={styles.statItem}>
                <strong>{user.totalDonations || '50 kg'}</strong> Donations
              </div>
            </div>

            {/* Contact Info */}
            <div className={styles.contactInfo}>
              <p><strong>Phone number:</strong> {user.phone || '0999 999 9999'}</p>
              <p><strong>Address:</strong> {user.address || 'Quezon City'}</p>
            </div>

            {/* Call to Action Cards */}
            <div className={styles.ctaSection}>
              <div className={styles.ctaCard}>
                <p>Join BinGo as a Collector and help close the loop on recycling in your community. Claim posts, manage pickups, and turn waste into a resource. Apply now and start earning points for every successful collection!</p>
                <button 
                  className={styles.ctaButton}
                  onClick={() => setActiveModal('collector')}
                >
                  Apply to be a Collector
                </button>
              </div>

              <div className={styles.ctaCard}>
                <p>Join BinGo as a Verified Organization and connect directly with thousands of givers. Showcase your projects, collect materials at scale, and build your reputation as a leader in sustainable waste management.</p>
                <button 
                  className={styles.ctaButton}
                  onClick={() => setActiveModal('organization')}
                >
                  Apply for an Org Account
                </button>
              </div>
            </div>

            {/* Badges Section */}
            <div className={styles.badgesSection}>
              <h3>Badges:</h3>
              <div className={styles.badgesList}>
                <div className={styles.badgePlaceholder}></div>
                <div className={styles.badgePlaceholder}></div>
                <div className={styles.badgePlaceholder}></div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {activeModal === 'edit' && (
        <EditProfileForm 
          user={user}
          onClose={() => setActiveModal(null)}
          onSubmit={handleEditProfile}
        />
      )}
      
      {activeModal === 'collector' && (
        <CollectorForm 
          onClose={() => setActiveModal(null)}
          onSubmit={handleCollectorApplication}
        />
      )}
      
      {activeModal === 'organization' && (
        <OrganizationForm 
          onClose={() => setActiveModal(null)}
          onSubmit={handleOrganizationApplication}
        />
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