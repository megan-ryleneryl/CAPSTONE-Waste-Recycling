// client/src/components/chat/PickupScheduleForm.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Calendar } from 'lucide-react';
import styles from './PickupScheduleForm.module.css';
import PSGCService from '../../services/psgcService';

const PickupScheduleForm = ({ post, giverPreferences, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    pickupDate: '',
    pickupTime: '',
    // PSGC Location fields
    region: '',
    province: '',
    city: '',
    barangay: '',
    addressLine: '',
    contactPerson: '',
    contactNumber: '',
    alternateContact: '',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // PSGC Location states
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Load regions on mount
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

    setFormData({
      ...formData,
      region: regionCode,
      province: isNCR ? 'NCR' : '',
      city: '',
      barangay: ''
    });

    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (errors.region) {
      setErrors(prev => ({ ...prev, region: '' }));
    }

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
    setFormData({
      ...formData,
      province: provinceCode,
      city: '',
      barangay: ''
    });

    setCities([]);
    setBarangays([]);

    if (errors.province) {
      setErrors(prev => ({ ...prev, province: '' }));
    }

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
    setFormData({
      ...formData,
      city: cityCode,
      barangay: ''
    });

    setBarangays([]);

    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }

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
    setFormData({
      ...formData,
      barangay: e.target.value
    });

    if (errors.barangay) {
      setErrors(prev => ({ ...prev, barangay: '' }));
    }
  };

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

    // Location validation
    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    const selectedRegion = regions.find(r => r.code === formData.region);
    const isNCR = selectedRegion && (
      selectedRegion.name.includes('NCR') ||
      selectedRegion.name.includes('National Capital Region') ||
      formData.region === '130000000'
    );

    if (!isNCR && !formData.province) {
      newErrors.province = 'Province is required';
    }

    if (!formData.city) {
      newErrors.city = 'City/Municipality is required';
    }

    if (!formData.barangay) {
      newErrors.barangay = 'Barangay is required';
    }

    if (!formData.addressLine.trim()) {
      newErrors.addressLine = 'Specific address is required';
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
      // Build structured location object
      const selectedRegion = regions.find(r => r.code === formData.region);
      const selectedProvince = provinces.find(p => p.code === formData.province);
      const selectedCity = cities.find(c => c.code === formData.city);
      const selectedBarangay = barangays.find(b => b.code === formData.barangay);

      const locationData = {
        region: {
          code: formData.region,
          name: selectedRegion?.name || ''
        },
        province: selectedProvince ? {
          code: formData.province,
          name: selectedProvince.name
        } : null,
        city: {
          code: formData.city,
          name: selectedCity?.name || ''
        },
        barangay: {
          code: formData.barangay,
          name: selectedBarangay?.name || ''
        },
        addressLine: formData.addressLine
      };

      // Prepare data to submit (replace individual location fields with structured location)
      const dataToSubmit = {
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        pickupLocation: locationData, // Send as structured object
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        alternateContact: formData.alternateContact,
        specialInstructions: formData.specialInstructions
      };

      await onSubmit(dataToSubmit);
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

          {/* PSGC Location Fields */}
          <div className={styles.field}>
            <label htmlFor="region">
              Region <span className={styles.required}>*</span>
            </label>
            <select
              id="region"
              name="region"
              value={formData.region}
              onChange={handleRegionChange}
              className={errors.region ? styles.errorInput : ''}
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
            {errors.region && (
              <span className={styles.errorMsg}>{errors.region}</span>
            )}
          </div>

          {/* Province dropdown - hidden for NCR */}
          {formData.region && (() => {
            const selectedRegion = regions.find(r => r.code === formData.region);
            const isNCR = selectedRegion && (
              selectedRegion.name.includes('NCR') ||
              selectedRegion.name.includes('National Capital Region') ||
              formData.region === '130000000'
            );

            return !isNCR && (
              <div className={styles.field}>
                <label htmlFor="province">
                  Province <span className={styles.required}>*</span>
                </label>
                <select
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleProvinceChange}
                  className={errors.province ? styles.errorInput : ''}
                  disabled={!formData.region || loadingLocations}
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
                {errors.province && (
                  <span className={styles.errorMsg}>{errors.province}</span>
                )}
              </div>
            );
          })()}

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="city">
                City/Municipality <span className={styles.required}>*</span>
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleCityChange}
                className={errors.city ? styles.errorInput : ''}
                disabled={(() => {
                  const selectedRegion = regions.find(r => r.code === formData.region);
                  const isNCR = selectedRegion && (
                    selectedRegion.name.includes('NCR') ||
                    selectedRegion.name.includes('National Capital Region') ||
                    formData.region === '130000000'
                  );
                  return (!formData.region || (!isNCR && !formData.province) || loadingLocations);
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
              {errors.city && (
                <span className={styles.errorMsg}>{errors.city}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="barangay">
                Barangay <span className={styles.required}>*</span>
              </label>
              <select
                id="barangay"
                name="barangay"
                value={formData.barangay}
                onChange={handleBarangayChange}
                className={errors.barangay ? styles.errorInput : ''}
                disabled={!formData.city || loadingLocations}
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
              {errors.barangay && (
                <span className={styles.errorMsg}>{errors.barangay}</span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="addressLine">
              Specific Address / Landmark <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="addressLine"
              name="addressLine"
              placeholder="e.g., Unit 5B, Greenview Bldg., near 7-Eleven"
              value={formData.addressLine}
              onChange={handleChange}
              className={errors.addressLine ? styles.errorInput : ''}
            />
            {errors.addressLine && (
              <span className={styles.errorMsg}>{errors.addressLine}</span>
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