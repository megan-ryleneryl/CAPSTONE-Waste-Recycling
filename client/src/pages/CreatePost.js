import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './CreatePost.module.css';

const CreatePost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState('');
  const [postType, setPostType] = useState('Waste');
  
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    // Waste specific
    materials: '',
    quantity: '',
    pickupDate: '',
    pickupTime: '',
    // Initiative specific
    goal: '',
    targetAmount: '',
    endDate: '',
    // Forum specific
    category: 'General',
    tags: ''
  });

  // Get user type on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/protected/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUserType(response.data.user.userType);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Validate form based on post type
  const validateForm = () => {
    // Common validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    
    // Type-specific validation
    if (postType === 'Waste') {
      if (!formData.materials.trim()) {
        setError('Materials are required for Waste posts');
        return false;
      }
      if (!formData.quantity || formData.quantity <= 0) {
        setError('Valid quantity is required for Waste posts');
        return false;
      }
    } else if (postType === 'Initiative') {
      if (!formData.goal.trim()) {
        setError('Goal is required for Initiative posts');
        return false;
      }
      if (!formData.targetAmount || formData.targetAmount <= 0) {
        setError('Target amount is required for Initiative posts');
        return false;
      }
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  setLoading(true);
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('You must be logged in to create a post');
      navigate('/login');
      return;
    }
    
    // Log the token (remove in production)
    console.log('Token exists:', !!token);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    // Prepare data based on post type
    let postData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      postType
    };
    
    // Add type-specific fields
    if (postType === 'Waste') {
      postData = {
        ...postData,
        materials: formData.materials.split(',').map(m => m.trim()).filter(m => m),
        quantity: parseFloat(formData.quantity),
        pickupDate: formData.pickupDate || null,
        pickupTime: formData.pickupTime || null
      };
    } else if (postType === 'Initiative') {
      postData = {
        ...postData,
        goal: formData.goal.trim(),
        targetAmount: parseFloat(formData.targetAmount),
        endDate: formData.endDate || null
      };
    } else if (postType === 'Forum') {
      postData = {
        ...postData,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
      };
    }
    
    // Log the data being sent (remove in production)
    console.log('Sending post data:', postData);
    
    // Make API call to the correct endpoint
    const response = await axios.post(
      'http://localhost:3001/api/posts/create',
      postData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Log successful response
    console.log('Response received:', response.data);
    
    if (response.data.success) {
      // Show success message if you have a toast/notification system
      console.log(response.data.message);
      
      // Redirect to posts page or the created post
      navigate('/posts');
    }
  } catch (err) {
    // Enhanced error logging
    console.error('Error creating post:', err);
    
    if (err.response) {
      // The request was made and the server responded with an error status
      console.error('Error response data:', err.response.data);
      console.error('Error response status:', err.response.status);
      console.error('Error response headers:', err.response.headers);
      
      // Check for specific error types
      if (err.response.status === 401) {
        setError('Authentication failed. Please login again.');
        localStorage.removeItem('token'); // Clear invalid token
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response.status === 403) {
        setError(err.response.data?.message || 'You do not have permission to create this type of post');
      } else if (err.response.status === 400) {
        setError(err.response.data?.message || 'Invalid data provided. Please check your inputs.');
      } else {
        setError(err.response.data?.message || 'Failed to create post. Please try again.');
      }
    } else if (err.request) {
      // The request was made but no response was received
      console.error('No response received:', err.request);
      setError('No response from server. Please check your connection and try again.');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', err.message);
      setError('Failed to send request. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};

  // Handle cancel
  const handleCancel = () => {
    navigate('/posts');
  };

  // Check if user can create initiative posts
  const canCreateInitiative = userType === 'Collector' || userType === 'Admin';

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/posts" className={styles.backButton}>
            ← Back to Posts
          </Link>
          <h1 className={styles.title}>Create New Post</h1>
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Post Type Selector */}
        <div className={styles.postTypeSelector}>
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Waste' ? styles.active : ''}`}
            onClick={() => setPostType('Waste')}
          >
            <span>♻️ Waste Post</span>
            <small>Offer recyclable materials</small>
          </button>
          
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Initiative' ? styles.active : ''}`}
            onClick={() => setPostType('Initiative')}
            disabled={!canCreateInitiative}
            title={!canCreateInitiative ? 'Only Collectors can create Initiative posts' : ''}
          >
            <span>🌱 Initiative</span>
            <small>{canCreateInitiative ? 'Start a green project' : 'Collectors only'}</small>
          </button>
          
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Forum' ? styles.active : ''}`}
            onClick={() => setPostType('Forum')}
          >
            <span>💬 Forum Post</span>
            <small>Share and discuss</small>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Common Fields */}
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Give your post a clear title"
              required
              maxLength="100"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Provide details about your post"
              rows="5"
              required
              maxLength="1000"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="location" className={styles.label}>
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="e.g., Quezon City, Metro Manila"
              required
            />
          </div>

          {/* Waste-specific Fields */}
          {postType === 'Waste' && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="materials" className={styles.label}>
                    Materials *
                    <span className={styles.hint}>Separate with commas</span>
                  </label>
                  <input
                    type="text"
                    id="materials"
                    name="materials"
                    value={formData.materials}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="e.g., plastic bottles, cardboard, paper"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="quantity" className={styles.label}>
                    Quantity *
                  </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="0"
                      min="0.1"
                      step="0.1"
                      required
                    />
                </div>

              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="pickupDate" className={styles.label}>
                    Preferred Pickup Date
                    <span className={styles.hint}>Optional</span>
                  </label>
                  <input
                    type="date"
                    id="pickupDate"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                    className={styles.input}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="pickupTime" className={styles.label}>
                    Preferred Pickup Time
                    <span className={styles.hint}>Optional</span>
                  </label>
                  <input
                    type="time"
                    id="pickupTime"
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              </div>
            </>
          )}

          {/* Initiative-specific Fields */}
          {postType === 'Initiative' && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="goal" className={styles.label}>
                  Initiative Goal *
                </label>
                <textarea
                  id="goal"
                  name="goal"
                  value={formData.goal}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="What do you want to achieve with this initiative?"
                  rows="3"
                  required
                  maxLength="500"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="targetAmount" className={styles.label}>
                    Target Amount (kg) *
                  </label>
                  <input
                    type="number"
                    id="targetAmount"
                    name="targetAmount"
                    value={formData.targetAmount}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="0"
                    min="1"
                    step="0.1"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="endDate" className={styles.label}>
                    End Date
                    <span className={styles.hint}>Optional</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={styles.input}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </>
          )}

          {/* Forum-specific Fields */}
          {postType === 'Forum' && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="category" className={styles.label}>
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={styles.select}
                  required
                >
                  <option value="General">General Discussion</option>
                  <option value="Tips">Tips & Guides</option>
                  <option value="News">News & Updates</option>
                  <option value="Questions">Questions</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tags" className={styles.label}>
                  Tags
                  <span className={styles.hint}>Separate with commas (optional)</span>
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g., recycling, environment, tips"
                  maxLength="200"
                />
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Creating...
                </>
              ) : (
                `Create ${postType} Post`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;