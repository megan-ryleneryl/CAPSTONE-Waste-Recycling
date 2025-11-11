import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './AddDisposalHubForm.module.css';
import { MapPin, X, Plus, Trash2, Navigation } from 'lucide-react';
import PSGCService from '../../services/psgcService';
import ModalPortal from '../modal/ModalPortal';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icon for the pin
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background-color: #ef4444;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 16px;
        color: white;
        font-weight: bold;
      ">O</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to handle map clicks
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

const AddDisposalHubForm = ({ onClose, onSuccess, userLocation }) => {
  // Default to Metro Manila (Quezon City)
  const defaultLocation = { lat: 14.6760, lng: 121.0437 };
  const [formData, setFormData] = useState({
    name: '',
    type: 'MRF',
    coordinates: userLocation || defaultLocation,
    address: {
      street: '',
      region: '',
      province: '',
      city: '',
      barangay: '',
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

  // PSGC Location States
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const materialOptions = [
    'Plastic', 'Paper', 'Cardboard', 'Metal', 'Aluminum', 'Glass',
    'Electronics', 'Batteries', 'Appliances', 'Organic Waste',
    'Textiles', 'Wood', 'Rubber', 'E-waste'
  ];

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

    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        region: regionCode,
        province: isNCR ? 'NCR' : '',
        city: '',
        barangay: ''
      }
    }));

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
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        province: provinceCode,
        city: '',
        barangay: ''
      }
    }));

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
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        city: cityCode,
        barangay: ''
      }
    }));

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
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        barangay: e.target.value
      }
    }));
  };

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

  const handleMapClick = (latlng) => {
    setFormData(prev => ({
      ...prev,
      coordinates: {
        lat: latlng.lat.toFixed(6),
        lng: latlng.lng.toFixed(6)
      }
    }));
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6)
            }
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please click on the map or enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
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

      if (!formData.address.region || !formData.address.city || !formData.address.barangay || !formData.address.street) {
        setError('Please complete all address fields');
        setLoading(false);
        return;
      }

      // Get the names from the selected codes
      const selectedRegion = regions.find(r => r.code === formData.address.region);
      const selectedProvince = provinces.find(p => p.code === formData.address.province);
      const selectedCity = cities.find(c => c.code === formData.address.city);
      const selectedBarangay = barangays.find(b => b.code === formData.address.barangay);

      // Build the complete address string
      const addressParts = [
        formData.address.street,
        selectedBarangay?.name,
        selectedCity?.name,
        selectedProvince?.name,
        selectedRegion?.name
      ].filter(Boolean);

      // Prepare submission data with formatted address
      const submissionData = {
        ...formData,
        address: addressParts.join(', '),
        location: {
          region: {
            code: formData.address.region,
            name: selectedRegion?.name || ''
          },
          province: selectedProvince ? {
            code: formData.address.province,
            name: selectedProvince.name
          } : null,
          city: {
            code: formData.address.city,
            name: selectedCity?.name || ''
          },
          barangay: {
            code: formData.address.barangay,
            name: selectedBarangay?.name || ''
          },
          street: formData.address.street
        }
      };

      const response = await axios.post(
        'http://localhost:3001/api/disposal-hubs/suggest',
        submissionData,
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
    <ModalPortal>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.header}>
              <h2 className={styles.title}>
                <MapPin size={24} />
                Suggest a Disposal Hub
              </h2>
              <button className={styles.closeButton} onClick={onClose} type="button">
                <X size={24} />
              </button>
            </div>

          <form id="disposal-hub-form" onSubmit={handleSubmit} className={styles.form}>
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
            <h3 className={styles.sectionTitle}>
              <MapPin size={20} />
              Location
            </h3>

            <div className={styles.mapInstruction}>
              <p>Click on the map to set the location, or use the button below to use your current location.</p>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className={styles.useLocationButton}
              >
                <Navigation size={16} />
                Use My Current Location
              </button>
            </div>

            <div className={styles.mapContainer}>
              <MapContainer
                center={[
                  parseFloat(formData.coordinates.lat) || defaultLocation.lat,
                  parseFloat(formData.coordinates.lng) || defaultLocation.lng
                ]}
                zoom={13}
                className={styles.leafletMap}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onLocationSelect={handleMapClick} />
                {formData.coordinates.lat && formData.coordinates.lng && (
                  <Marker
                    position={[
                      parseFloat(formData.coordinates.lat),
                      parseFloat(formData.coordinates.lng)
                    ]}
                    icon={customIcon}
                  />
                )}
              </MapContainer>
            </div>

            <div className={styles.coordinateDisplay}>
              <div className={styles.coordInfo}>
                <label>Latitude:</label>
                <span>{formData.coordinates.lat || 'Click on map'}</span>
              </div>
              <div className={styles.coordInfo}>
                <label>Longitude:</label>
                <span>{formData.coordinates.lng || 'Click on map'}</span>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.required}>Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="coordinates.lat"
                  value={formData.coordinates.lat}
                  onChange={handleChange}
                  placeholder="14.6760"
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
                  placeholder="121.0437"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.required}>Region</label>
              <select
                value={formData.address.region}
                onChange={handleRegionChange}
                className={styles.select}
                disabled={loadingLocations}
                required
              >
                <option value="">Select Region</option>
                {regions.map(region => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.address.region && !regions.find(r => r.code === formData.address.region)?.name.includes('NCR') && (
              <div className={styles.formGroup}>
                <label className={styles.required}>Province</label>
                <select
                  value={formData.address.province}
                  onChange={handleProvinceChange}
                  className={styles.select}
                  disabled={loadingLocations || !formData.address.region}
                  required
                >
                  <option value="">Select Province</option>
                  {provinces.map(province => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.required}>City/Municipality</label>
              <select
                value={formData.address.city}
                onChange={handleCityChange}
                className={styles.select}
                disabled={loadingLocations || !formData.address.region || (!formData.address.province && formData.address.region !== '130000000')}
                required
              >
                <option value="">Select City/Municipality</option>
                {cities.map(city => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.required}>Barangay</label>
              <select
                value={formData.address.barangay}
                onChange={handleBarangayChange}
                className={styles.select}
                disabled={loadingLocations || !formData.address.city}
                required
              >
                <option value="">Select Barangay</option>
                {barangays.map(barangay => (
                  <option key={barangay.code} value={barangay.code}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.required}>Street Address</label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                placeholder="123 Main Street, Building Name, Floor, etc."
                className={styles.input}
                required
              />
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

          </form>

          {/* Note Banner */}
          <p className={styles.note}>
            Note: Your suggestion will be reviewed by our team before being added to the map.
          </p>

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
              form="disposal-hub-form"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Suggestion'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default AddDisposalHubForm;
