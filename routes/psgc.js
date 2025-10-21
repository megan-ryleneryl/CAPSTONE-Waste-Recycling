// routes/psgc.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

// NCR cities with CORRECT PSGC codes
const NCR_CITIES = [
  // First District
  { code: '133900000', name: 'City of Manila', regionCode: '130000000' },
  
  // Second District
  { code: '137401000', name: 'City of Mandaluyong', regionCode: '130000000' },
  { code: '137402000', name: 'City of Marikina', regionCode: '130000000' },
  { code: '137403000', name: 'City of Pasig', regionCode: '130000000' },
  { code: '137405000', name: 'City of San Juan', regionCode: '130000000' },
  { code: '137404000', name: 'Quezon City', regionCode: '130000000' },
  
  // Third District
  { code: '137501000', name: 'Caloocan City', regionCode: '130000000' },
  { code: '137502000', name: 'City of Malabon', regionCode: '130000000' },
  { code: '137503000', name: 'City of Navotas', regionCode: '130000000' },
  { code: '137504000', name: 'City of Valenzuela', regionCode: '130000000' },
  
  // Fourth District
  { code: '137601000', name: 'City of Las Piñas', regionCode: '130000000' },
  { code: '137602000', name: 'City of Makati', regionCode: '130000000' },
  { code: '137603000', name: 'City of Muntinlupa', regionCode: '130000000' },
  { code: '137604000', name: 'City of Parañaque', regionCode: '130000000' },
  { code: '137605000', name: 'Pasay City', regionCode: '130000000' },
  { code: '137607000', name: 'Taguig City', regionCode: '130000000' },
  { code: '137606000', name: 'Pateros', regionCode: '130000000' }
];

// Get all regions
router.get('/regions', async (req, res) => {
  try {
    const response = await axios.get(`${PSGC_BASE_URL}/regions/`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error fetching regions:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch regions' });
  }
});

// Get provinces by region code
router.get('/regions/:regionCode/provinces', async (req, res) => {
  try {
    const { regionCode } = req.params;
    
    // NCR doesn't have provinces, return empty array
    if (regionCode === '130000000') {
      return res.json({ success: true, data: [] });
    }
    
    const response = await axios.get(`${PSGC_BASE_URL}/regions/${regionCode}/provinces/`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error fetching provinces:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch provinces' });
  }
});

// Get cities/municipalities directly from region (for NCR)
router.get('/regions/:regionCode/cities-municipalities', async (req, res) => {
  try {
    const { regionCode } = req.params;
    
    console.log(`Fetching cities for region: ${regionCode}`);
    
    // Check if this is NCR (code: 130000000)
    if (regionCode === '130000000') {
      console.log('NCR detected, returning hardcoded cities');
      return res.json({ success: true, data: NCR_CITIES });
    }
    
    // For other regions, this shouldn't be called
    res.status(400).json({ 
      success: false, 
      error: 'This endpoint is only for NCR. Other regions should use provinces.' 
    });
  } catch (error) {
    console.error('Error in region cities endpoint:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch cities from region' });
  }
});

// Get cities/municipalities by province code
router.get('/provinces/:provinceCode/cities-municipalities', async (req, res) => {
  try {
    const { provinceCode } = req.params;
    console.log(`Fetching cities for province: ${provinceCode}`);
    
    const response = await axios.get(`${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities/`);
    
    console.log(`Found ${response.data.length} cities for province ${provinceCode}`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error fetching cities/municipalities:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch cities/municipalities' });
  }
});

// Get barangays by city/municipality code
router.get('/cities-municipalities/:cityCode/barangays', async (req, res) => {
  try {
    const { cityCode } = req.params;
    console.log(`Fetching barangays for city code: ${cityCode}`);
    
    const response = await axios.get(`${PSGC_BASE_URL}/cities-municipalities/${cityCode}/barangays/`);
    
    console.log(`Found ${response.data.length} barangays for city ${cityCode}`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error fetching barangays:', error.message);
    console.error('Failed city code:', req.params.cityCode);
    console.error('Error details:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch barangays',
      details: error.response?.data || error.message 
    });
  }
});

module.exports = router;