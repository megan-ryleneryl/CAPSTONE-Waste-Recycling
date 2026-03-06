import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './LocationFilter.module.css';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Package, MapPin } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect/SearchableSelect';

const WASTE_CATEGORIES = [
  { value: 'Paper', label: 'Paper' },
  { value: 'Plastic', label: 'Plastic' },
  { value: 'Metal', label: 'Metal' },
  { value: 'Glass', label: 'Glass' },
  { value: 'Electronics', label: 'Electronics' },
];

const LocationFilter = ({ onFilterChange, currentFilter, userLocation, wasteTypeFilter = [], onWasteTypeFilterChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
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

  // Update internal state when currentFilter prop changes (from navigation or external sources)
  useEffect(() => {
    // Normalize values for comparison (treat empty string and null as equivalent)
    const normalizeValue = (val) => val || null;

    // Check if external filter is different from current internal state
    const isFilterDifferent =
      normalizeValue(currentFilter?.region) !== normalizeValue(selectedRegion) ||
      normalizeValue(currentFilter?.province) !== normalizeValue(selectedProvince) ||
      normalizeValue(currentFilter?.city) !== normalizeValue(selectedCity) ||
      normalizeValue(currentFilter?.barangay) !== normalizeValue(selectedBarangay);

    if (!isFilterDifferent) {
      // Filter is already in sync, no need to update
      return;
    }

    // Always sync with external filter changes
    setIsInitializing(true);

    if (currentFilter && currentFilter.region) {
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
    } else if (!currentFilter || (!currentFilter.region && !currentFilter.province && !currentFilter.city && !currentFilter.barangay)) {
      // If no region in currentFilter or completely empty filter, clear all selections
      setSelectedRegion('');
      setSelectedProvince('');
      setSelectedCity('');
      setSelectedBarangay('');
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      setIsInitializing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilter]);

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

  // Notify parent component of filter changes (but not during initialization from external sources)
  useEffect(() => {
    // Skip notifying parent if we're still initializing from external filter
    if (isInitializing) {
      return;
    }

    const filter = {
      region: selectedRegion || null,
      province: selectedProvince || null,
      city: selectedCity || null,
      barangay: selectedBarangay || null
    };
    onFilterChange(filter);
  }, [selectedRegion, selectedProvince, selectedCity, selectedBarangay, onFilterChange, isInitializing]);

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

  const getUserLocationLabel = () => {
    if (!userLocation) return null;
    const parts = [];

    // Add locations from most specific to least specific
    if (userLocation.barangay?.name) {
      parts.push(userLocation.barangay.name);
    }
    if (userLocation.city?.name) {
      parts.push(userLocation.city.name);
    }
    // Only add province if it exists and is not NCR (NCR cities don't need province)
    if (userLocation.province?.name && userLocation.region?.code !== '130000000') {
      parts.push(userLocation.province.name);
    }
    // Only add region if user has no more specific location
    if (parts.length === 0 && userLocation.region?.name) {
      parts.push(userLocation.region.name);
    }

    return parts.length > 0 ? parts.join(', ') : null;
  };

  const handleApplyUserLocation = () => {
    if (!userLocation) return;

    const userLocationFilter = {
      region: userLocation.region?.code || null,
      province: userLocation.province?.code || null,
      city: userLocation.city?.code || null,
      barangay: userLocation.barangay?.code || null
    };

    onFilterChange(userLocationFilter);
  };

  const isUserLocationActive = () => {
    if (!userLocation) return false;
    return (
      selectedRegion === (userLocation.region?.code || null) &&
      selectedProvince === (userLocation.province?.code || null) &&
      selectedCity === (userLocation.city?.code || null) &&
      selectedBarangay === (userLocation.barangay?.code || null)
    );
  };

  const hasActiveFilters =
    !!(selectedRegion || selectedProvince || selectedCity || selectedBarangay) ||
    wasteTypeFilter.length > 0;

  const handleWasteTypeToggle = (value) => {
    if (!onWasteTypeFilterChange) return;
    const updated = wasteTypeFilter.includes(value)
      ? wasteTypeFilter.filter((v) => v !== value)
      : [...wasteTypeFilter, value];
    onWasteTypeFilterChange(updated);
  };

  const handleClearAll = () => {
    handleClearFilter();
    if (onWasteTypeFilterChange) onWasteTypeFilterChange([]);
  };

  return (
    <div className={styles.locationFilter}>
      {/* Header — always visible, toggles collapse */}
      <button
        className={styles.filterHeader}
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-expanded={!isCollapsed}
      >
        <div className={styles.filterHeaderLeft}>
          <SlidersHorizontal className={styles.filterIcon} size={20} />
          <h3>Filters</h3>
          {hasActiveFilters && <span className={styles.activeIndicator} />}
        </div>
        {isCollapsed ? <ChevronDown size={18} className={styles.chevron} /> : <ChevronUp size={18} className={styles.chevron} />}
      </button>

      {!isCollapsed && (
        <div className={styles.filterBody}>
          {error && <div className={styles.error}>{error}</div>}

          {/* User Location Suggestion */}
          {userLocation && !isUserLocationActive() && getUserLocationLabel() && (
            <div className={styles.userLocationSuggestion}>
              <span className={styles.suggestionText}>
                Want to see posts from your community?
              </span>
              <button
                onClick={handleApplyUserLocation}
                className={styles.suggestionButton}
              >
                View {getUserLocationLabel()}
              </button>
            </div>
          )}

          {/* ── Location section ── */}
          <div className={styles.sectionLabel}>
            <MapPin size={14} />
            Location
          </div>

          <div className={styles.filterControls}>
            <div className={styles.dropdownRow}>
              {/* Region Dropdown */}
              <div className={styles.dropdownGroup}>
                <label>Region</label>
                <SearchableSelect
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  options={regions}
                  getOptionValue={(r) => r.code}
                  getOptionLabel={(r) => r.name}
                  placeholder="All Regions"
                  emptyOption="All Regions"
                  disabled={loading}
                />
              </div>

              {/* Province Dropdown (hidden for NCR) */}
              {selectedRegion && selectedRegion !== '130000000' && (
                <div className={styles.dropdownGroup}>
                  <label>Province</label>
                  <SearchableSelect
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    options={provinces}
                    getOptionValue={(p) => p.code}
                    getOptionLabel={(p) => p.name}
                    placeholder="All Provinces"
                    emptyOption="All Provinces"
                    disabled={loading || provinces.length === 0}
                  />
                </div>
              )}

              {/* City/Municipality Dropdown */}
              {(selectedProvince || selectedRegion === '130000000') && (
                <div className={styles.dropdownGroup}>
                  <label>City/Municipality</label>
                  <SearchableSelect
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    options={cities}
                    getOptionValue={(c) => c.code}
                    getOptionLabel={(c) => c.name}
                    placeholder="All Cities"
                    emptyOption="All Cities"
                    disabled={loading || cities.length === 0}
                  />
                </div>
              )}

              {/* Barangay Dropdown */}
              {selectedCity && (
                <div className={styles.dropdownGroup}>
                  <label>Barangay</label>
                  <SearchableSelect
                    value={selectedBarangay}
                    onChange={(e) => setSelectedBarangay(e.target.value)}
                    options={barangays}
                    getOptionValue={(b) => b.code}
                    getOptionLabel={(b) => b.name}
                    placeholder="All Barangays"
                    emptyOption="All Barangays"
                    disabled={loading || barangays.length === 0}
                  />
                </div>
              )}
            </div>

            <div className={styles.filterActions}>
              <div className={styles.selectedLocation}>
                <span className={styles.locationLabel}>Viewing:</span>
                <span className={styles.locationValue}>{getSelectedLocationLabel()}</span>
              </div>
            </div>
          </div>

          {/* ── Waste Type section ── */}
          {onWasteTypeFilterChange && (
            <>
              <div className={styles.sectionDivider} />
              <div className={styles.sectionLabel}>
                <Package size={14} />
                Waste Type
              </div>
              <div className={styles.wasteTypeRow}>
                {WASTE_CATEGORIES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleWasteTypeToggle(value)}
                    className={`${styles.wasteTypeChip} ${wasteTypeFilter.includes(value) ? styles.wasteTypeChipActive : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Clear all */}
          {hasActiveFilters && (
            <div className={styles.clearRow}>
              <button onClick={handleClearAll} className={styles.clearButton}>
                <X size={16} />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationFilter;
