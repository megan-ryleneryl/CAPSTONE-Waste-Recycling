// routes/organizationRoutes.js
const express = require('express');
const router = express.Router();
const Organization = require('../models/Organizations');
const { verifyToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(verifyToken);

// Get organization by ID (for viewing org details)
router.get('/:organizationID', async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.organizationID);
    
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }
    
    res.json({ success: true, organization });
  } catch (error) {
    console.error('Organization fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user's organization (if they're a member)
router.get('/my/organization', async (req, res) => {
  try {
    if (!req.user.organizationID) {
      return res.status(404).json({ 
        success: false, 
        message: 'User is not part of any organization' 
      });
    }
    
    const organization = await Organization.findById(req.user.organizationID);
    
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }
    
    // Check if user is a member
    if (!organization.isMember(req.user.userID)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json({ success: true, organization });
  } catch (error) {
    console.error('Organization fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;