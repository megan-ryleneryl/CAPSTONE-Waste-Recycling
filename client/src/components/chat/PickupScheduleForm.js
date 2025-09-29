import React, { useState } from 'react';
import styles from './PickupScheduleForm.module.css';

const PickupScheduleForm = ({ post, onSubmit, onCancel, giverPreferences }) => {
  const [formData, setFormData] = useState({
    pickupDate: '',
    pickupTime: '',
    pickupLocation: giverPreferences?.preferredLocation || '',
    contactPerson: '',
    contactNumber: '',
    alternateContact: '',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.pickupDate) {
      newErrors.pickupDate = 'Pickup date is required';
    } else {
      const selectedDate = new Date(formData.pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.pickupDate = 'Pickup date cannot be in the past';
      }
    }
    
    if (!formData.pickupTime) {
      newErrors.pickupTime = 'Pickup time is required';
    }
    
    if (!formData.pickupLocation || formData.pickupLocation.trim().length < 10) {
      newErrors.pickupLocation = 'Please provide a detailed pickup location';
    }
    
    if (!formData.contactPerson || formData.contactPerson.trim().length < 2) {
      newErrors.contactPerson = 'Contact person name is required';
    }
    
    if (!formData.contactNumber) {
      newErrors.contactNumber = 'Contact number is required';
    } else {
      const phoneRegex = /^(\+63|0)?9\d{9}$/;
      const cleanedNumber = formData.contactNumber.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanedNumber)) {
        newErrors.contactNumber = 'Please enter a valid Philippine mobile number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

  // Get tomorrow's date as minimum
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get date 30 days from now as maximum
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Schedule Pickup</h2>
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Post Information */}
        {post && (
          <div className={styles.postInfo}>
            <h3>{post.title}</h3>
            <p className={styles.postMeta}>
              {post.wasteType || post.materials} • {post.quantity || post.amount} {post.unit || 'items'}
            </p>
          </div>
        )}

        {/* Giver Preferences if available */}
        {giverPreferences && (giverPreferences.preferredDays || giverPreferences.preferredTimeSlots) && (
          <div className={styles.preferences}>
            <p className={styles.prefTitle}>📅 Giver's Preferences:</p>
            {giverPreferences.preferredDays && (
              <p>Preferred days: {giverPreferences.preferredDays.join(', ')}</p>
            )}
            {giverPreferences.preferredTimeSlots && (
              <p>Preferred time: {giverPreferences.preferredTimeSlots.join(', ')}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
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
                min={getTomorrowDate()}
                max={getMaxDate()}
                className={errors.pickupDate ? styles.errorInput : ''}
                required
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
                required
              />
              {errors.pickupTime && (
                <span className={styles.errorMsg}>{errors.pickupTime}</span>
              )}
            </div>
          </div>

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
              placeholder="Complete address or landmark"
              className={errors.pickupLocation ? styles.errorInput : ''}
              required
            />
            {errors.pickupLocation && (
              <span className={styles.errorMsg}>{errors.pickupLocation}</span>
            )}
          </div>

          <div className={styles.row}>
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
                placeholder="Name of person doing the pickup"
                className={errors.contactPerson ? styles.errorInput : ''}
                required
              />
              {errors.contactPerson && (
                <span className={styles.errorMsg}>{errors.contactPerson}</span>
              )}
            </div>

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
                required
              />
              {errors.contactNumber && (
                <span className={styles.errorMsg}>{errors.contactNumber}</span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="alternateContact">
              Alternate Contact (Optional)
            </label>
            <input
              type="tel"
              id="alternateContact"
              name="alternateContact"
              value={formData.alternateContact}
              onChange={handleChange}
              placeholder="Backup contact number"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="specialInstructions">
              Special Instructions (Optional)
            </label>
            <textarea
              id="specialInstructions"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows="3"
              placeholder="Any special instructions or notes for the pickup..."
              className={styles.textarea}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
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
              {loading ? 'Scheduling...' : 'Schedule Pickup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PickupScheduleForm;