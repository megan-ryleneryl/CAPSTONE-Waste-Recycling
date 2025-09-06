// Note from Megan: This is copy-pasted code, it's just here as a placeholder. 
// Feel free to delete or change completely.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; // or use fetch
import styles from './CreatePost.module.css';

const CreatePost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [postType, setPostType] = useState('Waste');
  
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    materials: '',
    quantity: '',
    price: '',
    pickupDate: '',
    pickupTime: '',
    // Initiative specific
    goal: '',
    targetAmount: '',
    // Forum specific
    category: 'Tips',
    tags: ''
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Prepare data based on post type
      let postData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        postType
      };
      
      // Add type-specific fields
      if (postType === 'Waste') {
        postData = {
          ...postData,
          materials: formData.materials.split(',').map(m => m.trim()).filter(m => m),
          quantity: parseFloat(formData.quantity) || 0,
          price: parseFloat(formData.price) || 0,
          pickupDate: formData.pickupDate,
          pickupTime: formData.pickupTime,
          status: 'Available'
        };
      } else if (postType === 'Initiative') {
        postData = {
          ...postData,
          goal: formData.goal,
          targetAmount: parseFloat(formData.targetAmount) || 0,
          currentAmount: 0,
          status: 'Active'
        };
      } else if (postType === 'Forum') {
        postData = {
          ...postData,
          category: formData.category,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          status: 'Active'
        };
      }
      
      // Make API call
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
      
      if (response.data.success) {
        // Redirect to posts page
        navigate('/posts');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/posts');
  };

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

        {/* Post Type Selector */}
        <div className={styles.postTypeSelector}>
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Waste' ? styles.active : ''}`}
            onClick={() => setPostType('Waste')}
          >
            <span>Waste Post</span>
            <small>Offer recyclable materials</small>
          </button>
          
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Initiative' ? styles.active : ''}`}
            onClick={() => setPostType('Initiative')}
          >
            <span>Initiative</span>
            <small>Start a green project</small>
          </button>
          
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Forum' ? styles.active : ''}`}
            onClick={() => setPostType('Forum')}
          >
            <span>Forum Post</span>
            <small>Share tips or news</small>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

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
              placeholder="Enter a descriptive title"
              required
              maxLength={100}
            />
            <span className={styles.charCount}>
              {formData.title.length}/100
            </span>
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
              placeholder="Provide detailed information about your post"
              required
              rows={5}
              maxLength={500}
            />
            <span className={styles.charCount}>
              {formData.description.length}/500
            </span>
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
              placeholder="e.g., Quezon City, Manila"
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
                    placeholder="e.g., Plastic, Glass, Paper"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="quantity" className={styles.label}>
                    Quantity (kg) *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="price" className={styles.label}>
                    Price (₱)
                    <span className={styles.hint}>Optional - leave blank if free</span>
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="pickupDate" className={styles.label}>
                    Preferred Pickup Date *
                  </label>
                  <input
                    type="date"
                    id="pickupDate"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                    className={styles.input}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="pickupTime" className={styles.label}>
                    Preferred Pickup Time *
                  </label>
                  <input
                    type="time"
                    id="pickupTime"
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
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
                  placeholder="Describe what you aim to achieve with this initiative"
                  required
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="targetAmount" className={styles.label}>
                  Target Amount (₱)
                  <span className={styles.hint}>If fundraising is involved</span>
                </label>
                <input
                  type="number"
                  id="targetAmount"
                  name="targetAmount"
                  value={formData.targetAmount}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
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
                  <option value="Tips">Tips & Guides</option>
                  <option value="News">News & Updates</option>
                  <option value="Questions">Questions</option>
                  <option value="Discussion">General Discussion</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tags" className={styles.label}>
                  Tags
                  <span className={styles.hint}>Separate with commas</span>
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g., recycling, environment, tips"
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
                'Create Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;