const express = require('express');
const router = express.Router();
const User = require('../models/users_model');
const { verifyToken } = require('../middleware/auth');

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      userID: user.userID,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      status: user.status,
      isOrganization: user.isOrganization,
      organizationName: user.organizationName,
      preferredTimes: user.preferredTimes,
      preferredLocations: user.preferredLocations,
      points: user.points,
      badges: user.badges,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 
      'preferredTimes', 'preferredLocations'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.update(req.user.userID, updates);
    
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Apply to be a collector
router.post('/apply-collector', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);
    
    if (user.userType !== 'Giver') {
      return res.status(400).json({ message: 'Only Givers can apply to be Collectors' });
    }

    // Update user type to Collector (pending approval)
    await User.update(req.user.userID, { 
      userType: 'Collector',
      status: 'Pending'
    });

    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting application', error: error.message });
  }
});

// Apply for organization account
router.post('/apply-organization', verifyToken, async (req, res) => {
  try {
    const { organizationName } = req.body;
    
    if (!organizationName) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    await User.update(req.user.userID, { 
      isOrganization: true,
      organizationName,
      status: 'Pending'
    });

    res.json({ message: 'Organization application submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting application', error: error.message });
  }
});

module.exports = router;