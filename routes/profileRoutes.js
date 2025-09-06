const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const Application = require('../models/Application');

// Get current user profile
router.get('/', async (req, res) => {
  try {
    // req.user is set by the authentication middleware
    const user = await User.findById(req.user.userID);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return user profile data
    res.json({
      success: true,
      user: {
        userID: user.userID,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        userType: user.userType,
        status: user.status || 'pending',
        isOrganization: user.isOrganization || false,
        organizationName: user.organizationName || '',
        points: user.points || 0,
        totalDonations: user.totalDonations || 0,
        badges: user.badges || [],
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile', 
      error: error.message 
    });
  }
});

// Update user profile
router.put('/', async (req, res) => {
  try {
    const allowedUpdates = [
      'firstName', 
      'lastName', 
      'phone', 
      'address',
      'preferredTimes', 
      'preferredLocations'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Update user in database
    const updatedUser = await User.update(req.user.userID, updates);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        userID: updatedUser.userID,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        address: updatedUser.address || '',
        userType: updatedUser.userType,
        status: updatedUser.status || 'pending',
        isOrganization: updatedUser.isOrganization || false,
        organizationName: updatedUser.organizationName || '',
        points: updatedUser.points || 0,
        totalDonations: updatedUser.totalDonations || 0,
        badges: updatedUser.badges || [],
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
});

// Apply to be a collector
router.post('/apply-collector', async (req, res) => {
  try {
    const { businessJustification, mrfProof } = req.body;
    
    // Check if user is eligible
    const user = await User.findById(req.user.userID);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    if (user.userType !== 'Giver') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only Givers can apply to be Collectors' 
      });
    }

    // Create application
    const application = await Application.create({
      userID: req.user.userID,
      type: 'collector',
      status: 'pending',
      businessJustification,
      mrfProof: mrfProof || 'document.pdf',
      submittedAt: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Collector application submitted successfully',
      application 
    });
  } catch (error) {
    console.error('Collector application error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting collector application', 
      error: error.message 
    });
  }
});

// Apply for organization account
router.post('/apply-organization', async (req, res) => {
  try {
    const { 
      organizationName, 
      organizationLocation, 
      reason, 
      proofDocument 
    } = req.body;
    
    // Validate required fields
    if (!organizationName || !organizationLocation || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if user already has an organization
    const user = await User.findById(req.user.userID);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    if (user.isOrganization) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already has an organization account' 
      });
    }

    // Create application
    const application = await Application.create({
      userID: req.user.userID,
      type: 'organization',
      status: 'pending',
      organizationName,
      organizationLocation,
      reason,
      proofDocument: proofDocument || 'document.pdf',
      submittedAt: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Organization application submitted successfully',
      application 
    });
  } catch (error) {
    console.error('Organization application error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting organization application', 
      error: error.message 
    });
  }
});

// Get user's applications
router.get('/applications', async (req, res) => {
  try {
    const applications = await Application.findByUserID(req.user.userID);
    
    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching applications', 
      error: error.message 
    });
  }
});

module.exports = router;