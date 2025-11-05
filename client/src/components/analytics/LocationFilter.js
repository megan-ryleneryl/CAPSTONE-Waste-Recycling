import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './LocationFilter.module.css';
import { MapPin, X } from 'lucide-react';

const LocationFilter = ({ onFilterChange, currentFilter }) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState(currentFilter?.region || '');
  const [selectedProvince, setSelectedProvince] = useState(currentFilter?.province || '');
  const [selectedCity, setSelectedCity] = useState(currentFilter?.city || '');
  const [selectedBarangay, setSelectedBarangay] = useState(currentFilter?.barangay || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Track the last processed values to prevent multiple resets
  const lastProcessedRegion = useRef(null);
  const lastProcessedCity = useRef(null);
  const citiesFetched = useRef(false); // Track if cities have been fetched for NCR

  // Fetch regions on component mount
  useEffect(() => {
    fetchRegions();
  }, []);

  // Update internal state when currentFilter prop changes (from navigation)
  useEffect(() => {
    // Only update if the incoming filter is different from current selections
    const isFilterDifferent =
      currentFilter?.region !== selectedRegion ||
      currentFilter?.province !== selectedProvince ||
      currentFilter?.city !== selectedCity ||
      currentFilter?.barangay !== selectedBarangay;

    // Skip if filter hasn't changed - prevents unnecessary resets
    if (!isFilterDifferent) {
      return;
    }

    if (currentFilter && (
      currentFilter.region ||
      currentFilter.province ||
      currentFilter.city ||
      currentFilter.barangay
    )) {
      // Don't update if values are already set correctly (avoid unnecessary resets)
      if (currentFilter.region && !selectedRegion) {
        setIsInitializing(true);
        setSelectedRegion(currentFilter.region);

        // If province is also provided, fetch provinces first
        if (currentFilter.province) {
          fetchProvinces(currentFilter.region).then(() => {
            setSelectedProvince(currentFilter.province);

            // If city is also provided, fetch cities
            if (currentFilter.city) {
              let fetchCitiesPromise;
              if (currentFilter.region === '130000000') {
                // NCR - check if cities already fetched
                fetchCitiesPromise = citiesFetched.current
                  ? Promise.resolve()
                  : fetchCitiesFromRegion(currentFilter.region);

                if (!citiesFetched.current) {
                  citiesFetched.current = true;
                }
              } else {
                fetchCitiesPromise = fetchCitiesFromProvince(currentFilter.province);
              }

              fetchCitiesPromise.then(() => {
                setSelectedCity(currentFilter.city);

                // If barangay is also provided, fetch barangays
                if (currentFilter.barangay) {
                  fetchBarangays(currentFilter.city).then(() => {
                    setSelectedBarangay(currentFilter.barangay);
                    setIsInitializing(false);
                  });
                } else {
                  setIsInitializing(false);
                }
              });
            } else {
              setIsInitializing(false);
            }
          });
        } else if (currentFilter.city) {
          // NCR case - no province, direct to city
          const fetchPromise = citiesFetched.current
            ? Promise.resolve()
            : fetchCitiesFromRegion(currentFilter.region);

          if (!citiesFetched.current) {
            citiesFetched.current = true;
          }

          fetchPromise.then(() => {
            setSelectedCity(currentFilter.city);

            if (currentFilter.barangay) {
              fetchBarangays(currentFilter.city).then(() => {
                setSelectedBarangay(currentFilter.barangay);
                setIsInitializing(false);
              });
            } else {
              setIsInitializing(false);
            }
          });
        } else {
          setIsInitializing(false);
        }
      }
    }
  }, [currentFilter, selectedRegion, selectedProvince, selectedCity, selectedBarangay]);

  // Fetch provinces when region changes (but not during initialization)
  useEffect(() => {
    if (selectedRegion && !isInitializing && lastProcessedRegion.current !== selectedRegion) {
      lastProcessedRegion.current = selectedRegion;

      // For NCR, fetch cities directly (NCR has no provinces)
      if (selectedRegion === '130000000') {
        if (!citiesFetched.current) {
          fetchCitiesFromRegion(selectedRegion);
          citiesFetched.current = true;
        }
      } else {
        fetchProvinces(selectedRegion);
        setCities([]);
        citiesFetched.current = false;
      }
      // Reset downstream selections
      setSelectedProvince('');
      setSelectedCity('');
      setSelectedBarangay('');
      setBarangays([]);
    } else if (!selectedRegion) {
      lastProcessedRegion.current = null;
      citiesFetched.current = false;
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  // Fetch cities when province changes
  useEffect(() => {
    if (!isInitializing && selectedProvince) {
      // Other regions - fetch cities from province
      fetchCitiesFromProvince(selectedProvince);
      // Reset downstream selections only when province changes
      setSelectedCity('');
      setSelectedBarangay('');
      setBarangays([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvince]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (selectedCity && !isInitializing && lastProcessedCity.current !== selectedCity) {
      lastProcessedCity.current = selectedCity;
      fetchBarangays(selectedCity);
      setSelectedBarangay('');
    } else if (!selectedCity) {
      lastProcessedCity.current = null;
      setBarangays([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  // Notify parent component of filter changes
  useEffect(() => {
    const filter = {
      region: selectedRegion || null,
      province: selectedProvince || null,
      city: selectedCity || null,
      barangay: selectedBarangay || null
    };
    onFilterChange(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, selectedProvince, selectedCity, selectedBarangay]);

  const fetchRegions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:3001/api/psgc/regions');
      if (response.data.success) {
        setRegions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching regions:', err);
      setError('Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  const fetchProvinces = async (regionCode) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3001/api/psgc/regions/${regionCode}/provinces`);
      if (response.data.success) {
        setProvinces(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching provinces:', err);
      setError('Failed to load provinces');
    } finally {
      setLoading(false);
    }
  };

  const fetchCitiesFromRegion = async (regionCode) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3001/api/psgc/regions/${regionCode}/cities-municipalities`);
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching cities from region:', err);
      setError('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  const fetchCitiesFromProvince = async (provinceCode) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3001/api/psgc/provinces/${provinceCode}/cities-municipalities`);
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching cities from province:', err);
      setError('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  const fetchBarangays = async (cityCode) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3001/api/psgc/cities-municipalities/${cityCode}/barangays`);
      if (response.data.success) {
        setBarangays(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching barangays:', err);
      setError('Failed to load barangays');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setSelectedRegion('');
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setProvinces([]);
    setCities([]);
    setBarangays([]);
  };

  const getSelectedLocationLabel = () => {
    const parts = [];
    if (selectedBarangay) {
      const barangay = barangays.find(b => b.code === selectedBarangay);
      if (barangay) parts.push(barangay.name);
    }
    if (selectedCity) {
      const city = cities.find(c => c.code === selectedCity);
      if (city) parts.push(city.name);
    }
    if (selectedProvince) {
      const province = provinces.find(p => p.code === selectedProvince);
      if (province) parts.push(province.name);
    }
    if (selectedRegion) {
      const region = regions.find(r => r.code === selectedRegion);
      if (region) parts.push(region.name);
    }

    return parts.length > 0 ? parts.join(', ') : 'All Philippines';
  };

  return (
    <div className={styles.locationFilter}>
      <div className={styles.filterHeader}>
        <MapPin className={styles.filterIcon} size={20} />
        <h3>Filter by Location</h3>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filterControls}>
        <div className={styles.dropdownRow}>
          {/* Region Dropdown */}
          <div className={styles.dropdownGroup}>
            <label>Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              disabled={loading}
              className={styles.dropdown}
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          {/* Province Dropdown (hidden for NCR) */}
          {selectedRegion && selectedRegion !== '130000000' && (
            <div className={styles.dropdownGroup}>
              <label>Province</label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                disabled={loading || provinces.length === 0}
                className={styles.dropdown}
              >
                <option value="">All Provinces</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* City/Municipality Dropdown */}
          {(selectedProvince || selectedRegion === '130000000') && (
            <div className={styles.dropdownGroup}>
              <label>City/Municipality</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={loading || cities.length === 0}
                className={styles.dropdown}
              >
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Barangay Dropdown */}
          {selectedCity && (
            <div className={styles.dropdownGroup}>
              <label>Barangay</label>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                disabled={loading || barangays.length === 0}
                className={styles.dropdown}
              >
                <option value="">All Barangays</option>
                {barangays.map((barangay) => (
                  <option key={barangay.code} value={barangay.code}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.filterActions}>
          <div className={styles.selectedLocation}>
            <span className={styles.locationLabel}>Viewing:</span>
            <span className={styles.locationValue}>{getSelectedLocationLabel()}</span>
          </div>
          {(selectedRegion || selectedProvince || selectedCity || selectedBarangay) && (
            <button onClick={handleClearFilter} className={styles.clearButton}>
              <X size={16} />
              Clear Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationFilter;
