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
      const user = await User.findById(decoded.userID || decoded.userID);
      
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

    console.log('Fetching profile for userID:', req.user.userID);

    // Calculate total donations (kg) from completed pickups where user is giver
    const Pickup = require('../models/Pickup');
    let totalDonations = 0;

    try {
      const giverPickups = await Pickup.findByUser(req.user.userID, 'giver');
          
      // Filter and sum up completed pickups
      const completedPickups = giverPickups.filter(pickup => {
        const isCompleted = pickup.status === 'Completed';
        const hasPayment = pickup.paymentReceived && pickup.paymentReceived > 0;        
        return isCompleted && hasPayment;
      });
            
      totalDonations = completedPickups.reduce((sum, pickup) => {
        console.log(`Adding ${pickup.paymentReceived} kg to total`);
        return sum + pickup.paymentReceived;
      }, 0);
    } catch (pickupError) {
      console.error('Error calculating total donations:', pickupError);
      // Continue with totalDonations = 0 if there's an error
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
        isCollector: req.user.isCollector || false,
        isAdmin: req.user.isAdmin || false,
        status: req.user.status || 'Pending',
        isOrganization: req.user.isOrganization || false,
        organizationName: req.user.organizationName || '',
        points: req.user.points || 0,
        totalDonations: totalDonations,
        badges: req.user.badges || [],
        profilePicture: req.user.profilePictureUrl || null,
        profilePictureUrl: req.user.profilePictureUrl || null,
        authProvider: req.user.authProvider || 'email',
        createdAt: req.user.createdAt,
        preferredTimes: req.user.preferredTimes || [],
        preferredLocations: req.user.preferredLocations || []
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

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Failed to update user' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
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
    
    if (!user.isCollector || !user.isAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Only Givers and Organizations can apply to be Collectors' 
      });
    }
    
    let documents = [];
    
    // Handle file upload if provided
    if (req.file) {
      try {
        const uploadResult = await StorageService.saveFile(req.file, 'applications/collector');
        documents.push(uploadResult.url);
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
    const applicationData = {
      userID: req.user.userID,
      applicationType: 'Collector_Privilege',
      status: 'Submitted',
      justification: businessJustification,
      documents: documents,
      submittedAt: new Date(),
      metadata: {
        businessJustification: businessJustification
      }
    };

    const application = await Application.create(applicationData);

    res.json({ 
      success: true, 
      message: 'Collector application submitted successfully',
      application: {
        applicationID: application.applicationID,
        applicationType: application.applicationType,
        status: application.status,
        justification: application.justification,
        documents: application.documents,
        submittedAt: application.submittedAt
      }
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
      reason
    } = req.body;
    
    // Validate required fields
    if (!organizationName || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization name and reason are required' 
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
    
    let documents = [];
    
    // Handle file upload if provided
    if (req.file) {
      try {
        const uploadResult = await StorageService.saveFile(req.file, 'applications/organization');
        documents.push(uploadResult.url);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload document',
          error: uploadError.message
        });
      }
    }

    // Create application with proper data structure
    const applicationData = {
      userID: req.user.userID,
      applicationType: 'Org_Verification',
      status: 'Submitted',
      justification: reason,
      documents: documents,
      submittedAt: new Date(),
      organizationName: organizationName,
      metadata: {
        organizationName: organizationName,
        reason: reason
      }
    };

    const application = await Application.create(applicationData);

    res.json({ 
      success: true, 
      message: 'Organization application submitted successfully',
      application: {
        applicationID: application.applicationID,
        applicationType: application.applicationType,
        status: application.status,
        justification: application.justification,
        organizationName: application.organizationName,
        documents: application.documents,
        submittedAt: application.submittedAt
      }
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
    let documents = [];
    
    // Handle file upload if provided
    if (req.file) {
      try {
        const uploadResult = await StorageService.saveFile(req.file, 'applications/verification');
        documents.push(uploadResult.url);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload document',
          error: uploadError.message
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Proof document is required for verification'
      });
    }

    // Check if there's an existing pending verification application
    const existingApplications = await Application.findByUserID(req.user.userID);
    const pendingVerification = existingApplications.find(
      app => app.applicationType === 'Account_Verification' && 
             (app.status === 'Pending' || app.status === 'Submitted')
    );

    let application;
    
    if (pendingVerification) {
      // Update existing application with document and status
      const updateData = {
        documents: documents,
        status: 'Submitted',
        submittedAt: new Date()
      };
      
      application = await Application.update(pendingVerification.applicationID, updateData);
    } else {
      // Create new application if none exists
      const applicationData = {
        userID: req.user.userID,
        applicationType: 'Account_Verification',
        status: 'Submitted',
        justification: 'Account verification request',
        documents: documents,
        submittedAt: new Date()
      };
      
      application = await Application.create(applicationData);
    }
    
    // Update user status to "Submitted"
    try {
      const updatedUser = await User.update(req.user.userID, {
        status: 'Submitted'
      });
    } catch (userUpdateError) {
      console.error('Error updating user status:', userUpdateError);
    }

    res.json({ 
      success: true, 
      message: 'Verification document submitted successfully',
      application: {
        applicationID: application.applicationID,
        applicationType: application.applicationType,
        status: application.status,
        documents: application.documents,
        submittedAt: application.submittedAt
      }
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
    
    const applicationsWithDates = applications.map(app => {
      const appData = app instanceof Application ? app.toFirestore() : app;
        return {
          ...appData,
          submittedAt: appData.submittedAt?.toDate 
            ? appData.submittedAt.toDate().toISOString()
            : appData.submittedAt?.seconds 
            ? new Date(appData.submittedAt.seconds * 1000).toISOString()
            : appData.submittedAt,
          reviewedAt: appData.reviewedAt?.toDate 
            ? appData.reviewedAt.toDate().toISOString()
            : appData.reviewedAt?.seconds 
            ? new Date(appData.reviewedAt.seconds * 1000).toISOString()
            : appData.reviewedAt
        };
      });

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

// Delete user account
router.delete('/account', async (req, res) => {
  try {
    const userID = req.user.userID;

    await User.softDelete(userID);
    
    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting account', 
      error: error.message 
    });
  }
});

module.exports = router;