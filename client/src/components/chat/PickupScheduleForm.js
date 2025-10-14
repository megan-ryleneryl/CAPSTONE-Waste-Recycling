// client/src/components/chat/PickupScheduleForm.js
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Calendar } from 'lucide-react';
import styles from './PickupScheduleForm.module.css';

const PickupScheduleForm = ({ post, giverPreferences, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    pickupDate: '',
    pickupTime: '',
    pickupLocation: '',
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

    if (!formData.pickupDate) {
      newErrors.pickupDate = 'Pickup date is required';
    }

    if (!formData.pickupTime) {
      newErrors.pickupTime = 'Pickup time is required';
    }

    if (!formData.pickupLocation.trim()) {
      newErrors.pickupLocation = 'Pickup location is required';
    }

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
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting pickup schedule:', error);
      alert('Failed to schedule pickup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

          <div className={styles.field}>
            <label htmlFor="pickupLocation">
              Pickup Location <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="pickupLocation"
              name="pickupLocation"
              placeholder="Complete address or landmark"
              value={formData.pickupLocation}
              onChange={handleChange}
              className={errors.pickupLocation ? styles.errorInput : ''}
            />
            {errors.pickupLocation && (
              <span className={styles.errorMsg}>{errors.pickupLocation}</span>
            )}
          </div>

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