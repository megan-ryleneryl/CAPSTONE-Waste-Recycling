import React, { useState, useEffect } from 'react';
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

  // Fetch regions on component mount
  useEffect(() => {
    fetchRegions();
  }, []);

  // Fetch provinces when region changes
  useEffect(() => {
    if (selectedRegion) {
      fetchProvinces(selectedRegion);
      // Reset downstream selections
      setSelectedProvince('');
      setSelectedCity('');
      setSelectedBarangay('');
      setCities([]);
      setBarangays([]);
    } else {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
  }, [selectedRegion]);

  // Fetch cities when province changes (or directly from region for NCR)
  useEffect(() => {
    if (selectedRegion === '130000000') {
      // NCR - fetch cities directly from region
      fetchCitiesFromRegion(selectedRegion);
    } else if (selectedProvince) {
      // Other regions - fetch cities from province
      fetchCitiesFromProvince(selectedProvince);
    }

    // Reset downstream selections
    setSelectedCity('');
    setSelectedBarangay('');
    setBarangays([]);
  }, [selectedProvince, selectedRegion]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (selectedCity) {
      fetchBarangays(selectedCity);
      setSelectedBarangay('');
    } else {
      setBarangays([]);
    }
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
