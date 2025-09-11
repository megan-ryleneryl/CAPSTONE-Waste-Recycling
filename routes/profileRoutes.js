const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const jwt = require('jsonwebtoken');
const Application = require('../models/Application');
const { StorageService, upload } = require('../services/storage-service');

// Authentication middleware specific for profile routes
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
        
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided. Please login.' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
      // Fetch fresh user data from database
      const user = await User.findById(decoded.userID);
      
      if (!user) {
        console.log('User not found for ID:', decoded.userID);
        return res.status(401).json({ 
          success: false,
          message: 'User not found. Please login again.' 
        });
      }
            
      // Attach user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token. Please login again.' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error',
      error: error.message 
    });
  }
};

// Apply authentication middleware to all routes in this router
router.use(authenticateUser);

// Get current user profile
router.get('/', async (req, res) => {
  try {    
    // req.user is already set by the authentication middleware
    // and contains fresh data from the database
    if (!req.user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return user profile data
    const profileData = {
      success: true,
      user: {
        userID: req.user.userID,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone || '',
        address: req.user.address || '',
        userType: req.user.userType,
        status: req.user.status || 'Pending',
        isOrganization: req.user.isOrganization || false,
        organizationName: req.user.organizationName || '',
        points: req.user.points || 0,
        totalDonations: req.user.totalDonations || 0,
        badges: req.user.badges || [],
        profilePicture: req.user.profilePicture || null,
        authProvider: req.user.authProvider || 'email',
        createdAt: req.user.createdAt
      }
    };
    
    res.json(profileData);
    
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
        status: updatedUser.status,
        isOrganization: updatedUser.isOrganization,
        organizationName: updatedUser.organizationName,
        points: updatedUser.points,
        badges: updatedUser.badges,
        profilePicture: updatedUser.profilePicture
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
router.post('/apply-collector', upload.single('mrfProof'), async (req, res) => {
  try {
    const { businessJustification } = req.body;
    
    // Validate required fields
    if (!businessJustification) {
      return res.status(400).json({ 
        success: false, 
        message: 'Business justification is required' 
      });
    }
    
    // Check if user is a Giver
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
    
    let documentUrl = 'document.pdf'; // Default placeholder
    
    // Handle file upload if provided
    if (req.file) {
      try {
        const uploadResult = await StorageService.saveFile(req.file, 'applications/collector');
        documentUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload document',
          error: uploadError.message
        });
      }
    }

    // Create application
    const application = await Application.create({
      userID: req.user.userID,
      applicationType: 'Collector_Privilege',
      status: 'Pending',
      justification: businessJustification,
      documents: [documentUrl],
      submittedAt: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Collector application submitted successfully',
      application,
      documentUrl
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
router.post('/apply-organization', upload.single('proofDocument'), async (req, res) => {
  try {
    const { 
      organizationName, 
      organizationLocation, 
      reason
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
    
    let documentUrl = 'document.pdf'; // Default placeholder
    
    // Handle file upload if provided
    if (req.file) {
      try {
        const uploadResult = await StorageService.saveFile(req.file, 'applications/organization');
        documentUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload document',
          error: uploadError.message
        });
      }
    }

    // Create application
    const application = await Application.create({
      userID: req.user.userID,
      applicationType: 'Org_Verification',
      status: 'Pending',
      organizationName: organizationName,
      justification: reason,
      documents: [documentUrl],
      submittedAt: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Organization application submitted successfully',
      application,
      documentUrl
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

// Verify user account
router.post('/verification', upload.single('proofDocument'), async (req, res) => {
  try {
    let documentUrl = 'document.pdf'; // Default placeholder
    
    // Handle file upload if provided
    if (req.file) {
      try {
        const uploadResult = await StorageService.saveFile(req.file, 'applications/verification');
        documentUrl = uploadResult.url;
        console.log('Document uploaded successfully:', documentUrl);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload document',
          error: uploadError.message
        });
      }
    }

    // Check if there's an existing pending verification application
    const existingApplications = await Application.findByUserID(req.user.userID);
    const pendingVerification = existingApplications.find(
      app => app.applicationType === 'Account_Verification' && app.status === 'Pending'
    );

    let application;
    
    if (pendingVerification) {
      // Update existing application with document and status
      application = await Application.update(pendingVerification.applicationID, {
        documents: [documentUrl],
        status: 'Submitted',
        submittedAt: new Date()
      });
      console.log('Updated existing application:', pendingVerification.applicationID);
    } else {
      // Create new application if none exists
      application = await Application.create({
        userID: req.user.userID,
        applicationType: 'Account_Verification',
        status: 'Submitted',
        justification: 'Account verification request',
        documents: [documentUrl],
        submittedAt: new Date()
      });
      console.log('Created new application:', application.applicationID);
    }
    
    // Update user status to "Submitted"
    await User.update(req.user.userID, {
      status: 'Submitted'
    });
    console.log('Updated user status to Submitted');

    res.json({ 
      success: true, 
      message: 'Verification document submitted successfully',
      application,
      documentUrl
    });
  } catch (error) {
    console.error('Verification application error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting verification application', 
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