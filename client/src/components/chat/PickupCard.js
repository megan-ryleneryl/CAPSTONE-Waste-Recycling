// client/src/components/chat/PickupCard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Calendar, Clock, MapPin, User, Phone, FileText, Save, Edit, CheckCircle, X, MapPinned } from 'lucide-react';
import PSGCService from '../../services/psgcService';
import styles from './PickupCard.module.css';

const PickupCard = ({ pickup, currentUser, onUpdateStatus, onEditPickup }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Helper to convert location object to string for editing
  const getLocationString = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;

    // If it's an object, format it as a string
    const parts = [];
    if (location.addressLine) parts.push(location.addressLine);
    if (location.barangay?.name) parts.push(location.barangay.name);
    if (location.city?.name) parts.push(location.city.name);
    if (location.province?.name) parts.push(location.province.name);
    if (location.region?.name) parts.push(location.region.name);
    return parts.join(', ');
  };

  // PSGC Location states for edit form
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [editForm, setEditForm] = useState({
    pickupDate: pickup.pickupDate || '',
    pickupTime: pickup.pickupTime || '',
    // PSGC Location fields
    region: pickup.pickupLocation?.region?.code || '',
    province: pickup.pickupLocation?.province?.code || '',
    city: pickup.pickupLocation?.city?.code || '',
    barangay: pickup.pickupLocation?.barangay?.code || '',
    addressLine: pickup.pickupLocation?.addressLine || '',
    contactPerson: pickup.contactPerson || '',
    contactNumber: pickup.contactNumber || '',
    specialInstructions: pickup.specialInstructions || ''
  });

  // Load regions when editing starts
  useEffect(() => {
    if (isEditing) {
      loadRegions();
      // If we have existing location data, load the cascading selectors
      if (pickup.pickupLocation?.region?.code) {
        loadInitialLocation();
      }
    }
  }, [isEditing]);

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

  const loadInitialLocation = async () => {
    const loc = pickup.pickupLocation;
    if (!loc) return;

    try {
      // Load provinces if not NCR
      if (loc.region?.code) {
        const selectedRegion = await PSGCService.getRegions().then(regions =>
          regions.find(r => r.code === loc.region.code)
        );
        const isNCR = selectedRegion && (
          selectedRegion.name.includes('NCR') ||
          selectedRegion.name.includes('National Capital Region') ||
          loc.region.code === '130000000'
        );

        if (isNCR) {
          const citiesData = await PSGCService.getCitiesFromRegion(loc.region.code);
          setCities(citiesData);
        } else if (loc.province?.code) {
          const provincesData = await PSGCService.getProvinces(loc.region.code);
          setProvinces(provincesData);
          const citiesData = await PSGCService.getCitiesMunicipalities(loc.province.code);
          setCities(citiesData);
        }
      }

      // Load barangays if city exists
      if (loc.city?.code) {
        const barangaysData = await PSGCService.getBarangays(loc.city.code);
        setBarangays(barangaysData);
      }
    } catch (error) {
      console.error('Error loading initial location:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Proposed': '#f59e0b',
      'Confirmed': '#10b981',
      'In-Transit': '#3b82f6',
      'ArrivedAtPickup': '#8b5cf6',
      'Completed': '#6b7280',
      'Cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLocation = (location) => {
    if (!location) return 'Location not set';

    // If location is a string (old format), return it as is
    if (typeof location === 'string') {
      return location;
    }

    // If location is an object (new PSGC format), format it nicely
    if (typeof location === 'object') {
      const parts = [];

      if (location.addressLine) parts.push(location.addressLine);
      if (location.barangay?.name) parts.push(location.barangay.name);
      if (location.city?.name) parts.push(location.city.name);
      if (location.province?.name) parts.push(location.province.name);
      if (location.region?.name) parts.push(location.region.name);

      return parts.length > 0 ? parts.join(', ') : 'Location not set';
    }

    return 'Location not set';
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegionChange = async (e) => {
    const regionCode = e.target.value;
    const selectedRegion = regions.find(r => r.code === regionCode);

    const isNCR = selectedRegion && (
      selectedRegion.name.includes('NCR') ||
      selectedRegion.name.includes('National Capital Region') ||
      regionCode === '130000000'
    );

    setEditForm({
      ...editForm,
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
    setEditForm({
      ...editForm,
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
    setEditForm({
      ...editForm,
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
    setEditForm({
      ...editForm,
      barangay: e.target.value
    });
  };

  const handleEditSubmit = async () => {
    try {
      // Build structured location object
      const selectedRegion = regions.find(r => r.code === editForm.region);
      const selectedProvince = provinces.find(p => p.code === editForm.province);
      const selectedCity = cities.find(c => c.code === editForm.city);
      const selectedBarangay = barangays.find(b => b.code === editForm.barangay);

      const locationData = {
        region: {
          code: editForm.region,
          name: selectedRegion?.name || ''
        },
        province: selectedProvince ? {
          code: editForm.province,
          name: selectedProvince.name
        } : null,
        city: {
          code: editForm.city,
          name: selectedCity?.name || ''
        },
        barangay: {
          code: editForm.barangay,
          name: selectedBarangay?.name || ''
        },
        addressLine: editForm.addressLine
      };

      const updatedData = {
        pickupDate: editForm.pickupDate,
        pickupTime: editForm.pickupTime,
        pickupLocation: locationData,
        contactPerson: editForm.contactPerson,
        contactNumber: editForm.contactNumber,
        specialInstructions: editForm.specialInstructions
      };

      await onEditPickup(pickup.id, updatedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating pickup:', error);
      alert('Failed to update pickup schedule');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    setEditForm({
      pickupDate: pickup.pickupDate || '',
      pickupTime: pickup.pickupTime || '',
      region: pickup.pickupLocation?.region?.code || '',
      province: pickup.pickupLocation?.province?.code || '',
      city: pickup.pickupLocation?.city?.code || '',
      barangay: pickup.pickupLocation?.barangay?.code || '',
      addressLine: pickup.pickupLocation?.addressLine || '',
      contactPerson: pickup.contactPerson || '',
      contactNumber: pickup.contactNumber || '',
      specialInstructions: pickup.specialInstructions || ''
    });
    // Reset location dropdowns
    setProvinces([]);
    setCities([]);
    setBarangays([]);
  };

  const isGiver = currentUser?.userID === pickup.giverID;
  const isCollector = currentUser?.userID === pickup.collectorID;
  const canEdit = pickup.status === 'Proposed' && isCollector && pickup.proposedBy === currentUser?.userID;
  const canConfirm = pickup.status === 'Proposed' && isGiver;
  const canCancel = pickup.status !== 'Completed' && pickup.status !== 'Cancelled';
  // Removed canComplete - completion should only happen through the modal
  const canStartPickup = pickup.status === 'Confirmed' && isCollector;

  if (isEditing) {
    return (
      <div className={styles.pickupCard} style={{ borderLeftColor: getStatusColor(pickup.status) }}>
        <div className={styles.header}>
          <h4 className={styles.title}>
            <Edit size={18} />
            <span>Edit Pickup Schedule</span>
          </h4>
          <span className={styles.statusBadge} style={{ backgroundColor: `${getStatusColor(pickup.status)}20`, color: getStatusColor(pickup.status) }}>
            {pickup.status}
          </span>
        </div>

        <div className={styles.editForm}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Date</label>
              <input
                type="date"
                name="pickupDate"
                value={editForm.pickupDate}
                onChange={handleEditChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.formField}>
              <label>Time</label>
              <input
                type="time"
                name="pickupTime"
                value={editForm.pickupTime}
                onChange={handleEditChange}
              />
            </div>
          </div>

          {/* PSGC Location Fields */}
          <div className={styles.formField}>
            <label>Region *</label>
            <select
              name="region"
              value={editForm.region}
              onChange={handleRegionChange}
              disabled={loadingLocations}
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

          {/* Province dropdown - hidden for NCR */}
          {editForm.region && (() => {
            const selectedRegion = regions.find(r => r.code === editForm.region);
            const isNCR = selectedRegion && (
              selectedRegion.name.includes('NCR') ||
              selectedRegion.name.includes('National Capital Region') ||
              editForm.region === '130000000'
            );

            return !isNCR && (
              <div className={styles.formField}>
                <label>Province *</label>
                <select
                  name="province"
                  value={editForm.province}
                  onChange={handleProvinceChange}
                  disabled={!editForm.region || loadingLocations}
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
            );
          })()}

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>City/Municipality *</label>
              <select
                name="city"
                value={editForm.city}
                onChange={handleCityChange}
                disabled={(() => {
                  const selectedRegion = regions.find(r => r.code === editForm.region);
                  const isNCR = selectedRegion && (
                    selectedRegion.name.includes('NCR') ||
                    selectedRegion.name.includes('National Capital Region') ||
                    editForm.region === '130000000'
                  );
                  return (!editForm.region || (!isNCR && !editForm.province) || loadingLocations);
                })()}
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

            <div className={styles.formField}>
              <label>Barangay *</label>
              <select
                name="barangay"
                value={editForm.barangay}
                onChange={handleBarangayChange}
                disabled={!editForm.city || loadingLocations}
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

          <div className={styles.formField}>
            <label>Specific Address / Landmark *</label>
            <input
              type="text"
              name="addressLine"
              placeholder="e.g., Unit 5B, Greenview Bldg., near 7-Eleven"
              value={editForm.addressLine}
              onChange={handleEditChange}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                value={editForm.contactPerson}
                onChange={handleEditChange}
                placeholder="Name of contact person"
              />
            </div>
            <div className={styles.formField}>
              <label>Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                value={editForm.contactNumber}
                onChange={handleEditChange}
                placeholder="Contact number"
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label>Special Instructions</label>
            <textarea
              name="specialInstructions"
              value={editForm.specialInstructions}
              onChange={handleEditChange}
              rows="3"
              placeholder="Any special instructions..."
            />
          </div>

          <div className={styles.editActions}>
            <button className={styles.saveButton} onClick={handleEditSubmit}>
              <Save size={18} />
              <span>Save Changes</span>
            </button>
            <button className={styles.cancelEditButton} onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pickupCard} style={{ borderLeftColor: getStatusColor(pickup.status) }}>
      <div className={styles.header}>
        <h4 className={styles.title}>
          <Truck size={15} />
          <span> Pickup Schedule</span>
        </h4>
        <span 
          className={styles.statusBadge} 
          style={{ backgroundColor: `${getStatusColor(pickup.status)}20`, color: getStatusColor(pickup.status) }}
        >
          {pickup.status}
        </span>
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <Calendar className={styles.icon} size={18} />
          <span>{formatDate(pickup.pickupDate)}</span>
        </div>
        <div className={styles.detailItem}>
          <Clock className={styles.icon} size={18} />
          <span>{pickup.pickupTime || 'Time not set'}</span>
        </div>
        <div className={styles.detailItem}>
          <MapPin className={styles.icon} size={18} />
          <span>{formatLocation(pickup.pickupLocation)}</span>
        </div>
        <div className={styles.detailItem}>
          <User className={styles.icon} size={18} />
          <span>{pickup.contactPerson || 'Contact not set'}</span>
        </div>
        <div className={styles.detailItem}>
          <Phone className={styles.icon} size={18} />
          <span>{pickup.contactNumber || 'Number not set'}</span>
        </div>
        {pickup.specialInstructions && (
          <div className={styles.detailItem}>
            <FileText className={styles.icon} size={18} />
            <span>{pickup.specialInstructions}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {/* Track Pickup button - always show for confirmed/in-progress/completed pickups */}
        {['Confirmed', 'In-Transit', 'ArrivedAtPickup', 'Completed'].includes(pickup.status) && (
          <button
            className={styles.trackButton}
            onClick={() => navigate(`/tracking/${pickup.pickupID || pickup.id}`)}
          >
            <MapPinned size={18} />
            <span>Track Pickup</span>
          </button>
        )}

        {canEdit && (
          <button
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
          >
            <Edit size={18} />
            <span>Edit</span>
          </button>
        )}

        {canConfirm && (
          <>
            <button
              className={styles.confirmButton}
              onClick={() => onUpdateStatus('Confirmed')}
            >
              <CheckCircle size={18} />
              <span>Confirm</span>
            </button>
            <button
              className={styles.declineButton}
              onClick={() => onUpdateStatus('Cancelled')}
            >
              <X size={18} />
              <span>Decline</span>
            </button>
          </>
        )}

        {canStartPickup && (
          <button
            className={styles.startButton}
            onClick={() => onUpdateStatus('In-Transit')}
          >
            <Truck size={18} />
            <span>On the Way</span>
          </button>
        )}

        {canCancel && !canConfirm && !canEdit && (
          <button
            className={styles.cancelButton}
            onClick={() => onUpdateStatus('Cancelled')}
          >
            Cancel Pickup
          </button>
        )}
      </div>
    </div>
  );
};

export default PickupCard;