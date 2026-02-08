// routes/organizationRoutes.js
const express = require('express');
const router = express.Router();
const Organization = require('../models/Organizations');
const User = require('../models/Users');
const Post = require('../models/Posts');
const Pickup = require('../models/Pickup');
const { verifyToken } = require('../middleware/auth');
const { StorageService, upload } = require('../services/storage-service');

// Apply authentication to all routes
router.use(verifyToken);

// ============================================================
// GET /my/organization - Get current user's organization
// ============================================================
router.get('/my/organization', async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);
    const organizationID = user?.organizationID;

    if (!organizationID) {
      return res.status(404).json({
        success: false,
        message: 'User is not part of any organization'
      });
    }

    const organization = await Organization.findById(organizationID);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

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

// ============================================================
// PUT /my/organization - Update organization details
// ============================================================
router.put('/my/organization', async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);
    const organizationID = user?.organizationID;

    if (!organizationID) {
      return res.status(404).json({
        success: false,
        message: 'User is not part of any organization'
      });
    }

    const organization = await Organization.findById(organizationID);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Only admins can update
    if (!organization.isAdmin(req.user.userID)) {
      return res.status(403).json({
        success: false,
        message: 'Only organization admins can update details'
      });
    }

    const allowedFields = [
      'organizationName', 'description', 'contactEmail',
      'contactPhone', 'address'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    updates.updatedAt = new Date();

    const updated = await Organization.update(organizationID, updates);

    // If name changed, sync to all members
    if (updates.organizationName) {
      const org = await Organization.findById(organizationID);
      if (org) {
        await org.syncNameToMembers(updates.organizationName);
      }
    }

    res.json({ success: true, organization: updated, message: 'Organization updated successfully' });
  } catch (error) {
    console.error('Organization update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /my/organization/profile-picture - Upload org profile picture
// ============================================================
router.post('/my/organization/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);
    const organizationID = user?.organizationID;

    if (!organizationID) {
      return res.status(404).json({ success: false, message: 'User is not part of any organization' });
    }

    const organization = await Organization.findById(organizationID);
    if (!organization || !organization.isAdmin(req.user.userID)) {
      return res.status(403).json({ success: false, message: 'Only admins can update organization picture' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Use storage service - save under organization ID folder
    const fileUrl = await StorageService.uploadProfilePicture(req.file, `org-${organizationID}`);

    // Update organization with new picture URL
    await Organization.update(organizationID, { profilePicture: fileUrl });

    res.json({
      success: true,
      message: 'Organization profile picture updated',
      fileUrl
    });
  } catch (error) {
    console.error('Organization picture upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /my/organization/members - Get all member details
// ============================================================
router.get('/my/organization/members', async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);
    const organizationID = user?.organizationID;

    if (!organizationID) {
      return res.status(404).json({ success: false, message: 'User is not part of any organization' });
    }

    const organization = await Organization.findById(organizationID);
    if (!organization || !organization.isMember(req.user.userID)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Fetch details for all members
    const memberDetails = await Promise.all(
      organization.members.map(async (memberID) => {
        try {
          const memberUser = await User.findById(memberID);
          if (!memberUser) return null;

          return {
            userID: memberUser.userID,
            firstName: memberUser.firstName,
            lastName: memberUser.lastName,
            email: memberUser.email,
            phone: memberUser.phone || '',
            profilePictureUrl: memberUser.profilePictureUrl || null,
            isOrgAdmin: organization.admins.includes(memberID),
            isCollector: memberUser.isCollector || false,
            isOrganization: memberUser.isOrganization || false,
            points: memberUser.points || 0,
            createdAt: memberUser.createdAt
          };
        } catch (err) {
          console.error(`Failed to fetch member ${memberID}:`, err);
          return null;
        }
      })
    );

    // Filter out nulls (members that couldn't be found)
    const validMembers = memberDetails.filter(m => m !== null);

    res.json({ success: true, members: validMembers });
  } catch (error) {
    console.error('Members fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /my/organization/initiatives - Get initiatives from all members
// ============================================================
router.get('/my/organization/initiatives', async (req, res) => {
  try {
    // Get organizationID from req.user (set by auth middleware) or fetch from DB
    const organizationID = req.user.organizationID || (await User.findById(req.user.userID))?.organizationID;
    if (!organizationID) {
      return res.status(404).json({ success: false, message: 'User is not part of any organization' });
    }

    const organization = await Organization.findById(organizationID);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    
    const memberIDs = organization.members.map(m => typeof m === 'string' ? m : m.userID).filter(Boolean);
    
    const initiatives = await Post.find({
      userID: { $in: memberIDs },
      postType: 'Initiative'
    });
    
    res.json({ success: true, initiatives });
  } catch (error) {
    console.error('Initiatives fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /my/organization/analytics - Get org-wide analytics
// ============================================================
router.get('/my/organization/analytics', async (req, res) => {
  try {
    // Get organizationID from req.user (set by auth middleware) or fetch from DB
    const organizationID = req.user.organizationID || (await User.findById(req.user.userID))?.organizationID;
    if (!organizationID) {
      return res.status(404).json({ success: false, message: 'User is not part of any organization' });
    }

    // Get organization and verify membership
    const organization = await Organization.findById(organizationID);
    if (!organization || !organization.isMember(req.user.userID)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Get all member IDs
    const memberIDs = organization.members.map(m => typeof m === 'string' ? m : m.userID).filter(Boolean);
    
    // Fetch all initiative posts from members
    const initiatives = await Post.find({
      userID: { $in: memberIDs },
      postType: 'Initiative'
    });
    
    // Calculate metrics
    const totalCollected = initiatives.reduce((sum, post) => 
      sum + (post.currentAmount || 0), 0
    );
    
    // Environmental impact calculations
    const co2Saved = totalCollected * 2.5; // kg CO2 per kg waste
    const treesEquivalent = Math.floor(co2Saved / 21); // 21kg CO2 per tree/year
    const waterSaved = totalCollected * 50; // liters per kg
    
    res.json({
      success: true,
      data: {
        volume: { totalCollected },
        impact: {
          co2Saved,
          treesEquivalent,
          waterSaved,
          landfillDiverted: totalCollected / 1000, // tons
          householdsServed: initiatives.length,
          barrangaysCovered: new Set(initiatives.map(p => p.location?.barangay?.code)).size
        },
        operations: {
          completedPickups: initiatives.filter(p => p.status === 'Completed').length,
          totalPickups: initiatives.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /my/organization/impact-report - Generate impact report data
// ============================================================
router.get('/my/organization/impact-report', async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);
    const organizationID = user?.organizationID;

    if (!organizationID) {
      return res.status(404).json({ success: false, message: 'User is not part of any organization' });
    }

    const organization = await Organization.findById(organizationID);
    if (!organization || !organization.isMember(req.user.userID)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allMemberIDs = [...new Set([...organization.members, ...organization.admins])];

    // Fetch all completed pickups for all members (giver or collector)
    let allPickups = [];
    await Promise.all(
      allMemberIDs.map(async (memberID) => {
        try {
          const memberPickups = await Pickup.findByUser(memberID, 'both');
          allPickups.push(...memberPickups);
        } catch (err) { /* ignore */ }
      })
    );

    // Deduplicate
    const pickupMap = new Map();
    allPickups.forEach(p => pickupMap.set(p.pickupID, p));
    allPickups = Array.from(pickupMap.values());
    const completedPickups = allPickups.filter(p => p.status === 'Completed');

    const totalKg = completedPickups.reduce((sum, p) => {
      return sum + (p.actualWaste?.finalAmount || p.expectedWaste?.estimatedAmount || 0);
    }, 0);

    const reportData = {
      organizationName: organization.organizationName,
      generatedAt: new Date().toISOString(),
      memberCount: allMemberIDs.length,
      totalPickups: completedPickups.length,
      totalKgCollected: Math.round(totalKg * 100) / 100,
      co2Prevented: Math.round(totalKg * 2.5),
      treesSaved: Math.round(totalKg * 0.017),
      waterSaved: Math.round(totalKg * 7),
      landfillDiverted: parseFloat((totalKg / 1000).toFixed(2)),
      uniqueHouseholds: new Set(completedPickups.map(p => p.giverID)).size
    };

    res.json({ success: true, report: reportData });
  } catch (error) {
    console.error('Impact report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /:organizationID - Get organization by ID (public view)
// ============================================================
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

module.exports = router;