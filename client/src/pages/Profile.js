// client/src/pages/Profile.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    userType: '',
    bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setFormData({
        firstName: parsedUser.firstName || '',
        lastName: parsedUser.lastName || '',
        email: parsedUser.email || '',
        phone: parsedUser.phone || '',
        location: parsedUser.location || 'Manila, Philippines',
        userType: parsedUser.userType || 'Giver',
        bio: parsedUser.bio || 'Passionate about environmental sustainability and waste reduction.'
      });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // In a real app, make API call to update profile
      // const response = await fetch('/api/protected/profile', { ... });
      
      // For testing, simulate successful update
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setMessage('Profile updated successfully!');
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update profile. Please try again.');
    }

    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ color: '#667eea', margin: 0, fontSize: '1.5rem' }}>
            🌱♻️ EcoConnect
          </h1>
        </div>
        
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ color: '#666', textDecoration: 'none' }}>
            Dashboard
          </Link>
          <Link to="/profile" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}>
            Profile
          </Link>
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Profile Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: '#667eea',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            margin: '0 auto 1rem'
          }}>
            {user.firstName ? user.firstName.charAt(0) : 'U'}
          </div>
          
          <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>
            {user.firstName} {user.lastName}
          </h2>
          
          <div style={{
            display: 'inline-block',
            backgroundColor: user.userType === 'Giver' ? '#28a745' : '#17a2b8',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '15px',
            fontSize: '0.9rem',
            marginBottom: '1rem'
          }}>
            {user.userType}
          </div>
          
          <p style={{ color: '#666', margin: 0 }}>
            {formData.bio}
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div style={{
            backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
            color: message.includes('success') ? '#155724' : '#721c24',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message}
          </div>
        )}

        {/* Profile Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h3 style={{ color: '#333', margin: 0 }}>Personal Information</h3>
            
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    setFormData({
                      firstName: user.firstName || '',
                      lastName: user.lastName || '',
                      email: user.email || '',
                      phone: user.phone || '',
                      location: user.location || 'Manila, Philippines',
                      userType: user.userType || 'Giver',
                      bio: user.bio || 'Passionate about environmental sustainability and waste reduction.'
                    });
                  }}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#333', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold'
                  }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#333', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold'
                  }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#333', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#333', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold'
                  }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="09XX XXX XXXX"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#333', 
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="City, Province"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#333', 
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </form>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem'
            }}>
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#888', 
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Email
                  </label>
                  <div style={{ color: '#333', fontSize: '1rem' }}>
                    {user.email}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#888', 
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Phone
                  </label>
                  <div style={{ color: '#333', fontSize: '1rem' }}>
                    {formData.phone || 'Not provided'}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#888', 
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Location
                  </label>
                  <div style={{ color: '#333', fontSize: '1rem' }}>
                    {formData.location}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#888', 
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Account Type
                  </label>
                  <div style={{ color: '#333', fontSize: '1rem' }}>
                    {user.userType}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#888', 
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Member Since
                  </label>
                  <div style={{ color: '#333', fontSize: '1rem' }}>
                    January 2025
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#888', 
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Status
                  </label>
                  <div style={{
                    display: 'inline-block',
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '15px',
                    fontSize: '0.8rem'
                  }}>
                    Verified
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity Stats */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginTop: '2rem'
        }}>
          <h3 style={{ color: '#333', marginBottom: '1.5rem' }}>Activity Overview</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>12</div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Posts Created</div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>8</div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Successful Pickups</div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⭐</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>150</div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Points Earned</div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>3</div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Badges Earned</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;