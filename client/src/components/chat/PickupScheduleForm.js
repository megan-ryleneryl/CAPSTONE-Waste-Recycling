// client/src/components/chat/PickupScheduleForm.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Calendar } from 'lucide-react';
import styles from './PickupScheduleForm.module.css';
import PSGCService from '../../services/psgcService';

const PickupScheduleForm = ({ post, giverPreferences, onSubmit, onCancel }) => {
  // Initialize material prices - collector specifies how much they'll pay per kilo for each material
  const initializeMaterialPrices = () => {
    if (!post?.materials || !Array.isArray(post.materials)) return [];

    return post.materials.map(material => ({
      materialID: material.materialID,
      materialName: material.materialName || material.name || 'Unknown Material',
      quantity: material.quantity || 0,
      pricePerKilo: 0, // Collector will fill this in
      averagePrice: 0 // Will be fetched from materials collection
    }));
  };

  // Initialize form with post data
  const [formData, setFormData] = useState({
    // Auto-fill from post data
    pickupDate: post?.pickupDate || '',
    pickupTime: post?.pickupTime || '',
    // Location fields
    region: post?.location?.region?.code || '',
    province: post?.location?.province?.code || post?.location?.province?.name || '',
    city: post?.location?.city?.code || '',
    barangay: post?.location?.barangay?.code || '',
    addressLine: post?.location?.addressLine || '',
    contactPerson: '',
    contactNumber: '',
    alternateContact: '',
    specialInstructions: ''
  });

  const [materialPrices, setMaterialPrices] = useState(initializeMaterialPrices());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // PSGC Location states
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Load regions on mount and trigger initial location data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const regionsData = await PSGCService.getRegions();
        setRegions(regionsData);

        // If form is prefilled with region data, load the dependent data
        if (formData.region && regionsData.length > 0) {
          const selectedRegion = regionsData.find(r => r.code === formData.region);
          const isNCR = selectedRegion && (
            selectedRegion.name.includes('NCR') ||
            selectedRegion.name.includes('National Capital Region') ||
            formData.region === '130000000'
          );

          setLoadingLocations(true);
          try {
            if (isNCR) {
              // For NCR, load cities directly
              const citiesData = await PSGCService.getCitiesFromRegion(formData.region);
              setCities(citiesData);
              console.log('Loaded NCR cities on mount:', citiesData.length);
            } else {
              // For other regions, load provinces
              const provincesData = await PSGCService.getProvinces(formData.region);
              setProvinces(provincesData);
              console.log('Loaded provinces on mount:', provincesData.length);

              // If province is also prefilled, load cities
              if (formData.province && formData.province !== 'NCR') {
                const citiesData = await PSGCService.getCitiesMunicipalities(formData.province);
                setCities(citiesData);
                console.log('Loaded cities on mount:', citiesData.length);
              }
            }

            // If city is prefilled, load barangays
            if (formData.city) {
              const barangaysData = await PSGCService.getBarangays(formData.city);
              setBarangays(barangaysData);
              console.log('Loaded barangays on mount:', barangaysData.length);
            }
          } catch (error) {
            console.error('Error loading prefilled location data:', error);
          } finally {
            setLoadingLocations(false);
          }
        }
      } catch (error) {
        console.error('Error loading regions:', error);
      }
    };
    loadInitialData();
  }, []); // Only run once on mount

  // Load provinces/cities when region is changed by user
  useEffect(() => {
    // Skip if this is initial load (regions are empty) or region hasn't actually changed
    if (regions.length === 0) return;

    const loadLocationData = async () => {
      if (!formData.region) return;

      const selectedRegion = regions.find(r => r.code === formData.region);
      const isNCR = selectedRegion && (
        selectedRegion.name.includes('NCR') ||
        selectedRegion.name.includes('National Capital Region') ||
        formData.region === '130000000'
      );

      setLoadingLocations(true);
      try {
        if (isNCR) {
          // For NCR, load cities directly
          const citiesData = await PSGCService.getCitiesFromRegion(formData.region);
          setCities(citiesData);
          console.log('Loaded NCR cities:', citiesData.length);
        } else {
          // For other regions, load provinces
          const provincesData = await PSGCService.getProvinces(formData.region);
          setProvinces(provincesData);
          console.log('Loaded provinces:', provincesData.length);
        }
      } catch (error) {
        console.error('Error loading location data:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocationData();
  }, [formData.region]); // Removed 'regions' from dependencies to avoid double-loading

  // Load cities when province is set
  useEffect(() => {
    const loadCities = async () => {
      if (!formData.province || formData.province === 'NCR') return;

      setLoadingLocations(true);
      try {
        const citiesData = await PSGCService.getCitiesMunicipalities(formData.province);
        setCities(citiesData);
      } catch (error) {
        console.error('Error loading cities:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadCities();
  }, [formData.province]);

  // Load barangays when city is set
  useEffect(() => {
    const loadBarangays = async () => {
      if (!formData.city) return;

      setLoadingLocations(true);
      try {
        const barangaysData = await PSGCService.getBarangays(formData.city);
        setBarangays(barangaysData);
      } catch (error) {
        console.error('Error loading barangays:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadBarangays();
  }, [formData.city]);

  // Fetch average prices for materials
  useEffect(() => {
    const fetchAveragePrices = async () => {
      if (materialPrices.length === 0) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/materials`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const materialsData = data.materials || data;

          // Update material prices with average prices
          setMaterialPrices(prev =>
            prev.map(material => {
              const matchedMaterial = materialsData.find(
                m => m.materialID === material.materialID
              );
              return {
                ...material,
                averagePrice: matchedMaterial?.averagePricePerKg || 0
              };
            })
          );
        }
      } catch (error) {
        console.error('Error fetching average prices:', error);
      }
    };

    fetchAveragePrices();
  }, []); // Run once on mount

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

  const handleRegionChange = (e) => {
    const regionCode = e.target.value;
    const selectedRegion = regions.find(r => r.code === regionCode);

    const isNCR = selectedRegion && (
      selectedRegion.name.includes('NCR') ||
      selectedRegion.name.includes('National Capital Region') ||
      regionCode === '130000000'
    );

    setFormData(prev => ({
      ...prev,
      region: regionCode,
      province: isNCR ? 'NCR' : '',
      city: '',
      barangay: ''
    }));

    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (errors.region) {
      setErrors(prev => ({ ...prev, region: '' }));
    }
  };

  const handleProvinceChange = (e) => {
    const provinceCode = e.target.value;

    setFormData(prev => ({
      ...prev,
      province: provinceCode,
      city: '',
      barangay: ''
    }));

    setCities([]);
    setBarangays([]);

    if (errors.province) {
      setErrors(prev => ({ ...prev, province: '' }));
    }
  };

  const handleCityChange = (e) => {
    const cityCode = e.target.value;

    setFormData(prev => ({
      ...prev,
      city: cityCode,
      barangay: ''
    }));

    setBarangays([]);

    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
  };

  // Helper function to check if selected region is NCR
  const isNCRRegion = () => {
    if (!formData.region || regions.length === 0) return false;
    const selectedRegion = regions.find(r => r.code === formData.region);
    return selectedRegion && (
      selectedRegion.name.includes('NCR') ||
      selectedRegion.name.includes('National Capital Region') ||
      formData.region === '130000000'
    );
  };

  const handleMaterialPriceChange = (materialID, value) => {
    setMaterialPrices(prev =>
      prev.map(m =>
        m.materialID === materialID
          ? { ...m, pricePerKilo: parseFloat(value) || 0 }
          : m
      )
    );
  };

  // Calculate total estimated price
  const calculateTotalPrice = () => {
    return materialPrices.reduce((total, material) => {
      return total + (material.quantity * material.pricePerKilo);
    }, 0);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.pickupDate) {
      newErrors.pickupDate = 'Pickup date is required';
    }

    if (!formData.pickupTime) {
      newErrors.pickupTime = 'Pickup time is required';
    }

    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    // Province is only required for non-NCR regions
    if (!isNCRRegion() && !formData.province) {
      newErrors.province = 'Province is required';
    }

    if (!formData.city) {
      newErrors.city = 'City/Municipality is required';
    }

    if (!formData.barangay) {
      newErrors.barangay = 'Barangay is required';
    }

    if (!formData.addressLine.trim()) {
      newErrors.addressLine = 'Street address is required';
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
      // Build location object from selected values
      const selectedRegion = regions.find(r => r.code === formData.region);

      // For NCR, set province to 'NCR'; otherwise, find the selected province
      let selectedProvince;
      if (isNCRRegion()) {
        selectedProvince = { code: 'NCR', name: 'NCR' };
      } else {
        selectedProvince = provinces.find(p => p.code === formData.province);
      }

      const selectedCity = cities.find(c => c.code === formData.city);
      const selectedBarangay = barangays.find(b => b.code === formData.barangay);

      const pickupLocation = {
        region: selectedRegion ? { code: selectedRegion.code, name: selectedRegion.name } : null,
        province: selectedProvince ? { code: selectedProvince.code, name: selectedProvince.name } : null,
        city: selectedCity ? { code: selectedCity.code, name: selectedCity.name } : null,
        barangay: selectedBarangay ? { code: selectedBarangay.code, name: selectedBarangay.name } : null,
        addressLine: formData.addressLine
      };

      // Format proposedPrice as array of { materialID, materialName, quantity, proposedPricePerKilo }
      const proposedPrice = materialPrices.map(material => ({
        materialID: material.materialID,
        materialName: material.materialName,
        quantity: material.quantity,
        proposedPricePerKilo: material.pricePerKilo
      }));

      const dataToSubmit = {
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        pickupLocation: pickupLocation,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        alternateContact: formData.alternateContact,
        specialInstructions: formData.specialInstructions,
        proposedPrice: proposedPrice, // Array of { materialID, materialName, quantity, proposedPricePerKilo }
        totalPrice: calculateTotalPrice() // Include calculated total
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Error submitting pickup schedule:', error);
      alert('Failed to schedule pickup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
              {post.price > 0 && ` • ₱${post.price}`}
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
          {/* Pickup Schedule Details - Now Editable */}
          <div className={styles.scheduleSection}>
            <h4 className={styles.sectionTitle}>Pickup Schedule Details</h4>

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
                min={new Date().toISOString().split('T')[0]}
                required
                className={errors.pickupDate ? styles.errorInput : ''}
              />
              {errors.pickupDate && (
                <span className={styles.errorMsg}>{errors.pickupDate}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="pickupTime">
                Pickup Time <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                id="pickupTime"
                name="pickupTime"
                value={formData.pickupTime}
                onChange={handleChange}
                required
                className={errors.pickupTime ? styles.errorInput : ''}
              />
              {errors.pickupTime && (
                <span className={styles.errorMsg}>{errors.pickupTime}</span>
              )}
            </div>
          </div>

          {/* Pickup Location - Editable */}
          <div className={styles.locationSection}>
            <h4 className={styles.sectionTitle}>Pickup Location</h4>

            <div className={styles.field}>
              <label htmlFor="region">
                Region <span className={styles.required}>*</span>
              </label>
              <select
                id="region"
                name="region"
                value={formData.region}
                onChange={handleRegionChange}
                required
                className={errors.region ? styles.errorInput : ''}
              >
                <option value="">Select Region</option>
                {regions.map(region => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
              {errors.region && (
                <span className={styles.errorMsg}>{errors.region}</span>
              )}
            </div>

            {formData.region && !isNCRRegion() && (
              <div className={styles.field}>
                <label htmlFor="province">
                  Province <span className={styles.required}>*</span>
                </label>
                <select
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleProvinceChange}
                  required
                  disabled={loadingLocations}
                  className={errors.province ? styles.errorInput : ''}
                >
                  <option value="">
                    {loadingLocations ? 'Loading provinces...' : provinces.length === 0 ? 'No provinces available' : 'Select Province'}
                  </option>
                  {provinces.map(province => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {errors.province && (
                  <span className={styles.errorMsg}>{errors.province}</span>
                )}
              </div>
            )}

            {/* City field: show if NCR or if province is selected */}
            {(isNCRRegion() || formData.province) && (
              <div className={styles.field}>
                <label htmlFor="city">
                  City/Municipality <span className={styles.required}>*</span>
                </label>
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleCityChange}
                  required
                  disabled={loadingLocations}
                  className={errors.city ? styles.errorInput : ''}
                >
                  <option value="">
                    {loadingLocations ? 'Loading cities...' : cities.length === 0 ? 'No cities available' : 'Select City/Municipality'}
                  </option>
                  {cities.map(city => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {errors.city && (
                  <span className={styles.errorMsg}>{errors.city}</span>
                )}
                {!loadingLocations && cities.length === 0 && formData.province && (
                  <span className={styles.errorMsg}>Failed to load cities. Please try selecting the region again.</span>
                )}
              </div>
            )}

            {formData.city && (
              <div className={styles.field}>
                <label htmlFor="barangay">
                  Barangay <span className={styles.required}>*</span>
                </label>
                <select
                  id="barangay"
                  name="barangay"
                  value={formData.barangay}
                  onChange={handleChange}
                  required
                  disabled={loadingLocations}
                  className={errors.barangay ? styles.errorInput : ''}
                >
                  <option value="">
                    {loadingLocations ? 'Loading barangays...' : barangays.length === 0 ? 'No barangays available' : 'Select Barangay'}
                  </option>
                  {barangays.map(barangay => (
                    <option key={barangay.code} value={barangay.code}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
                {errors.barangay && (
                  <span className={styles.errorMsg}>{errors.barangay}</span>
                )}
                {!loadingLocations && barangays.length === 0 && formData.city && (
                  <span className={styles.errorMsg}>Failed to load barangays. Please try selecting the city again.</span>
                )}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="addressLine">
                Street Address <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="addressLine"
                name="addressLine"
                placeholder="Street address, building number, etc."
                value={formData.addressLine}
                onChange={handleChange}
                required
                className={errors.addressLine ? styles.errorInput : ''}
              />
              {errors.addressLine && (
                <span className={styles.errorMsg}>{errors.addressLine}</span>
              )}
            </div>
          </div>

          {/* Material Pricing Section */}
          {materialPrices.length > 0 && (
            <div className={styles.pricingSection}>
              <h4 className={styles.sectionTitle}>Material Pricing</h4>
              <p className={styles.sectionDescription}>
                Specify how much you're willing to pay per kilogram for each material:
              </p>

              <div className={styles.materialsGrid}>
                {materialPrices.map((material) => (
                  <div key={material.materialID} className={styles.materialPriceItem}>
                    <div className={styles.materialInfo}>
                      <span className={styles.materialName}>{material.materialName}</span>
                      <span className={styles.materialQuantity}>{material.quantity} kg</span>
                    </div>
                    {material.averagePrice > 0 && (
                      <div className={styles.averagePriceNote}>
                        Average market price: ₱{material.averagePrice.toFixed(2)} / kg
                      </div>
                    )}
                    <div className={styles.priceInput}>
                      <span className={styles.currencySymbol}>₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={material.averagePrice > 0 ? material.averagePrice.toFixed(2) : "0.00"}
                        value={material.pricePerKilo || ''}
                        onChange={(e) => handleMaterialPriceChange(material.materialID, e.target.value)}
                        className={styles.priceField}
                      />
                      <span className={styles.priceUnit}>/ kg</span>
                    </div>
                    {material.pricePerKilo > 0 && (
                      <div className={styles.subtotal}>
                        Subtotal: ₱{(material.quantity * material.pricePerKilo).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {calculateTotalPrice() > 0 && (
                <div className={styles.totalPrice}>
                  <span className={styles.totalLabel}>Total Estimated Price:</span>
                  <span className={styles.totalAmount}>₱{calculateTotalPrice().toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Contact Information Fields - Editable */}
          <div className={styles.contactSection}>
            <h4 className={styles.sectionTitle}>Contact Information <span className={styles.required}>*</span></h4>

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