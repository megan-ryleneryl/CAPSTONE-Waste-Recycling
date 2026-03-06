const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const jwt = require('jsonwebtoken');
const Application = require('../models/Application');
const Organization = require('../models/Organizations');
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
            
      totalDonations = completedPickups.reduce((sum, pickup) => sum + pickup.finalAmount, 0);
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
        organizationID: req.user.organizationID || null,
        organizationName: req.user.organizationName || '',
        points: req.user.points || 0,
        totalDonations: totalDonations,
        badges: req.user.badges || [],
        profilePicture: req.user.profilePictureUrl || null,
        profilePictureUrl: req.user.profilePictureUrl || null,
        authProvider: req.user.authProvider || 'email',
        createdAt: req.user.createdAt,
        preferredTimes: req.user.preferredTimes || [],
        preferredLocations: req.user.preferredLocations || [],
        userLocation: req.user.userLocation || null,
        privacySettings: req.user.privacySettings || { showEarnings: false, showNameOnLeaderboard: false }
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
      'preferredLocations',
      'userLocation',
      'privacySettings',
      'organizationName',
      'organizationDescription'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Check if user is updating preferredTimes or preferredLocations
    const user = await User.findById(req.user.userID);
    const Point = require('../models/Point');
    
    // Award points for first-time or updated preferred times
    if (updates.preferredTimes && updates.preferredTimes.length > 0) {
      const hadPreferredTimes = user.preferredTimes && user.preferredTimes.length > 0;
      if (!hadPreferredTimes) {
        // First time setting preferred times
        await Point.create({
          userID: req.user.userID,
          pointsEarned: 1,
          transaction: 'Profile_Completion',
          description: 'Set preferred pickup times'
        });
      }
    }
    
    // Award points for first-time or updated preferred locations
    if (updates.preferredLocations && updates.preferredLocations.length > 0) {
      const hadPreferredLocations = user.preferredLocations && user.preferredLocations.length > 0;
      if (!hadPreferredLocations) {
        // First time setting preferred locations
        await Point.create({
          userID: req.user.userID,
          pointsEarned: 1,
          transaction: 'Profile_Completion',
          description: 'Set preferred pickup locations'
        });
      }
    }

    // Award points for first-time user location (recycling community)
    if (updates.userLocation) {
      const hadUserLocation = user.userLocation && user.userLocation !== null;
      if (!hadUserLocation) {
        // First time setting user location
        await Point.create({
          userID: req.user.userID,
          pointsEarned: 1,
          transaction: 'Profile_Completion',
          description: 'Set recycling community location'
        });
      }
    }
    
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
    
    // Check if user is already a collector
    const user = await User.findById(req.user.userID);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isCollector) {
      return res.status(400).json({
        success: false,
        message: 'You are already a Collector'
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
      requestType,           // 'join' or 'create'
      organizationName,      // For 'create' requests
      targetOrganizationID,  // For 'join' requests
      reason
    } = req.body;
    
    // Validate request type
    if (!requestType || !['join', 'create'].includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid request type (join/create) is required'
      });
    }
    
    // Validate based on request type
    if (requestType === 'create') {
      if (!organizationName || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Organization name and reason are required for new organizations'
        });
      }
    } else if (requestType === 'join') {
      if (!targetOrganizationID || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Organization selection and reason are required to join'
        });
      }
      
      // Verify target organization exists
      const Organization = require('../models/Organizations');
      const targetOrg = await Organization.findById(targetOrganizationID);
      
      if (!targetOrg) {
        return res.status(404).json({
          success: false,
          message: 'Selected organization not found'
        });
      }
      
      if (!targetOrg.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Selected organization is not active'
        });
      }
    }

    // Check if user already has an organization
    const user = await User.findById(req.user.userID);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.organizationID !== null) {
      return res.status(400).json({
        success: false,
        message: 'User already belongs to an organization'
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
      requestType: requestType
    };
    
    // Add appropriate fields based on request type
    if (requestType === 'create') {
      applicationData.organizationName = organizationName;
      applicationData.metadata = {
        organizationName: organizationName,
        reason: reason
      };
    } else if (requestType === 'join') {
      const Organization = require('../models/Organizations');
      const targetOrg = await Organization.findById(targetOrganizationID);
      applicationData.targetOrganizationID = targetOrganizationID;
      applicationData.organizationName = targetOrg.organizationName; // Store for display
      applicationData.metadata = {
        targetOrganizationID: targetOrganizationID,
        organizationName: targetOrg.organizationName,
        reason: reason
      };
    }

    const application = await Application.create(applicationData);

    res.json({
      success: true,
      message: 'Organization application submitted successfully',
      application: {
        applicationID: application.applicationID,
        applicationType: application.applicationType,
        status: application.status,
        justification: application.justification,
        requestType: application.requestType,
        organizationName: application.organizationName,
        targetOrganizationID: application.targetOrganizationID,
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

// Get list of all active organizations (for dropdown)
router.get('/organizations/list', async (req, res) => {
  try {    
    // Get all active organizations
    const allOrgs = await Organization.findAll();
    const activeOrgs = allOrgs.filter(org => org.isActive);
    
    // Return only necessary fields for dropdown
    const orgList = activeOrgs.map(org => ({
      organizationID: org.organizationID,
      organizationName: org.organizationName,
      description: org.description
    }));
    
    res.json({
      success: true,
      organizations: orgList
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching organizations',
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

// Check and award badges for user
router.post('/check-badges', async (req, res) => {
  try {
    const userID = req.user.userID;
    const user = await User.findById(userID);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's current badges
    const currentBadges = user.badges || [];
    const earnedBadgeIds = currentBadges.map(b => b.badgeId);

    // Fetch user stats
    const Post = require('../models/Posts');
    const Pickup = require('../models/Pickup');

    // Get posts created by user
    const userPosts = await Post.findByUserID(userID);
    const postsCreated = userPosts.filter(p => p.postType === 'Waste').length;
    const initiativesCreated = userPosts.filter(p => p.postType === 'Initiative').length;

    // Get completed pickups
    const giverPickups = await Pickup.findByUser(userID, 'giver');
    const collectorPickups = await Pickup.findByUser(userID, 'collector');
    const pickupsCompleted = [...giverPickups, ...collectorPickups].filter(
      p => p.status === 'Completed'
    ).length;

    // Build stats object
    const userStats = {
      postsCreated,
      pickupsCompleted,
      initiativesCreated,
      points: user.points || 0,
      createdAt: user.createdAt
    };

    // Badge definitions (simplified for server-side check)
    const BADGES = {
      FIRST_POST: { id: 'first_post', requirements: { minPostsCreated: 1 }, points: 10 },
      FIRST_PICKUP: { id: 'first_pickup', requirements: { minPickupsCompleted: 1 }, points: 15 },
      PICKUPS_5: { id: 'pickups_5', requirements: { minPickupsCompleted: 5 }, points: 30 },
      PICKUPS_25: { id: 'pickups_25', requirements: { minPickupsCompleted: 25 }, points: 75 },
      PICKUPS_50: { id: 'pickups_50', requirements: { minPickupsCompleted: 50 }, points: 150 },
      POINTS_100: { id: 'points_100', requirements: { minPoints: 100 }, points: 0 },
      POINTS_500: { id: 'points_500', requirements: { minPoints: 500 }, points: 0 },
      POINTS_1000: { id: 'points_1000', requirements: { minPoints: 1000 }, points: 0 },
      INITIATIVE_CREATOR: { id: 'initiative_creator', requirements: { minInitiativesCreated: 1 }, points: 50 },
      EARLY_ADOPTER: { id: 'early_adopter', requirements: { joinedBeforeDate: '2026-08-01' }, points: 100 },
    };

    // Check eligibility for each badge
    const checkEligibility = (badge) => {
      const req = badge.requirements;
      if (req.minPostsCreated && userStats.postsCreated < req.minPostsCreated) return false;
      if (req.minPickupsCompleted && userStats.pickupsCompleted < req.minPickupsCompleted) return false;
      if (req.minPoints && userStats.points < req.minPoints) return false;
      if (req.minInitiativesCreated && userStats.initiativesCreated < req.minInitiativesCreated) return false;
      if (req.joinedBeforeDate && userStats.createdAt) {
        const joinDate = userStats.createdAt.toDate ? userStats.createdAt.toDate() : new Date(userStats.createdAt);
        const cutoffDate = new Date(req.joinedBeforeDate);
        if (joinDate >= cutoffDate) return false;
      }
      return true;
    };

    // Find newly eligible badges
    const newBadges = [];
    let totalNewPoints = 0;

    for (const [key, badge] of Object.entries(BADGES)) {
      if (!earnedBadgeIds.includes(badge.id) && checkEligibility(badge)) {
        newBadges.push({
          badgeId: badge.id,
          earnedAt: new Date()
        });
        totalNewPoints += badge.points;
      }
    }

    // Award new badges if any
    if (newBadges.length > 0) {
      const updatedBadges = [...currentBadges, ...newBadges];
      await User.update(userID, { badges: updatedBadges });

      // Award points for new badges
      if (totalNewPoints > 0) {
        const Point = require('../models/Point');
        await Point.create({
          userID: userID,
          pointsEarned: totalNewPoints,
          transaction: 'Badge_Earned',
          description: `Earned ${newBadges.length} badge(s)`
        });
      }
    }

    res.json({
      success: true,
      newBadges: newBadges,
      totalBadges: currentBadges.length + newBadges.length,
      stats: userStats
    });
  } catch (error) {
    console.error('Badge check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking badges',
      error: error.message
    });
  }
});

module.exports = router;