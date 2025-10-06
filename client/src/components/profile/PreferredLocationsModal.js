import React, { useState, useEffect } from 'react';
import styles from './PreferredModal.module.css';

const PreferredLocationsModal = ({ onClose, onSubmit, currentLocations = [] }) => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    instructions: '',
  });
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  useEffect(() => {
    // Initialize with current locations
    if (currentLocations && currentLocations.length > 0) {
      setLocations(currentLocations);
    }
  }, [currentLocations]);

  const handleAddLocation = () => {
    if (newLocation.name && newLocation.address) {
      setLocations([...locations, { ...newLocation, id: Date.now() }]);
      setNewLocation({
        name: '',
        address: '',
        instructions: '',
      });
      setIsAddingLocation(false);
    }
  };

  const handleRemoveLocation = (id) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  const handleSetPrimary = (id) => {
    setLocations(locations.map(loc => ({
      ...loc,
      isPrimary: loc.id === id
    })));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(locations);
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
            <h2>Manage Pickup Locations</h2>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Your Locations</h3>
                <button 
                  type="button"
                  onClick={() => setIsAddingLocation(true)}
                  className={styles.addButton}
                >
                  + Add Location
                </button>
              </div>

              {locations.length === 0 && !isAddingLocation ? (
                <div className={styles.emptyState}>
                  <p>No pickup locations added yet</p>
                  <button 
                    type="button"
                    onClick={() => setIsAddingLocation(true)}
                    className={styles.ctaButton}
                  >
                    Add Your First Location
                  </button>
                </div>
              ) : (
                <div className={styles.locationsList}>
                  {locations.map(location => (
                    <div key={location.id} className={styles.locationCard}>
                      <div className={styles.locationHeader}>
                        <div className={styles.locationInfo}>
                          <h4 className={styles.locationName}>
                            {location.name}
                            {location.isPrimary && (
                              <span className={styles.primaryBadge}>Primary</span>
                            )}
                          </h4>
                          <p className={styles.locationAddress}>{location.address}</p>
                          {location.instructions && (
                            <p className={styles.locationInstructions}>
                              Note: {location.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={styles.locationActions}>
                        {!location.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(location.id)}
                            className={styles.setPrimaryButton}
                          >
                            Set as Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(location.id)}
                          className={styles.deleteLocationButton}
                          aria-label="Remove location"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAddingLocation && (
                <div className={styles.addLocationForm}>
                  <h4 className={styles.formTitle}>Add New Location</h4>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Location Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., My Home, Main Office"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({
                        ...newLocation,
                        name: e.target.value
                      })}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Address *</label>
                    <textarea
                      placeholder="Enter complete address"
                      value={newLocation.address}
                      onChange={(e) => setNewLocation({
                        ...newLocation,
                        address: e.target.value
                      })}
                      className={styles.textarea}
                      rows={3}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Special Instructions 
                      <span className={styles.optional}>(Optional)</span>
                    </label>
                    <textarea
                      placeholder="e.g., Gate code, landmark, specific pickup point"
                      value={newLocation.instructions}
                      onChange={(e) => setNewLocation({
                        ...newLocation,
                        instructions: e.target.value
                      })}
                      className={styles.textarea}
                      rows={2}
                    />
                  </div>

                  <div className={styles.addLocationActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingLocation(false);
                        setNewLocation({
                          name: '',
                          address: '',
                          instructions: '',
                          type: 'home'
                        });
                      }}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className={styles.saveButton}
                      disabled={!newLocation.name || !newLocation.address}
                    >
                      Add Location
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                type="button" 
                onClick={onClose} 
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={locations.length === 0}
              >
                Save Locations
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PreferredLocationsModal;