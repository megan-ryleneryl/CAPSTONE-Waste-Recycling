import React, { useState } from 'react';
import axios from 'axios';
import styles from './AddDisposalHubForm.module.css';
import { MapPin, X, Plus, Trash2 } from 'lucide-react';

const AddDisposalHubForm = ({ onClose, onSuccess, userLocation }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'MRF',
    coordinates: userLocation || { lat: '', lng: '' },
    address: {
      street: '',
      barangay: '',
      city: '',
      province: '',
      region: '',
      postalCode: ''
    },
    acceptedMaterials: [],
    operatingHours: {
      monday: '8:00 AM - 5:00 PM',
      tuesday: '8:00 AM - 5:00 PM',
      wednesday: '8:00 AM - 5:00 PM',
      thursday: '8:00 AM - 5:00 PM',
      friday: '8:00 AM - 5:00 PM',
      saturday: '8:00 AM - 12:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    description: ''
  });

  const [newMaterial, setNewMaterial] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const materialOptions = [
    'Plastic', 'Paper', 'Cardboard', 'Metal', 'Aluminum', 'Glass',
    'Electronics', 'Batteries', 'Appliances', 'Organic Waste',
    'Textiles', 'Wood', 'Rubber', 'E-waste'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddMaterial = (material) => {
    if (material && !formData.acceptedMaterials.includes(material)) {
      setFormData(prev => ({
        ...prev,
        acceptedMaterials: [...prev.acceptedMaterials, material]
      }));
      setNewMaterial('');
    }
  };

  const handleRemoveMaterial = (material) => {
    setFormData(prev => ({
      ...prev,
      acceptedMaterials: prev.acceptedMaterials.filter(m => m !== material)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (!token) {
        setError('You must be logged in to suggest a disposal hub');
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.type) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (!formData.coordinates.lat || !formData.coordinates.lng) {
        setError('Please provide valid coordinates');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        'http://localhost:3001/api/disposal-hubs/suggest',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        if (onSuccess) {
          onSuccess(response.data.data);
        }
        alert('Thank you! Your disposal hub suggestion has been submitted for review.');
        onClose();
      }
    } catch (err) {
      console.error('Error suggesting disposal hub:', err);
      setError(err.response?.data?.message || 'Failed to submit suggestion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <MapPin size={24} />
            Suggest a Disposal Hub
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>

            <div className={styles.formGroup}>
              <label className={styles.required}>Hub Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Green Earth MRF"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.required}>Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={styles.select}
                required
              >
                <option value="MRF">MRF (Material Recovery Facility)</option>
                <option value="Junk Shop">Junk Shop</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the disposal hub..."
                className={styles.textarea}
                rows="3"
              />
            </div>
          </div>

          {/* Location */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Location</h3>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.required}>Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="coordinates.lat"
                  value={formData.coordinates.lat}
                  onChange={handleChange}
                  placeholder="14.5995"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="coordinates.lng"
                  value={formData.coordinates.lng}
                  onChange={handleChange}
                  placeholder="121.0000"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Street Address</label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                placeholder="123 Main Street"
                className={styles.input}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Barangay</label>
                <input
                  type="text"
                  name="address.barangay"
                  value={formData.address.barangay}
                  onChange={handleChange}
                  placeholder="Barangay"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>City/Municipality</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="City"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Province</label>
                <input
                  type="text"
                  name="address.province"
                  value={formData.address.province}
                  onChange={handleChange}
                  placeholder="Province"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Region</label>
                <input
                  type="text"
                  name="address.region"
                  value={formData.address.region}
                  onChange={handleChange}
                  placeholder="NCR"
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Accepted Materials */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Accepted Materials</h3>

            <div className={styles.materialSelector}>
              <select
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a material</option>
                {materialOptions.map(material => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddMaterial(newMaterial)}
                className={styles.addButton}
                disabled={!newMaterial}
              >
                <Plus size={18} />
                Add
              </button>
            </div>

            <div className={styles.materialList}>
              {formData.acceptedMaterials.map(material => (
                <div key={material} className={styles.materialTag}>
                  {material}
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterial(material)}
                    className={styles.removeButton}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Contact Information</h3>

            <div className={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                name="contact.phone"
                value={formData.contact.phone}
                onChange={handleChange}
                placeholder="+63 2 1234 5678"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                name="contact.email"
                value={formData.contact.email}
                onChange={handleChange}
                placeholder="contact@example.com"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Website</label>
              <input
                type="url"
                name="contact.website"
                value={formData.contact.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className={styles.input}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
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
              {loading ? 'Submitting...' : 'Submit Suggestion'}
            </button>
          </div>

          <p className={styles.note}>
            Note: Your suggestion will be reviewed by our team before being added to the map.
          </p>
        </form>
      </div>
    </div>
  );
};

export default AddDisposalHubForm;
