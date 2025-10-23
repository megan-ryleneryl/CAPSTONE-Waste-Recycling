import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './CreatePost.module.css';
import PSGCService from '../services/psgcService';
import MaterialSelector from '../components/posts/MaterialSelector/MaterialSelector';
import { Recycle, Sprout, MessageCircle, Package, MapPin, Tag, Calendar, Heart, MessageSquare, Goal, Clock, Weight, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Image, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const CreatePost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCollector, setIsCollector] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganization, setIsOrganization] = useState(false);
  const [isLocationExpanded, setIsLocationExpanded] = useState(true);

  const location = useLocation();

  // Start with whatever state was passed, or default to 'Waste'
  const [postType, setPostType] = useState(location.state?.postType || 'Waste');

  // Update if navigation provides a new postType after initial load
  useEffect(() => {
    if (location.state?.postType && location.state.postType !== postType) {
      setPostType(location.state.postType);
    }
  }, [location.state, postType]);

  // PSGC Location states
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  
  // Scroll to top when page loads (i.e. after redirect from Dashboard page)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    // Location fields (PSGC)
    region: '',
    province: '',
    city: '',
    barangay: '',
    addressLine: '',  
    // Waste specific
    materials: [], 
    quantity: '',
    unit: 'kg',
    pickupDate: '',
    pickupTime: '',
    // Initiative specific
    targetAmount: '',
    endDate: '',
    // Forum specific
    category: 'General',
    tags: ''
  });

  // Get user type on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/protected/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setIsCollector(response.data.user.isCollector || false);
        setIsAdmin(response.data.user.isAdmin || false);
        setIsOrganization(response.data.user.isOrganization || false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, []);

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
      setError('Failed to load regions. Please refresh the page.');
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleRegionChange = async (e) => {
    const regionCode = e.target.value;
    const selectedRegion = regions.find(r => r.code === regionCode);
  
    // Check if selected region is NCR (National Capital Region)
    const isNCR = selectedRegion && (
      selectedRegion.name.includes('NCR') || 
      selectedRegion.name.includes('National Capital Region') ||
      regionCode === '130000000' // NCR's region code
    );
    
    setFormData({
      ...formData,
      region: regionCode,
      province: isNCR ? 'NCR' : '', // Auto-set province to 'NCR' if it's NCR
      city: '',
      barangay: ''
  });
    
    // Reset dependent dropdowns
    setProvinces([]);
    setCities([]);
    setBarangays([]);
      
    if (regionCode) {
        setLoadingLocations(true);
        try {
          if (isNCR) {
            // For NCR, directly load cities/municipalities from region
            console.log('Loading NCR cities for region:', regionCode);
            const data = await PSGCService.getCitiesFromRegion(regionCode);
            console.log('NCR cities loaded:', data);
            setCities(data);
          } else {
            // For other regions, load provinces first
            const data = await PSGCService.getProvinces(regionCode);
            setProvinces(data);
          }
        } catch (error) {
          console.error('Error loading location data:', error);
          setError('Failed to load location data. Please try again.');
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
    
    // Reset dependent dropdowns
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
    setFormData({
      ...formData,
      city: cityCode,
      barangay: ''
    });
    
    // Reset barangays
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
    setFormData({
      ...formData,
      barangay: e.target.value
    });
  };


  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Validate form based on post type
  const validateForm = () => {
    // Common validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    
    // Location validation
    if (!formData.region) {
      setError('Please select a region');
      return false;
    }

    if (!formData.addressLine.trim()) {
      setError('Specific address is required');
      return false;
    }
    
    const selectedRegion = regions.find(r => r.code === formData.region);
    const isNCR = selectedRegion && (
    selectedRegion.name.includes('NCR') || 
    selectedRegion.name.includes('National Capital Region') ||
    formData.region === '130000000'
  );
  
    // Province is not required for NCR
    if (!isNCR && !formData.province) {
    setError('Please select a province');
    return false;
  }
    
    if (!formData.city) {
      setError('Please select a city/municipality');
      return false;
    }
    
    if (!formData.barangay) {
      setError('Please select a barangay');
      return false;
    }
    
    // Type-specific validation
      if (postType === 'Waste') {
        if (!formData.materials || formData.materials.length === 0) {
          setError('At least one material is required for Waste posts');
          return false;
        }
        
        // Validate each material has required fields
        for (let i = 0; i < formData.materials.length; i++) {
          const material = formData.materials[i];
          if (!material.materialID) {
            setError(`Please select a material for item ${i + 1}`);
            return false;
          }
          if (!material.quantity || material.quantity <= 0) {
            setError(`Please enter a valid quantity for item ${i + 1}`);
            return false;
          }
        }
      } else if (postType === 'Initiative') {
      // Validate materials array (new format)
      if (!formData.materials || formData.materials.length === 0) {
        setError('At least one material is required for Initiative posts');
        return false;
      }

      // Validate each material has required fields
      for (let i = 0; i < formData.materials.length; i++) {
        const material = formData.materials[i];
        if (!material.materialID) {
          setError(`Please select a material for item ${i + 1}`);
          return false;
        }
        if (!material.quantity || material.quantity <= 0) {
          setError(`Please enter a valid target quantity for item ${i + 1}`);
          return false;
        }
      }
    }
    
    return true;
  };

  // Get structured location data for API submission
  const getLocationData = () => {
    const selectedRegion = regions.find(r => r.code === formData.region);
    const selectedProvince = provinces.find(p => p.code === formData.province);
    const selectedCity = cities.find(c => c.code === formData.city);
    const selectedBarangay = barangays.find(b => b.code === formData.barangay);

    // Build structured location object
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

    return JSON.stringify(locationData);
  };

  // Get human-readable location string for display
  const getLocationDisplayString = () => {
    const selectedRegion = regions.find(r => r.code === formData.region);
    const selectedProvince = provinces.find(p => p.code === formData.province);
    const selectedCity = cities.find(c => c.code === formData.city);
    const selectedBarangay = barangays.find(b => b.code === formData.barangay);

    const parts = [];
    if (selectedBarangay?.name) parts.push(selectedBarangay.name);
    if (selectedCity?.name) parts.push(selectedCity.name);
    if (selectedProvince?.name && selectedProvince.name !== 'NCR') parts.push(selectedProvince.name);
    if (selectedRegion?.name) parts.push(selectedRegion.name);

    return parts.join(', ');
  };

// Handle image selection
const handleImageChange = (e) => {
  const files = Array.from(e.target.files);
  
  // Limit to 5 images
  if (files.length + selectedImages.length > 5) {
    setError('Maximum 5 images allowed');
    return;
  }
  
  // Validate file types and sizes
  const validFiles = [];
  const newPreviews = [];
  
  for (const file of files) {
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      continue;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Each image must be less than 5MB');
      continue;
    }
    
    validFiles.push(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      newPreviews.push(reader.result);
      if (newPreviews.length === validFiles.length) {
        setImagePreviews(prev => [...prev, ...newPreviews]);
      }
    };
    reader.readAsDataURL(file);
  }
  
  setSelectedImages(prev => [...prev, ...validFiles]);
};

// Remove selected image
const handleRemoveImage = (index) => {
  setSelectedImages(prev => prev.filter((_, i) => i !== index));
  setImagePreviews(prev => prev.filter((_, i) => i !== index));
};

  // Handle form submission
  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  setLoading(true);
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('You must be logged in to create a post');
      navigate('/login');
      return;
    }
    
    // Log the token (remove in production)
    console.log('Token exists:', !!token);
    console.log('Token preview:', token.substring(0, 20) + '...');

    // Prepare location data
    const locationData = getLocationData();

    // Prepare FormData for file upload
    const formDataToSend = new FormData();

    // Add all form fields
    formDataToSend.append('postType', postType);
    formDataToSend.append('title', formData.title.trim());
    formDataToSend.append('description', formData.description.trim());
    formDataToSend.append('location', locationData);

    // Add type-specific fields
    if (postType === 'Waste') {
      // Calculate total quantity from all materials
      const totalQuantity = formData.materials.reduce((sum, material) => {
        return sum + parseFloat(material.quantity || 0);
      }, 0);

      // Send materials as JSON string to preserve the structure
      formDataToSend.append('materials', JSON.stringify(formData.materials));
      formDataToSend.append('quantity', totalQuantity);
      formDataToSend.append('unit', 'kg');
      if (formData.pickupDate) formDataToSend.append('pickupDate', formData.pickupDate);
      if (formData.pickupTime) formDataToSend.append('pickupTime', formData.pickupTime);
    } else if (postType === 'Initiative') {
      // Send materials as JSON string to preserve structure (similar to Waste posts)
      formDataToSend.append('materials', JSON.stringify(formData.materials));
      formDataToSend.append('targetAmount', parseFloat(formData.targetAmount));
      if (formData.endDate) formDataToSend.append('endDate', formData.endDate);
    } else if (postType === 'Forum') {
      formDataToSend.append('category', formData.category);
      formDataToSend.append('tags', formData.tags);
    }

    // Add images
    selectedImages.forEach((image) => {
      formDataToSend.append('images', image);
    });

    // Make API call
    const response = await axios.post(
      'http://localhost:3001/api/posts/create',
      formDataToSend,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Log successful response
    console.log('Response received:', response.data);
    
    if (response.data.success) {
      // Show success message if you have a toast/notification system
      console.log(response.data.message);
      
      // Redirect to posts page or the created post
      navigate('/posts');
    }
  } catch (err) {
    // Enhanced error logging
    console.error('Error creating post:', err);
    
    if (err.response) {
      // The request was made and the server responded with an error status
      console.error('Error response data:', err.response.data);
      console.error('Error response status:', err.response.status);
      console.error('Error response headers:', err.response.headers);
      
      // Check for specific error types
      if (err.response.status === 401) {
        setError('Authentication failed. Please login again.');
        localStorage.removeItem('token'); // Clear invalid token
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response.status === 403) {
        setError(err.response.data?.message || 'You do not have permission to create this type of post');
      } else if (err.response.status === 400) {
        setError(err.response.data?.message || 'Invalid data provided. Please check your inputs.');
      } else {
        setError(err.response.data?.message || 'Failed to create post. Please try again.');
      }
    } else if (err.request) {
      // The request was made but no response was received
      console.error('No response received:', err.request);
      setError('No response from server. Please check your connection and try again.');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', err.message);
      setError('Failed to send request. Please try again.');
    }
  } finally {
    setLoading(false);
  }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/posts');
  };


  // Check if user can create initiative posts
  const canCreateInitiative = isCollector || isAdmin;

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/posts" className={styles.backButton}>
            ← Back to Posts
          </Link>
          <h1 className={styles.title}>Create New Post</h1>
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Post Type Selector */}
        <div className={styles.postTypeSelector}>
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Waste' ? styles.active : ''}`}
            onClick={() => setPostType('Waste')}
          >
            <span><Recycle size={16} /> Waste Post</span>
            <small>Offer recyclable materials</small>
          </button>
          
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Initiative' ? styles.active : ''}`}
            onClick={() => setPostType('Initiative')}
            disabled={!canCreateInitiative}
            title={!canCreateInitiative ? 'Only Collectors can create Initiative posts' : ''}
          >
            <span><Sprout size={16} /> Initiative</span>
            <small>{canCreateInitiative ? 'Start a green project' : ''}</small>
            {!canCreateInitiative && (
              <Link to="/profile" className={styles.signupLink}>
                Sign up as collector
              </Link>
            )}
          </button>
          
          <button
            type="button"
            className={`${styles.typeButton} ${postType === 'Forum' ? styles.active : ''}`}
            onClick={() => setPostType('Forum')}
          >
            <span><MessageCircle size={14} /> Forum Post</span>
            <small>Share and discuss</small>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Common Fields */}
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Give your post a clear title"
              required
              maxLength="100"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description *
              {postType === 'Initiative' && (
                <span className={styles.hint}>What are you doing? Describe the initiative details and activities</span>
              )}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder={
                postType === 'Initiative'
                  ? "e.g., We're collecting PET Bottles to create sustainable house bricks"
                  : "Provide details about your post"
              }
              rows="5"
              required
              maxLength="1000"
            />
          </div>

          {/* PSGC Location Fields */}
          <div className={styles.locationSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}><MapPin size={20}/> Location *</h3>
              <button
                type="button"
                className={styles.toggleButton}
                onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                aria-expanded={isLocationExpanded}
                aria-label={isLocationExpanded ? "Collapse location section" : "Expand location section"}
              >
                {isLocationExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {isLocationExpanded && (
              <>
                <p className={styles.sectionHint}>Select your complete address using the dropdowns below</p>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="region" className={styles.label}>
                  Region *
                </label>
                <select
                  id="region"
                  value={formData.region}
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

              {/* Only show province dropdown if NOT NCR */}
              {formData.region && (() => {
                const selectedRegion = regions.find(r => r.code === formData.region);
                const isNCR = selectedRegion && (
                  selectedRegion.name.includes('NCR') || 
                  selectedRegion.name.includes('National Capital Region') ||
                  formData.region === '130000000'
                );
                
                return !isNCR && (
                  <div className={styles.formGroup}>
                    <label htmlFor="province" className={styles.label}>
                      Province *
                    </label>
                    <select
                      id="province"
                      value={formData.province}
                      onChange={handleProvinceChange}
                      className={styles.select}
                      required
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
                  </div>
                );
              })()}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="city" className={styles.label}>
                  City/Municipality *
                </label>
                <select
                  id="city"
                  value={formData.city}
                  onChange={handleCityChange}
                  className={styles.select}
                  required
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
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="barangay" className={styles.label}>
                  Barangay *
                </label>
                <select
                  id="barangay"
                  value={formData.barangay}
                  onChange={handleBarangayChange}
                  className={styles.select}
                  required
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
              </div>
            </div>

            {/* Show selected location preview */}
            {formData.barangay && (
              <div className={styles.locationPreview}>
                <strong>Selected Location:</strong> {getLocationDisplayString()}
              </div>
            )}

            <div className={styles.formGroup}>
                <label htmlFor="addressLine" className={styles.label}>
                  Specific Address / Landmark *
                </label>
                <input
                  type="text"
                  id="addressLine"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g., Unit 5B, Greenview Bldg., near 7-Eleven"
                  required
                />
                <span className={styles.hint}>
                  Be specific to help collectors find your location
                </span>
              </div>
              </>
            )}
          </div> 


          {/* Waste-specific Fields */}
          {postType === 'Waste' && (
            <div className={styles.wasteSpecific}>
              <h3 className={styles.sectionTitle}>
                <Package size={20} /> Waste Details
              </h3>
              
              {/* Use Material Selector instead of text input */}
              <MaterialSelector
                selectedMaterials={formData.materials}
                onChange={(materials) => setFormData({ ...formData, materials })}
              />
              
              
              {/* Keep pickupDate and pickupTime */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="pickupDate" className={styles.label}>
                    Preferred Pickup Date
                  </label>
                  <input
                    type="date"
                    id="pickupDate"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                    className={styles.input}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="pickupTime" className={styles.label}>
                    Preferred Pickup Time
                  </label>
                  <input
                    type="time"
                    id="pickupTime"
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Initiative-specific Fields */}
          {postType === 'Initiative' && (
            <div className={styles.initiativeSpecific}>
              <h3 className={styles.sectionTitle}>
                <Goal size={20} /> Initiative Details
              </h3>

              {/* Material Selector - Materials Needed */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <span className={styles.hint}>Select the materials you need for this initiative</span>
                </label>
                <MaterialSelector
                  selectedMaterials={formData.materials}
                  onChange={(materials) => {
                    // Calculate total target amount from materials
                    const totalTarget = materials.reduce((sum, mat) => sum + parseFloat(mat.quantity || 0), 0);
                    setFormData({
                      ...formData,
                      materials,
                      targetAmount: totalTarget.toString()
                    });
                  }}
                  labelOverride={{
                    quantity: 'Target Quantity'
                  }}
                />
              </div>

              {/* Show calculated target amount */}
              {formData.materials && formData.materials.length > 0 && (
                <div className={styles.targetAmountDisplay}>
                  <BarChart3 size={16} />
                  <strong>Total Target Amount:</strong> {formData.targetAmount} kg
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="endDate" className={styles.label}>
                  <Clock size={16} /> End Date
                  <span className={styles.hint}>Optional deadline for this initiative</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={styles.input}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* Image Upload Section - For All Post Types */}
          <div className={styles.imageUploadSection}>
            <h3 className={styles.sectionTitle}>
              <Image size={20} /> Images (Optional)
            </h3>
            {/* <p className={styles.sectionHint}>Add up to 5 images to your post</p> */}
            
            <div className={styles.formGroup}>
              <label htmlFor="images" className={styles.label}>
                Upload Images
                <span className={styles.hint}>Max 5 images, 5MB each</span>
              </label>
              
              <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className={styles.fileInput}
                disabled={selectedImages.length >= 5}
              />
              
              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className={styles.imagePreviewContainer}>
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className={styles.imagePreview}>
                      <img src={preview} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className={styles.removeImageButton}
                        aria-label="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className={styles.imageCount}>
                {selectedImages.length} / 5 images selected
              </p>
            </div>
          </div>



          

          {/* Forum-specific Fields */}
          {postType === 'Forum' && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="category" className={styles.label}>
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={styles.select}
                  required
                >
                  <option value="General">General Discussion</option>
                  <option value="Tips">Tips & Guides</option>
                  <option value="News">News & Updates</option>
                  <option value="Questions">Questions</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tags" className={styles.label}>
                  Tags
                  <span className={styles.hint}>Separate with commas (optional)</span>
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g., recycling, environment, tips"
                  maxLength="200"
                />
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleCancel}
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
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Creating...
                </>
              ) : (
                `Create ${postType} Post`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;