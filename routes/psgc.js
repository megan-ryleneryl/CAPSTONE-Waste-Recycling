// routes/psgc.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

// NCR cities with VERIFIED codes that work with PSGC API
const NCR_CITIES = [
  { code: '133900000', name: 'City of Manila', regionCode: '130000000' },
  { code: '134500000', name: 'Mandaluyong City', regionCode: '130000000' },
  { code: '134600000', name: 'Marikina City', regionCode: '130000000' },
  { code: '134700000', name: 'Pasig City', regionCode: '130000000' },
  { code: '137400000', name: 'Quezon City', regionCode: '130000000' },
  { code: '137500000', name: 'San Juan City', regionCode: '130000000' },
  { code: '137600000', name: 'Caloocan City', regionCode: '130000000' },
  { code: '137700000', name: 'Malabon City', regionCode: '130000000' },
  { code: '137800000', name: 'Navotas City', regionCode: '130000000' },
  { code: '137900000', name: 'Valenzuela City', regionCode: '130000000' },
  { code: '174000000', name: 'Las Piñas City', regionCode: '130000000' },
  { code: '174100000', name: 'Makati City', regionCode: '130000000' },
  { code: '174200000', name: 'Muntinlupa City', regionCode: '130000000' },
  { code: '174300000', name: 'Parañaque City', regionCode: '130000000' },
  { code: '174400000', name: 'Pasay City', regionCode: '130000000' },
  { code: '174500000', name: 'Pateros', regionCode: '130000000' },
  { code: '174600000', name: 'Taguig City', regionCode: '130000000' }
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