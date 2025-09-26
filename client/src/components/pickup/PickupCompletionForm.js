// client/src/components/chat/PickupScheduleForm.js
import React, { useState } from 'react';
import styles from './PickupScheduleForm.module.css';

const PickupScheduleForm = ({ post, onSubmit, onCancel, giverPreferences }) => {
  const [formData, setFormData] = useState({
    postID: post.postID,
    pickupDate: '',
    pickupTime: '',
    pickupLocation: giverPreferences?.defaultLocation || '',
    contactPerson: '',
    contactNumber: '',
    alternateContact: '',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    // Required field validation
    if (!formData.pickupDate) {
      newErrors.pickupDate = 'Pickup date is required';
    } else {
      // Check if date is in the future
      const selectedDate = new Date(formData.pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.pickupDate = 'Pickup date must be in the future';
      }
    }
    
    if (!formData.pickupTime) {
      newErrors.pickupTime = 'Pickup time is required';
    }
    
    if (!formData.pickupLocation || formData.pickupLocation.trim().length < 10) {
      newErrors.pickupLocation = 'Please provide a detailed pickup location (at least 10 characters)';
    }
    
    if (!formData.contactPerson || formData.contactPerson.trim().length < 2) {
      newErrors.contactPerson = 'Contact person name is required';
    }
    
    if (!formData.contactNumber) {
      newErrors.contactNumber = 'Contact number is required';
    } else {
      // Philippine phone number validation
      const phoneRegex = /^(\+63|0)?9\d{9}$/;
      const cleanedNumber = formData.contactNumber.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanedNumber)) {
        newErrors.contactNumber = 'Please enter a valid Philippine mobile number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting pickup schedule:', error);
      alert('Failed to schedule pickup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Schedule Pickup</h2>
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Post Information */}
        <div className={styles.postInfo}>
          <h3>{post.title}</h3>
          <p>{post.wasteType} • {post.amount} {post.unit}</p>
        </div>

        {/* Giver Preferences (if available) */}
        {giverPreferences && (
          <div className={styles.preferences}>
            <p className={styles.prefTitle}>Giver's Preferences:</p>
            {giverPreferences.preferredDays && (
              <p>Preferred days: {giverPreferences.preferredDays.join(', ')}</p>
            )}
            {giverPreferences.preferredTimeSlots && (
              <p>Preferred time: {giverPreferences.preferredTimeSlots.join(', ')}</p>
            )}
          </div>
        )}

        <div className={styles.formBody}>
          {/* Date and Time Row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="pickupDate">
                Pickup Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                id="pickupDate"
                name="pickupDate"
                value={formData.pickupDate}
                onChange={handleChange}
                min={getMinDate()}
                max={getMaxDate()}
                className={errors.pickupDate ? styles.errorInput : ''}
              />
              {errors.pickupDate && (
                <span className={styles.errorMsg}>{errors.pickupDate}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="pickupTime">
                Time <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                id="pickupTime"
                name="pickupTime"
                value={formData.pickupTime}
                onChange={handleChange}
                className={errors.pickupTime ? styles.errorInput : ''}
              />
              {errors.pickupTime && (
                <span className={styles.errorMsg}>{errors.pickupTime}</span>
              )}
            </div>
          </div>

          {/* Location */}
          <div className={styles.field}>
            <label htmlFor="pickupLocation">
              Pickup Location <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="pickupLocation"
              name="pickupLocation"
              value={formData.pickupLocation}
              onChange={handleChange}
              placeholder="Enter complete address or landmark"
              className={errors.pickupLocation ? styles.errorInput : ''}
            />
            {errors.pickupLocation && (
              <span className={styles.errorMsg}>{errors.pickupLocation}</span>
            )}
          </div>

          {/* Contact Person */}
          <div className={styles.field}>
            <label htmlFor="contactPerson">
              Contact Person <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="contactPerson"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="Name of person who will do the pickup"
              className={errors.contactPerson ? styles.errorInput : ''}
            />
            {errors.contactPerson && (
              <span className={styles.errorMsg}>{errors.contactPerson}</span>
            )}
          </div>

          {/* Contact Numbers Row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="contactNumber">
                Contact Number <span className={styles.required}>*</span>
              </label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                placeholder="09XX XXX XXXX"
                className={errors.contactNumber ? styles.errorInput : ''}
              />
              {errors.contactNumber && (
                <span className={styles.errorMsg}>{errors.contactNumber}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="alternateContact">
                Alternate Contact
              </label>
              <input
                type="tel"
                id="alternateContact"
                name="alternateContact"
                value={formData.alternateContact}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div className={styles.field}>
            <label htmlFor="specialInstructions">
              Special Instructions
            </label>
            <textarea
              id="specialInstructions"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows="3"
              placeholder="Any additional details or instructions..."
              className={styles.textarea}
            />
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Scheduling...' : 'Schedule Pickup'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickupScheduleForm;