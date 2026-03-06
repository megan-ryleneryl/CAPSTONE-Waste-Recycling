import React, { useState, useEffect } from 'react';
import styles from './PreferredModal.module.css';
import PSGCService from '../../services/psgcService';
import GeocodingService from '../../services/geocodingService';
import { MapPin, Loader } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect/SearchableSelect';

const UserLocationModal = ({ onClose, onSubmit, currentLocation = null }) => {
  const [location, setLocation] = useState({
    region: '',
    province: '',
    city: '',
    barangay: ''
  });
  const [geocoding, setGeocoding] = useState(false);
  const [geocodingResult, setGeocodingResult] = useState(null);

  // Location dropdown states
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    loadRegions();
  }, []);

  // Initialize with current location if exists
  useEffect(() => {
    if (currentLocation) {
      setLocation({
        region: currentLocation.region?.code || '',
        province: currentLocation.province?.code || '',
        city: currentLocation.city?.code || '',
        barangay: currentLocation.barangay?.code || ''
      });

      // Load provinces, cities, and barangays based on current location
      if (currentLocation.region?.code) {
        loadProvincesOrCities(currentLocation.region.code, currentLocation.region.name);
      }
      if (currentLocation.province?.code) {
        loadCities(currentLocation.province.code);
      }
      if (currentLocation.city?.code) {
        loadBarangays(currentLocation.city.code);
      }
    }
  }, [currentLocation]);

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

  const loadProvincesOrCities = async (regionCode, regionName) => {
    const isNCR = regionName && (
      regionName.includes('NCR') ||
      regionName.includes('National Capital Region') ||
      regionCode === '130000000'
    );

    setLoadingLocations(true);
    try {
      if (isNCR) {
        const data = await PSGCService.getCitiesFromRegion(regionCode);
        setCities(data);
        setProvinces([]);
      } else {
        const data = await PSGCService.getProvinces(regionCode);
        setProvinces(data);
        setCities([]);
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadCities = async (provinceCode) => {
    setLoadingLocations(true);
    try {
      const data = await PSGCService.getCitiesMunicipalities(provinceCode);
      setCities(data);
    } catch (error) {
      console.error('Error loading cities/municipalities:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadBarangays = async (cityCode) => {
    setLoadingLocations(true);
    try {
      const data = await PSGCService.getBarangays(cityCode);
      setBarangays(data);
    } catch (error) {
      console.error('Error loading barangays:', error);
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

    setLocation({
      region: regionCode,
      province: isNCR ? 'NCR' : '',
      city: '',
      barangay: ''
    });

    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setGeocodingResult(null);

    if (regionCode) {
      await loadProvincesOrCities(regionCode, selectedRegion.name);
    }
  };

  const handleProvinceChange = async (e) => {
    const provinceCode = e.target.value;
    setLocation({
      ...location,
      province: provinceCode,
      city: '',
      barangay: ''
    });

    setCities([]);
    setBarangays([]);
    setGeocodingResult(null);

    if (provinceCode) {
      await loadCities(provinceCode);
    }
  };

  const handleCityChange = async (e) => {
    const cityCode = e.target.value;
    setLocation({
      ...location,
      city: cityCode,
      barangay: ''
    });

    setBarangays([]);
    setGeocodingResult(null);

    if (cityCode) {
      await loadBarangays(cityCode);
    }
  };

  const handleBarangayChange = (e) => {
    setLocation({
      ...location,
      barangay: e.target.value
    });
    setGeocodingResult(null);
  };

  const handleGeocode = async () => {
    if (!isFormValid) {
      alert('Please select all required fields');
      return;
    }

    setGeocoding(true);
    setGeocodingResult(null);

    try {
      const selectedRegion = regions.find(r => r.code === location.region);
      const selectedProvince = provinces.find(p => p.code === location.province);
      const selectedCity = cities.find(c => c.code === location.city);
      const selectedBarangay = barangays.find(b => b.code === location.barangay);

      const locationObj = {
        region: {
          code: location.region,
          name: selectedRegion?.name || ''
        },
        province: selectedProvince ? {
          code: location.province,
          name: selectedProvince.name
        } : null,
        city: {
          code: location.city,
          name: selectedCity?.name || ''
        },
        barangay: {
          code: location.barangay,
          name: selectedBarangay?.name || ''
        }
      };

      const result = await GeocodingService.getCoordinates(locationObj);

      if (result) {
        setGeocodingResult({
          success: true,
          coordinates: { lat: result.lat, lng: result.lng },
          fallbackLevel: result.fallbackLevel,
          isFallback: result.isFallback
        });
      } else {
        setGeocodingResult({
          success: false,
          error: 'Unable to geocode this location. Please try again.'
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodingResult({
        success: false,
        error: 'An error occurred while geocoding. Please try again.'
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure we have geocoding results
    if (!geocodingResult || !geocodingResult.success) {
      alert('Please geocode your location first by clicking "Get Coordinates"');
      return;
    }

    const selectedRegion = regions.find(r => r.code === location.region);
    const selectedProvince = provinces.find(p => p.code === location.province);
    const selectedCity = cities.find(c => c.code === location.city);
    const selectedBarangay = barangays.find(b => b.code === location.barangay);

    const userLocationData = {
      region: {
        code: location.region,
        name: selectedRegion?.name || ''
      },
      province: selectedProvince ? {
        code: location.province,
        name: selectedProvince.name
      } : null,
      city: {
        code: location.city,
        name: selectedCity?.name || ''
      },
      barangay: {
        code: location.barangay,
        name: selectedBarangay?.name || ''
      },
      coordinates: geocodingResult.coordinates,
      fallbackLevel: geocodingResult.fallbackLevel
    };

    onSubmit(userLocationData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const selectedRegion = regions.find(r => r.code === location.region);
  const isNCR = selectedRegion && (
    selectedRegion.name.includes('NCR') ||
    selectedRegion.name.includes('National Capital Region') ||
    location.region === '130000000'
  );

  const isFormValid = location.region &&
    location.city &&
    location.barangay &&
    (location.region === '130000000' || location.province);

  const getLocationDisplayString = () => {
    const parts = [];
    const selectedBarangay = barangays.find(b => b.code === location.barangay);
    const selectedCity = cities.find(c => c.code === location.city);
    const selectedProvince = provinces.find(p => p.code === location.province);
    const selectedRegion = regions.find(r => r.code === location.region);

    if (selectedBarangay) parts.push(selectedBarangay.name);
    if (selectedCity) parts.push(selectedCity.name);
    if (selectedProvince && selectedProvince.name !== 'NCR') parts.push(selectedProvince.name);
    if (selectedRegion) parts.push(selectedRegion.name);

    return parts.join(', ');
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <button onClick={onClose} className={styles.closeButton}>×</button>
            <h2>Set Your Recycling Community</h2>
          </div>

          <p className={styles.modalDescription}>
            Choose your barangay to see posts from your local community and help us track active recyclers in your area!
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.locationSectionInModal}>
              <h4 className={styles.formTitle}>
                <MapPin size={16} /> Select Your Barangay
              </h4>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="region" className={styles.label}>
                    Region *
                  </label>
                  <SearchableSelect
                    id="region"
                    value={location.region}
                    onChange={handleRegionChange}
                    options={regions}
                    getOptionValue={(r) => r.code}
                    getOptionLabel={(r) => r.name}
                    placeholder={loadingLocations ? 'Loading...' : 'Select Region'}
                    disabled={loadingLocations || regions.length === 0}
                  />
                </div>

                {location.region && !isNCR && (
                  <div className={styles.formGroup}>
                    <label htmlFor="province" className={styles.label}>
                      Province *
                    </label>
                    <SearchableSelect
                      id="province"
                      value={location.province}
                      onChange={handleProvinceChange}
                      options={provinces}
                      getOptionValue={(p) => p.code}
                      getOptionLabel={(p) => p.name}
                      placeholder={loadingLocations ? 'Loading...' : 'Select Province'}
                      disabled={!location.region || loadingLocations}
                    />
                  </div>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="city" className={styles.label}>
                    City/Municipality *
                  </label>
                  <SearchableSelect
                    id="city"
                    value={location.city}
                    onChange={handleCityChange}
                    options={cities}
                    getOptionValue={(c) => c.code}
                    getOptionLabel={(c) => c.name}
                    placeholder={loadingLocations ? 'Loading...' : 'Select City/Municipality'}
                    disabled={!location.region || (!isNCR && !location.province) || loadingLocations}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="barangay" className={styles.label}>
                    Barangay *
                  </label>
                  <SearchableSelect
                    id="barangay"
                    value={location.barangay}
                    onChange={handleBarangayChange}
                    options={barangays}
                    getOptionValue={(b) => b.code}
                    getOptionLabel={(b) => b.name}
                    placeholder={loadingLocations ? 'Loading...' : 'Select Barangay'}
                    disabled={!location.city || loadingLocations}
                  />
                </div>
              </div>

              {/* Geocoding section */}
              {isFormValid && (
                <div className={styles.geocodingSection}>
                  <div className={styles.selectedLocation}>
                    <strong>Selected Location:</strong> {getLocationDisplayString()}
                  </div>

                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={geocoding}
                    className={styles.geocodeButton}
                  >
                    {geocoding ? (
                      <>
                        <Loader size={16} className={styles.spinner} />
                        Getting Coordinates...
                      </>
                    ) : (
                      <>
                        <MapPin size={16} />
                        Get Coordinates
                      </>
                    )}
                  </button>

                  {geocodingResult && (
                    <div className={geocodingResult.success ? styles.geocodingSuccess : styles.geocodingError}>
                      {geocodingResult.success ? (
                        <>
                          <div>Location found!</div>
                          <div className={styles.coordinates}>
                            Coordinates: {geocodingResult.coordinates.lat.toFixed(6)}, {geocodingResult.coordinates.lng.toFixed(6)}
                          </div>
                          {geocodingResult.isFallback && (
                            <div className={styles.fallbackNotice}>
                              Using {geocodingResult.fallbackLevel}-level coordinates
                            </div>
                          )}
                        </>
                      ) : (
                        <div> {geocodingResult.error}</div>
                      )}
                    </div>
                  )}
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
                disabled={!geocodingResult || !geocodingResult.success}
              >
                Save Location
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserLocationModal;
