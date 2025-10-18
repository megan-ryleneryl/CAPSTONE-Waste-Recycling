import React, { useState, useEffect } from 'react';
import styles from './PreferredModal.module.css';
import PSGCService from '../../services/psgcService';
import { MapPin } from 'lucide-react';

const PreferredLocationsModal = ({ onClose, onSubmit, currentLocations = [] }) => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({
    name: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    addressLine: '',
  });
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // Location dropdown states for the new location form
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    // Initialize with current locations
    if (currentLocations && currentLocations.length > 0) {
      setLocations(currentLocations);
    }
  }, [currentLocations]);

  // Load regions on component mount
  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoadingLocations(true);
    try {
      const data = await PSGCService.getRegions();
      setRegions(data);
    } catch (error) {
      console.error('Error loading regions:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleRegionChange = async (e) => {
    const regionCode = e.target.value;
    const selectedRegion = regions.find(r => r.code === regionCode);

    const isNCR = selectedRegion && (
      selectedRegion.name.includes('NCR') ||
      selectedRegion.name.includes('National Capital Region') ||
      regionCode === '130000000'
    );

    setNewLocation({
      ...newLocation,
      region: regionCode,
      province: isNCR ? 'NCR' : '',
      city: '',
      barangay: ''
    });

    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (regionCode) {
      setLoadingLocations(true);
      try {
        if (isNCR) {
          const data = await PSGCService.getCitiesFromRegion(regionCode);
          setCities(data);
        } else {
          const data = await PSGCService.getProvinces(regionCode);
          setProvinces(data);
        }
      } catch (error) {
        console.error('Error loading location data:', error);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleProvinceChange = async (e) => {
    const provinceCode = e.target.value;
    setNewLocation({
      ...newLocation,
      province: provinceCode,
      city: '',
      barangay: ''
    });

    setCities([]);
    setBarangays([]);

    if (provinceCode) {
      setLoadingLocations(true);
      try {
        const data = await PSGCService.getCitiesMunicipalities(provinceCode);
        setCities(data);
      } catch (error) {
        console.error('Error loading cities/municipalities:', error);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleCityChange = async (e) => {
    const cityCode = e.target.value;
    setNewLocation({
      ...newLocation,
      city: cityCode,
      barangay: ''
    });

    setBarangays([]);

    if (cityCode) {
      setLoadingLocations(true);
      try {
        const data = await PSGCService.getBarangays(cityCode);
        setBarangays(data);
      } catch (error) {
        console.error('Error loading barangays:', error);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleBarangayChange = (e) => {
    setNewLocation({
      ...newLocation,
      barangay: e.target.value
    });
  };

  const getLocationDisplayString = (location) => {
    const parts = [];
    if (location.barangay?.name) parts.push(location.barangay.name);
    if (location.city?.name) parts.push(location.city.name);
    if (location.province?.name && location.province.name !== 'NCR') parts.push(location.province.name);
    if (location.region?.name) parts.push(location.region.name);

    return parts.join(', ');
  };

  const isAddLocationFormValid = newLocation.name && 
    newLocation.region && 
    newLocation.city && 
    newLocation.barangay && 
    newLocation.addressLine && 
    (newLocation.region === '130000000' || newLocation.province);

  const handleAddLocation = () => {
    if (!isAddLocationFormValid) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedRegion = regions.find(r => r.code === newLocation.region);
    const selectedProvince = provinces.find(p => p.code === newLocation.province);
    const selectedCity = cities.find(c => c.code === newLocation.city);
    const selectedBarangay = barangays.find(b => b.code === newLocation.barangay);

    // Build structured location object (same format as post location)
    const locationData = {
      name: newLocation.name,
      region: {
        code: newLocation.region,
        name: selectedRegion?.name || ''
      },
      province: selectedProvince ? {
        code: newLocation.province,
        name: selectedProvince.name
      } : null,
      city: {
        code: newLocation.city,
        name: selectedCity?.name || ''
      },
      barangay: {
        code: newLocation.barangay,
        name: selectedBarangay?.name || ''
      },
      addressLine: newLocation.addressLine
    };

    setLocations([...locations, locationData]);

    // Reset form
    setNewLocation({
      name: '',
      region: '',
      province: '',
      city: '',
      barangay: '',
      addressLine: '',
    });
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setIsAddingLocation(false);
  };

  const handleRemoveLocation = (index) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this location?'
    );
    
    if (confirmed) {
      setLocations(locations.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create FormData object
    const formData = new FormData();
    
    // Append locations as JSON string
    formData.append('preferredLocations', JSON.stringify(locations));
    
    // Call the onSubmit callback with FormData
    onSubmit(formData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const selectedRegion = regions.find(r => r.code === newLocation.region);
  const isNCR = selectedRegion && (
    selectedRegion.name.includes('NCR') ||
    selectedRegion.name.includes('National Capital Region') ||
    newLocation.region === '130000000'
  );

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
                  {locations.map((location, index) => (
                    <div key={index} className={styles.locationCard}>
                      <div className={styles.locationHeader}>
                        <div className={styles.locationInfo}>
                          <h4 className={styles.locationName}>
                            {location.name}
                          </h4>
                          <p className={styles.locationAddress}>
                            {getLocationDisplayString(location)}
                          </p>
                          <p className={styles.locationInstructions}>
                            {location.addressLine}
                          </p>
                        </div>
                      </div>
                      <div className={styles.locationActions}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(index)}
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

                  <div className={styles.locationSectionInModal}>
                    <h4 className={styles.formTitle}>
                      <MapPin size={16} /> Address Details
                    </h4>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="region" className={styles.label}>
                          Region *
                        </label>
                        <select
                          id="region"
                          value={newLocation.region}
                          onChange={handleRegionChange}
                          className={styles.select}
                          required
                          disabled={loadingLocations || regions.length === 0}
                        >
                          <option value="">
                            {loadingLocations ? 'Loading...' : 'Select Region'}
                          </option>
                          {regions.map((region) => (
                            <option key={region.code} value={region.code}>
                              {region.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {newLocation.region && !isNCR && (
                        <div className={styles.formGroup}>
                          <label htmlFor="province" className={styles.label}>
                            Province *
                          </label>
                          <select
                            id="province"
                            value={newLocation.province}
                            onChange={handleProvinceChange}
                            className={styles.select}
                            required
                            disabled={!newLocation.region || loadingLocations}
                          >
                            <option value="">
                              {loadingLocations ? 'Loading...' : 'Select Province'}
                            </option>
                            {provinces.map((province) => (
                              <option key={province.code} value={province.code}>
                                {province.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="city" className={styles.label}>
                          City/Municipality *
                        </label>
                        <select
                          id="city"
                          value={newLocation.city}
                          onChange={handleCityChange}
                          className={styles.select}
                          required
                          disabled={!newLocation.region || (!isNCR && !newLocation.province) || loadingLocations}
                        >
                          <option value="">
                            {loadingLocations ? 'Loading...' : 'Select City/Municipality'}
                          </option>
                          {cities.map((city) => (
                            <option key={city.code} value={city.code}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="barangay" className={styles.label}>
                          Barangay *
                        </label>
                        <select
                          id="barangay"
                          value={newLocation.barangay}
                          onChange={handleBarangayChange}
                          className={styles.select}
                          required
                          disabled={!newLocation.city || loadingLocations}
                        >
                          <option value="">
                            {loadingLocations ? 'Loading...' : 'Select Barangay'}
                          </option>
                          {barangays.map((barangay) => (
                            <option key={barangay.code} value={barangay.code}>
                              {barangay.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="addressLine" className={styles.label}>
                      Specific Address / Landmark *
                    </label>
                    <textarea
                      id="addressLine"
                      placeholder="e.g., Unit 5B, Greenview Bldg., near 7-Eleven"
                      value={newLocation.addressLine}
                      onChange={(e) => setNewLocation({
                        ...newLocation,
                        addressLine: e.target.value
                      })}
                      className={styles.textarea}
                      rows={2}
                      required
                    />
                    <span className={styles.hint}>
                      Be specific to help collectors find your location
                    </span>
                  </div>

                  <div className={styles.addLocationActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingLocation(false);
                        setNewLocation({
                          name: '',
                          region: '',
                          province: '',
                          city: '',
                          barangay: '',
                          addressLine: '',
                        });
                        setProvinces([]);
                        setCities([]);
                        setBarangays([]);
                      }}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className={styles.saveButton}
                      disabled={!isAddLocationFormValid}
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