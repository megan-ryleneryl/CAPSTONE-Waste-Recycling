// client/src/components/chat/PickupScheduleForm.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Calendar } from 'lucide-react';
import styles from './PickupScheduleForm.module.css';
import PSGCService from '../../services/psgcService';

const PickupScheduleForm = ({ post, giverPreferences, onSubmit, onCancel }) => {
  // Initialize form with post data
  const [formData, setFormData] = useState({
    // Auto-fill from post data
    pickupDate: post?.pickupDate || '',
    pickupTime: post?.pickupTime || '',
    // Use post location directly
    pickupLocation: post?.location || null,
    contactPerson: '',
    contactNumber: '',
    alternateContact: '',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Helper to format location for display
  const formatLocation = (location) => {
    if (!location) return 'Location not specified';
    if (typeof location === 'string') return location;

    const parts = [];
    if (location.addressLine) parts.push(location.addressLine);
    if (location.barangay?.name) parts.push(location.barangay.name);
    if (location.city?.name) parts.push(location.city.name);
    if (location.province?.name && location.province.name !== 'NCR') parts.push(location.province.name);
    if (location.region?.name) parts.push(location.region.name);

    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person name is required';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^[0-9]{10,11}$/.test(formData.contactNumber.replace(/\s/g, ''))) {
      newErrors.contactNumber = 'Please enter a valid 10-11 digit phone number';
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
      // Use post data for date, time, and location
      const dataToSubmit = {
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        pickupLocation: formData.pickupLocation, // Use location from post
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        alternateContact: formData.alternateContact,
        specialInstructions: formData.specialInstructions
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Error submitting pickup schedule:', error);
      alert('Failed to schedule pickup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render the modal using a portal
  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Schedule Pickup</h2>
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {post && (
          <div className={styles.postInfo}>
            <h3>{post.title}</h3>
            <p className={styles.postMeta}>
              {post.wasteType || (Array.isArray(post.materials)
                ? post.materials.map(m => m.materialName || m).join(', ')
                : post.materials)} • {post.quantity || post.amount} kg
              {post.price > 0 && ` • ₱${post.price}`}
            </p>
          </div>
        )}

        {giverPreferences && (giverPreferences.preferredDays || giverPreferences.preferredTimeSlots) && (
          <div className={styles.preferences}>
            <p className={styles.prefTitle}>
              <Calendar size={16} />
              <span>Giver's Preferences:</span>
            </p>
            {giverPreferences.preferredDays && (
              <p>Preferred days: {giverPreferences.preferredDays.join(', ')}</p>
            )}
            {giverPreferences.preferredTimeSlots && (
              <p>Preferred time: {giverPreferences.preferredTimeSlots.join(', ')}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Display post data as read-only */}
          <div className={styles.infoSection}>
            <h4 className={styles.sectionTitle}>Pickup Schedule Details</h4>

            <div className={styles.infoItem}>
              <label>Pickup Date</label>
              <p className={styles.infoValue}>{formatDate(formData.pickupDate)}</p>
            </div>

            <div className={styles.infoItem}>
              <label>Pickup Time</label>
              <p className={styles.infoValue}>{formData.pickupTime || 'Not specified'}</p>
            </div>

            <div className={styles.infoItem}>
              <label>Pickup Location</label>
              <p className={styles.infoValue}>{formatLocation(formData.pickupLocation)}</p>
            </div>
          </div>

          {/* Contact Information Fields - Editable */}
          <div className={styles.contactSection}>
            <h4 className={styles.sectionTitle}>Contact Information <span className={styles.required}>*</span></h4>

            <div className={styles.field}>
              <label htmlFor="contactPerson">
                Contact Person <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                placeholder="Name of person doing the pickup"
                value={formData.contactPerson}
                onChange={handleChange}
                className={errors.contactPerson ? styles.errorInput : ''}
              />
              {errors.contactPerson && (
                <span className={styles.errorMsg}>{errors.contactPerson}</span>
              )}
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="contactNumber">
                  Contact Number <span className={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  placeholder="09XX XXX XXXX"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className={errors.contactNumber ? styles.errorInput : ''}
                />
                {errors.contactNumber && (
                  <span className={styles.errorMsg}>{errors.contactNumber}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="alternateContact">
                  Alternate Contact (Optional)
                </label>
                <input
                  type="tel"
                  id="alternateContact"
                  name="alternateContact"
                  placeholder="Backup contact number"
                  value={formData.alternateContact}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="specialInstructions">
              Special Instructions (Optional)
            </label>
            <textarea
              id="specialInstructions"
              name="specialInstructions"
              placeholder="Any special instructions or notes for the pickup..."
              value={formData.specialInstructions}
              onChange={handleChange}
              className={styles.textarea}
              rows="4"
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
    </div>,
    document.body
  );
};

export default PickupScheduleForm;