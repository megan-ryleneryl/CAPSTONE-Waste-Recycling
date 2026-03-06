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
// PUT /my/organization/members/:userID/role - Toggle admin role
// ============================================================
router.put('/my/organization/members/:userID/role', async (req, res) => {
  try {
    const targetUserID = req.params.userID;
    const { isOrgAdmin } = req.body;

    // Validate input
    if (typeof isOrgAdmin !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isOrgAdmin must be a boolean value'
      });
    }

    // Get current user's organization
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

    // Only admins can change roles
    if (!organization.isAdmin(req.user.userID)) {
      return res.status(403).json({
        success: false,
        message: 'Only organization admins can change member roles'
      });
    }

    // Check if target user is a member
    if (!organization.isMember(targetUserID)) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this organization'
      });
    }

    // Prevent users from demoting themselves if they're the only admin
    if (req.user.userID === targetUserID && !isOrgAdmin) {
      if (organization.admins.length === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove admin role from the only admin. Promote another member first.'
        });
      }
    }

    // Update the role
    if (isOrgAdmin) {
      // Promote to admin
      if (!organization.admins.includes(targetUserID)) {
        organization.admins.push(targetUserID);
      }
    } else {
      // Demote from admin
      organization.admins = organization.admins.filter(id => id !== targetUserID);
    }

    // Save the updated organization
    await Organization.update(organizationID, {
      admins: organization.admins,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: `Member ${isOrgAdmin ? 'promoted to' : 'demoted from'} admin role successfully`,
      isOrgAdmin: isOrgAdmin
    });
  } catch (error) {
    console.error('Toggle admin role error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DELETE /my/organization/members/:userID - Remove member from organization
// ============================================================
router.delete('/my/organization/members/:userID', async (req, res) => {
  try {
    const targetUserID = req.params.userID;

    // Get current user's organization
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

    // Only admins can remove members
    if (!organization.isAdmin(req.user.userID)) {
      return res.status(403).json({
        success: false,
        message: 'Only organization admins can remove members'
      });
    }

    // Check if target user is a member
    if (!organization.isMember(targetUserID)) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this organization'
      });
    }

    // Prevent removing yourself
    if (req.user.userID === targetUserID) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove yourself from the organization'
      });
    }

    // Prevent removing the last admin
    if (organization.isAdmin(targetUserID) && organization.admins.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the only admin. Promote another member first.'
      });
    }

    // Remove user from members array
    organization.members = organization.members.filter(id => id !== targetUserID);
    
    // Remove from admins if they were an admin
    organization.admins = organization.admins.filter(id => id !== targetUserID);

    // Update the organization
    await Organization.update(organizationID, {
      members: organization.members,
      admins: organization.admins,
      updatedAt: new Date()
    });

    // Update the user's organizationID to null
    await User.update(targetUserID, {
      organizationID: null,
      organizationName: null,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Member removed from organization successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
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
// GET /my/organization/analytics - Get org-wide analytics (ENHANCED)
// ============================================================
router.get('/my/organization/analytics', async (req, res) => {
  // console.log('\n========== ORG ANALYTICS START ==========');
  // console.log('[ORG-ANALYTICS] Request received at:', new Date().toISOString());
  // console.log('[ORG-ANALYTICS] Query params:', req.query);
  // console.log('[ORG-ANALYTICS] User ID:', req.user?.userID);
  
  try {
    // Step 1: Get organization
    // console.log('\n[STEP 1] Fetching organization...');
    const organizationID = req.user.organizationID || (await User.findById(req.user.userID))?.organizationID;
    // console.log('[STEP 1] Organization ID:', organizationID);
    
    if (!organizationID) {
      // console.log('[STEP 1] ERROR: No organization found for user');
      return res.status(404).json({ success: false, message: 'User is not part of any organization' });
    }

    const organization = await Organization.findById(organizationID);
    if (!organization || !organization.isMember(req.user.userID)) {
      // console.log('[STEP 1] ERROR: Organization not found or access denied');
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // console.log('[STEP 1] Organization found:', organization.organizationName);
    
    // Step 2: Get all member IDs
    // console.log('\n[STEP 2] Getting member IDs...');
    const memberIDs = organization.members.map(m => typeof m === 'string' ? m : m.userID).filter(Boolean);
    // console.log('[STEP 2] Member IDs:', memberIDs);
    // console.log('[STEP 2] Total members:', memberIDs.length);
    
    // Step 3: Determine time range filter
    // console.log('\n[STEP 3] Processing time range...');
    const timeRange = req.query.timeRange || 'all';
    let startDate = null;
    const now = new Date();
    
    switch(timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = null;
    }
    // console.log('[STEP 3] Time range:', timeRange);
    // console.log('[STEP 3] Start date:', startDate);
    
    // Step 4: Fetch all initiatives from members
    // console.log('\n[STEP 4] Fetching initiatives...');
    let initiatives = [];
    try {
      initiatives = await Post.find({
        userID: { $in: memberIDs },
        postType: 'Initiative'
      });
      // console.log('[STEP 4] Raw initiatives found:', initiatives.length);
      
      // Log first initiative structure for debugging
      // if (initiatives.length > 0) {
      //   console.log('[STEP 4] Sample initiative structure:', JSON.stringify({
      //     postID: initiatives[0].postID,
      //     postType: initiatives[0].postType,
      //     status: initiatives[0].status,
      //     currentAmount: initiatives[0].currentAmount,
      //     targetAmount: initiatives[0].targetAmount,
      //     materials: initiatives[0].materials,
      //     location: initiatives[0].location,
      //     createdAt: initiatives[0].createdAt
      //   }, null, 2));
      // }
    } catch (err) {
      // console.log('[STEP 4] ERROR fetching initiatives:', err.message);
    }
    
    // Filter by time range if applicable
    if (startDate && initiatives.length > 0) {
      // const beforeFilter = initiatives.length;
      initiatives = initiatives.filter(p => {
        const postDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return postDate >= startDate;
      });
      // console.log('[STEP 4] After time filter:', initiatives.length, '(was', beforeFilter + ')');
    }
    
    // Step 5: Fetch all pickups for members (as collectors OR givers) AND linked to initiatives
    // console.log('\n[STEP 5] Fetching pickups...');
    let allPickups = [];
    
    // 5a: Fetch pickups where members are collectors
    // console.log('[STEP 5a] Fetching pickups where members are collectors...');
    for (const memberID of memberIDs) {
      try {
        const memberPickups = await Pickup.findByUser(memberID, 'collector');
        if (memberPickups && memberPickups.length > 0) {
          // console.log(`[STEP 5a] Member ${memberID} has ${memberPickups.length} pickups as collector`);
          // memberPickups.forEach(p => console.log(`  - ${p.pickupID}: ${p.status}`));
          allPickups.push(...memberPickups);
        }
      } catch (err) {
        // console.log(`[STEP 5a] Error fetching collector pickups for ${memberID}:`, err.message);
      }
    }
    
    // 5b: Fetch pickups where members are givers
    // console.log('[STEP 5b] Fetching pickups where members are givers...');
    for (const memberID of memberIDs) {
      try {
        const memberPickups = await Pickup.findByUser(memberID, 'giver');
        if (memberPickups && memberPickups.length > 0) {
          // console.log(`[STEP 5b] Member ${memberID} has ${memberPickups.length} pickups as giver`);
          // memberPickups.forEach(p => console.log(`  - ${p.pickupID}: ${p.status}`));
          allPickups.push(...memberPickups);
        }
      } catch (err) {
        // console.log(`[STEP 5b] Error fetching giver pickups for ${memberID}:`, err.message);
      }
    }
    
    // 5c: Fetch pickups linked to initiative posts
    // console.log('[STEP 5c] Fetching pickups linked to initiative posts...');
    const initiativePostIDs = initiatives.map(i => i.postID).filter(Boolean);
    // console.log('[STEP 5c] Initiative post IDs:', initiativePostIDs);
    
    for (const postID of initiativePostIDs) {
      try {
        const linkedPickups = await Pickup.findByPost(postID);
        if (linkedPickups && linkedPickups.length > 0) {
          // console.log(`[STEP 5c] Post ${postID} has ${linkedPickups.length} linked pickups`);
          // linkedPickups.forEach(p => console.log(`  - ${p.pickupID}: ${p.status}`));
          allPickups.push(...linkedPickups);
        }
      } catch (err) {
        // console.log(`[STEP 5c] Error or no findByPost method:`, err.message);
      }
    }
    
    // 5d: Try fetching all pickups and filter (fallback)
    // console.log('[STEP 5d] Attempting to fetch all pickups as fallback...');
    try {
      const allSystemPickups = await Pickup.findAll ? await Pickup.findAll() : [];
      if (allSystemPickups.length > 0) {
        // console.log(`[STEP 5d] Total system pickups: ${allSystemPickups.length}`);
        // Filter to those involving org members or linked to org initiatives
        const relevantPickups = allSystemPickups.filter(p => 
          memberIDs.includes(p.collectorID) || 
          memberIDs.includes(p.giverID) ||
          initiativePostIDs.includes(p.postID)
        );
        // console.log(`[STEP 5d] Relevant pickups after filter: ${relevantPickups.length}`);
        // relevantPickups.forEach(p => console.log(`  - ${p.pickupID}: ${p.status} (collector: ${p.collectorID}, giver: ${p.giverID}, post: ${p.postID})`));
        allPickups.push(...relevantPickups);
      }
    } catch (err) {
      // console.log(`[STEP 5d] Fallback fetch failed:`, err.message);
    }
    
    // Deduplicate by pickupID (or generate a composite key if pickupID is empty)
    const pickupMap = new Map();
    allPickups.forEach((p, index) => {
      // Use pickupID if available, otherwise create a composite key from other fields
      const key = p.pickupID || `${p.collectorID}-${p.giverID}-${p.postID}-${p.createdAt?.seconds || index}`;
      if (!pickupMap.has(key)) {
        pickupMap.set(key, p);
      }
    });
    allPickups = Array.from(pickupMap.values());
    
    // console.log('[STEP 5] Total unique pickups after dedup:', allPickups.length);
    // console.log('[STEP 5] Pickup statuses:', allPickups.map(p => ({ 
    //   id: (p.pickupID || 'no-id').slice(0,8), 
    //   status: p.status,
    //   hasActualWaste: Array.isArray(p.actualWaste) ? p.actualWaste.length : !!p.actualWaste
    // })));
    
    // Log sample pickup for debugging
    // if (allPickups.length > 0) {
    //   // Find a completed pickup for better sample
    //   const samplePickup = allPickups.find(p => p.status === 'Completed') || allPickups[0];
    //   console.log('[STEP 5] Sample pickup structure:', JSON.stringify({
    //     pickupID: samplePickup.pickupID,
    //     status: samplePickup.status,
    //     collectorID: samplePickup.collectorID,
    //     giverID: samplePickup.giverID,
    //     postID: samplePickup.postID,
    //     actualWaste: samplePickup.actualWaste,
    //     expectedWaste: samplePickup.expectedWaste,
    //     earnings: samplePickup.earnings,
    //     paymentReceived: samplePickup.paymentReceived,
    //     createdAt: samplePickup.createdAt,
    //     completedAt: samplePickup.completedAt
    //   }, null, 2));
    // }
    
    // Filter pickups by time range
    if (startDate && allPickups.length > 0) {
      // const beforeFilter = allPickups.length;
      allPickups = allPickups.filter(p => {
        const pickupDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return pickupDate >= startDate;
      });
      // console.log('[STEP 5] After time filter:', allPickups.length, '(was', beforeFilter + ')');
    }
    
    // Step 6: Calculate Earnings
    // console.log('\n[STEP 6] Calculating earnings...');
    const completedPickups = allPickups.filter(p => p.status === 'Completed');
    // console.log('[STEP 6] Completed pickups:', completedPickups.length);
    
    let totalEarnings = 0;
    let thisMonthEarnings = 0;
    let lastMonthEarnings = 0;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    completedPickups.forEach((pickup, idx) => {
      // console.log(`[STEP 6] Processing pickup ${idx + 1}:`, {
      //   pickupID: pickup.pickupID?.slice(0, 8),
      //   status: pickup.status,
      //   actualWasteType: typeof pickup.actualWaste,
      //   actualWasteIsArray: Array.isArray(pickup.actualWaste),
      //   paymentReceived: pickup.paymentReceived
      // });
      
      let earning = 0;
      
      // Handle actualWaste as an ARRAY of materials (actual structure)
      if (Array.isArray(pickup.actualWaste) && pickup.actualWaste.length > 0) {
        earning = pickup.actualWaste.reduce((sum, mat) => {
          const matPayment = mat.payment || (mat.quantity * (mat.pricePerKg || 0)) || 0;
          // console.log(`[STEP 6]   Material: ${mat.materialName}, qty: ${mat.quantity}, payment: ${matPayment}`);
          return sum + matPayment;
        }, 0);
      } 
      // Fallback: actualWaste as object with finalAmount
      else if (pickup.actualWaste?.finalAmount) {
        earning = pickup.actualWaste.finalAmount * 5; // Estimate ₱5/kg
      }
      // Fallback: paymentReceived field
      else if (pickup.paymentReceived) {
        earning = pickup.paymentReceived;
      }
      // Fallback: earnings object
      else if (pickup.earnings?.collectorEarnings) {
        earning = pickup.earnings.collectorEarnings;
      }
      
      // console.log(`[STEP 6]   Total earning for this pickup: ₱${earning}`);
      totalEarnings += earning;
      
      const pickupDate = pickup.completedAt?.toDate ? pickup.completedAt.toDate() : 
                         pickup.completedAt ? new Date(pickup.completedAt) :
                         pickup.createdAt?.toDate ? pickup.createdAt.toDate() : new Date(pickup.createdAt);
      
      // console.log(`[STEP 6]   Pickup date: ${pickupDate}, thisMonthStart: ${thisMonthStart}`);
      
      if (pickupDate >= thisMonthStart) {
        thisMonthEarnings += earning;
        // console.log(`[STEP 6]   Added to this month earnings`);
      } else if (pickupDate >= lastMonthStart && pickupDate <= lastMonthEnd) {
        lastMonthEarnings += earning;
        // console.log(`[STEP 6]   Added to last month earnings`);
      }
    });
    
    const earningsGrowthRate = lastMonthEarnings > 0 
      ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : (thisMonthEarnings > 0 ? 100 : 0);
    const avgPerPickup = completedPickups.length > 0 
      ? Math.round(totalEarnings / completedPickups.length) 
      : 0;
    
    // Project monthly earnings based on current pace
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const projectedMonthly = dayOfMonth > 0 
      ? Math.round((thisMonthEarnings / dayOfMonth) * daysInMonth)
      : 0;
    
    // console.log('[STEP 6] Total earnings:', totalEarnings);
    // console.log('[STEP 6] This month:', thisMonthEarnings);
    // console.log('[STEP 6] Last month:', lastMonthEarnings);
    // console.log('[STEP 6] Growth rate:', earningsGrowthRate + '%');
    // console.log('[STEP 6] Avg per pickup:', avgPerPickup);
    // console.log('[STEP 6] Projected monthly:', projectedMonthly);
    
    // Step 7: Calculate Volume metrics
    // console.log('\n[STEP 7] Calculating volume metrics...');
    
    // Volume from initiatives (currentAmount field)
    const totalFromInitiatives = initiatives.reduce((sum, post) => 
      sum + (post.currentAmount || 0), 0
    );
    // console.log('[STEP 7] Volume from initiatives:', totalFromInitiatives, 'kg');
    
    // Volume from completed pickups - handle actualWaste as ARRAY
    let totalFromPickups = 0;
    completedPickups.forEach((pickup, idx) => {
      let pickupVolume = 0;
      
      // actualWaste is an ARRAY of materials
      if (Array.isArray(pickup.actualWaste) && pickup.actualWaste.length > 0) {
        pickupVolume = pickup.actualWaste.reduce((sum, mat) => {
          return sum + (mat.quantity || mat.amount || 0);
        }, 0);
      }
      // Fallback: actualWaste as object with finalAmount
      else if (pickup.actualWaste?.finalAmount) {
        pickupVolume = pickup.actualWaste.finalAmount;
      }
      // Fallback: expectedWaste
      else if (pickup.expectedWaste?.estimatedAmount) {
        pickupVolume = pickup.expectedWaste.estimatedAmount;
      }
      
      // console.log(`[STEP 7] Pickup ${idx + 1} volume: ${pickupVolume} kg`);
      totalFromPickups += pickupVolume;
    });
    // console.log('[STEP 7] Volume from pickups:', totalFromPickups, 'kg');
    
    // Use the larger value (initiatives likely includes more comprehensive data)
    const totalCollected = Math.max(totalFromInitiatives, totalFromPickups);
    // console.log('[STEP 7] Total collected (max):', totalCollected, 'kg');
    
    // Calculate this month vs last month volumes
    let thisMonthVolume = 0;
    let lastMonthVolume = 0;
    
    initiatives.forEach(post => {
      const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
      const amount = post.currentAmount || 0;
      
      if (postDate >= thisMonthStart) {
        thisMonthVolume += amount;
      } else if (postDate >= lastMonthStart && postDate <= lastMonthEnd) {
        lastMonthVolume += amount;
      }
    });
    
    const volumeGrowthRate = lastMonthVolume > 0 
      ? Math.round(((thisMonthVolume - lastMonthVolume) / lastMonthVolume) * 100)
      : (thisMonthVolume > 0 ? 100 : 0);
    
    // console.log('[STEP 7] This month volume:', thisMonthVolume, 'kg');
    // console.log('[STEP 7] Last month volume:', lastMonthVolume, 'kg');
    // console.log('[STEP 7] Volume growth rate:', volumeGrowthRate + '%');
    
    // Step 8: Calculate Operational Performance
    // console.log('\n[STEP 8] Calculating operational metrics...');
    const totalPickupsCount = allPickups.length;
    const completedPickupsCount = completedPickups.length;
    const successRate = totalPickupsCount > 0 
      ? Math.round((completedPickupsCount / totalPickupsCount) * 100) 
      : 0;
    
    // Calculate repeat givers (givers who have more than 1 pickup)
    const giverCounts = {};
    allPickups.forEach(p => {
      if (p.giverID) {
        giverCounts[p.giverID] = (giverCounts[p.giverID] || 0) + 1;
      }
    });
    const uniqueGivers = Object.keys(giverCounts).length;
    const repeatGiversCount = Object.values(giverCounts).filter(count => count > 1).length;
    const repeatGiversRate = uniqueGivers > 0 
      ? Math.round((repeatGiversCount / uniqueGivers) * 100) 
      : 0;
    
    // Active givers this month
    const thisMonthGivers = new Set();
    allPickups.forEach(p => {
      const pickupDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      if (pickupDate >= thisMonthStart && p.giverID) {
        thisMonthGivers.add(p.giverID);
      }
    });
    
    // console.log('[STEP 8] Total pickups:', totalPickupsCount);
    // console.log('[STEP 8] Completed pickups:', completedPickupsCount);
    // console.log('[STEP 8] Success rate:', successRate + '%');
    // console.log('[STEP 8] Unique givers:', uniqueGivers);
    // console.log('[STEP 8] Repeat givers:', repeatGiversCount, '(' + repeatGiversRate + '%)');
    // console.log('[STEP 8] Active givers this month:', thisMonthGivers.size);
    
    // Step 9: Calculate Material Breakdown
    // console.log('\n[STEP 9] Calculating material breakdown...');
    const materialTotals = {};
    
    // From initiatives - use materialName and currentQuantity fields
    initiatives.forEach((post, index) => {
      // console.log(`[STEP 9] Initiative ${index + 1}:`, {
      //   postID: post.postID?.slice(0, 8),
      //   hasMaterials: !!post.materials,
      //   materialsIsArray: Array.isArray(post.materials),
      //   materialsLength: post.materials?.length,
      //   wasteType: post.wasteType,
      //   currentAmount: post.currentAmount
      // });
      
      if (post.materials && Array.isArray(post.materials) && post.materials.length > 0) {
        post.materials.forEach((mat, matIndex) => {
          // console.log(`[STEP 9]   Material ${matIndex + 1} raw:`, JSON.stringify(mat));
          
          // Priority order for type: materialName > type > name > material > 'Other'
          const type = mat.materialName || mat.type || mat.name || mat.material || 'Other';
          // Priority order for amount: currentQuantity > amount > quantity > targetQuantity > divide total
          const amount = mat.currentQuantity ?? mat.amount ?? mat.quantity ?? mat.targetQuantity ?? 
                        (post.currentAmount / post.materials.length) ?? 0;
          
          // console.log(`[STEP 9]   Extracted: type="${type}", amount=${amount}`);
          materialTotals[type] = (materialTotals[type] || 0) + amount;
        });
      } else if (post.wasteType) {
        // Single waste type
        // console.log(`[STEP 9]   Using wasteType: ${post.wasteType}, amount: ${post.currentAmount}`);
        materialTotals[post.wasteType] = (materialTotals[post.wasteType] || 0) + (post.currentAmount || 0);
      } else {
        // No materials array and no wasteType - add to Other
        // console.log(`[STEP 9]   No materials or wasteType found, adding ${post.currentAmount} to Other`);
        materialTotals['Other'] = (materialTotals['Other'] || 0) + (post.currentAmount || 0);
      }
    });
    
    // From pickups - actualWaste is an ARRAY of materials
    // console.log('[STEP 9] Processing completed pickups for materials...');
    completedPickups.forEach((pickup, idx) => {
      // console.log(`[STEP 9] Pickup ${idx + 1}:`, {
      //   actualWasteIsArray: Array.isArray(pickup.actualWaste),
      //   actualWasteLength: pickup.actualWaste?.length
      // });
      
      // actualWaste is an ARRAY
      if (Array.isArray(pickup.actualWaste) && pickup.actualWaste.length > 0) {
        pickup.actualWaste.forEach((mat, matIdx) => {
          // console.log(`[STEP 9]   Pickup material ${matIdx + 1}:`, JSON.stringify(mat));
          const type = mat.materialName || mat.type || mat.name || 'Other';
          const amount = mat.quantity || mat.amount || 0;
          // console.log(`[STEP 9]   Extracted: type="${type}", amount=${amount}`);
          materialTotals[type] = (materialTotals[type] || 0) + amount;
        });
      }
      // Fallback: actualWaste as object with materials array inside
      else if (pickup.actualWaste?.materials && Array.isArray(pickup.actualWaste.materials)) {
        pickup.actualWaste.materials.forEach(mat => {
          const type = mat.materialName || mat.type || mat.name || 'Other';
          const amount = mat.currentQuantity || mat.quantity || mat.amount || 0;
          materialTotals[type] = (materialTotals[type] || 0) + amount;
        });
      } 
      // Fallback: actualWaste with wasteType
      else if (pickup.actualWaste?.wasteType) {
        const type = pickup.actualWaste.wasteType;
        const amount = pickup.actualWaste.finalAmount || 0;
        materialTotals[type] = (materialTotals[type] || 0) + amount;
      }
    });
    
    // console.log('[STEP 9] Material totals:', materialTotals);
    
    // Convert to array with percentages
    const materialTotal = Object.values(materialTotals).reduce((sum, amt) => sum + amt, 0);
    const materialBreakdown = Object.entries(materialTotals)
      .map(([type, amount]) => ({
        type,
        amount: Math.round(amount * 100) / 100,
        percentage: materialTotal > 0 ? Math.round((amount / materialTotal) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8); // Top 8 materials
    
    // console.log('[STEP 9] Material breakdown:', materialBreakdown);
    
    // Step 10: Calculate Environmental Impact
    // console.log('\n[STEP 10] Calculating environmental impact...');
    const co2Saved = totalCollected * 2.5; // kg CO2 per kg waste
    const treesEquivalent = Math.floor(co2Saved / 21); // 21kg CO2 per tree/year
    const waterSaved = totalCollected * 50; // liters per kg
    const landfillDiverted = totalCollected / 1000; // tons
    
    // Households served = unique giver IDs from initiatives
    const householdsFromInitiatives = new Set(initiatives.map(p => p.userID)).size;
    const householdsFromPickups = uniqueGivers;
    const householdsServed = Math.max(householdsFromInitiatives, householdsFromPickups, initiatives.length);
    
    // Barangays covered
    const barangays = new Set();
    initiatives.forEach(p => {
      if (p.location?.barangay?.code) barangays.add(p.location.barangay.code);
      else if (p.location?.barangay?.name) barangays.add(p.location.barangay.name);
      else if (p.location?.barangay) barangays.add(p.location.barangay);
    });
    allPickups.forEach(p => {
      if (p.location?.barangay?.code) barangays.add(p.location.barangay.code);
      else if (p.location?.barangay?.name) barangays.add(p.location.barangay.name);
    });
    const barrangaysCovered = barangays.size;
    
    // console.log('[STEP 10] CO2 saved:', co2Saved, 'kg');
    // console.log('[STEP 10] Trees equivalent:', treesEquivalent);
    // console.log('[STEP 10] Water saved:', waterSaved, 'L');
    // console.log('[STEP 10] Landfill diverted:', landfillDiverted, 'tons');
    // console.log('[STEP 10] Households served:', householdsServed);
    // console.log('[STEP 10] Barangays covered:', barrangaysCovered);
    
    // Step 11: Calculate Platform Insights
    // console.log('\n[STEP 11] Calculating platform insights...');
    
    // Peak collection day analysis
    const dayOfWeekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const hourCounts = {};
    
    completedPickups.forEach(pickup => {
      const date = pickup.completedAt?.toDate ? pickup.completedAt.toDate() : 
                   pickup.completedAt ? new Date(pickup.completedAt) :
                   pickup.scheduledDate?.toDate ? pickup.scheduledDate.toDate() : null;
      if (date) {
        dayOfWeekCounts[date.getDay()]++;
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDayIndex = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakCollectionDay = completedPickups.length > 0 ? dayNames[peakDayIndex] : 'N/A';
    
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakCollectionTime = peakHour ? 
      `${parseInt(peakHour) > 12 ? parseInt(peakHour) - 12 : peakHour}:00 ${parseInt(peakHour) >= 12 ? 'PM' : 'AM'}` : 
      'N/A';
    
    // Top barangay analysis
    const barangayVolumes = {};
    initiatives.forEach(p => {
      const brgy = p.location?.barangay?.name || p.location?.barangay || 'Unknown';
      barangayVolumes[brgy] = (barangayVolumes[brgy] || 0) + (p.currentAmount || 0);
    });
    const topBarangay = Object.entries(barangayVolumes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // console.log('[STEP 11] Peak collection day:', peakCollectionDay);
    // console.log('[STEP 11] Peak collection time:', peakCollectionTime);
    // console.log('[STEP 11] Top barangay:', topBarangay);
    
    // Step 12: Build final response
    // console.log('\n[STEP 12] Building response...');
    const responseData = {
      earnings: {
        totalEarnings: Math.round(totalEarnings),
        thisMonth: Math.round(thisMonthEarnings),
        lastMonth: Math.round(lastMonthEarnings),
        growthRate: earningsGrowthRate,
        avgPerPickup: avgPerPickup,
        projectedMonthly: projectedMonthly
      },
      volume: {
        totalCollected: Math.round(totalCollected * 100) / 100,
        thisMonth: Math.round(thisMonthVolume * 100) / 100,
        lastMonth: Math.round(lastMonthVolume * 100) / 100,
        growthRate: volumeGrowthRate,
        avgPerPickup: completedPickups.length > 0 ? Math.round(totalFromPickups / completedPickups.length * 100) / 100 : 0
      },
      operations: {
        totalPickups: totalPickupsCount,
        completedPickups: completedPickupsCount,
        successRate: successRate,
        repeatGivers: repeatGiversRate,
        activeGivers: thisMonthGivers.size
      },
      impact: {
        co2Saved: Math.round(co2Saved * 100) / 100,
        treesEquivalent: treesEquivalent,
        waterSaved: Math.round(waterSaved),
        landfillDiverted: Math.round(landfillDiverted * 1000) / 1000,
        householdsServed: householdsServed,
        barrangaysCovered: barrangaysCovered
      },
      materialBreakdown: materialBreakdown,
      platformInsights: {
        rankInArea: 1, // TODO: Calculate actual rank among orgs in area
        totalOrgsInArea: 1, // TODO: Query total orgs in area
        percentileMaterials: 90, // TODO: Calculate percentile
        avgPickupRating: 4.5, // TODO: Calculate from ratings
        giverSatisfaction: 92, // TODO: Calculate from feedback
        returnGiverRate: repeatGiversRate,
        peakCollectionDay: peakCollectionDay,
        peakCollectionTime: peakCollectionTime,
        topBarangay: topBarangay,
        untappedBarangays: Math.max(0, 10 - barrangaysCovered) // Estimate nearby untapped
      }
    };
    
    // console.log('\n[STEP 12] Final response data:', JSON.stringify(responseData, null, 2));
    // console.log('\n========== ORG ANALYTICS END ==========\n');
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('[ORG-ANALYTICS] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /my/organization/impact-report - Generate comprehensive impact report data
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

    const memberIDs = organization.members.map(m => typeof m === 'string' ? m : m.userID).filter(Boolean);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch initiatives
    let initiatives = [];
    try {
      initiatives = await Post.find({
        userID: { $in: memberIDs },
        postType: 'Initiative'
      });
    } catch (err) { /* ignore */ }

    // Fetch all pickups
    let allPickups = [];
    for (const memberID of memberIDs) {
      try {
        const collectorPickups = await Pickup.findByUser(memberID, 'collector');
        if (collectorPickups) allPickups.push(...collectorPickups);
        const giverPickups = await Pickup.findByUser(memberID, 'giver');
        if (giverPickups) allPickups.push(...giverPickups);
      } catch (err) { /* ignore */ }
    }

    // Fallback: fetch all and filter
    try {
      const allSystemPickups = await Pickup.findAll ? await Pickup.findAll() : [];
      const initiativePostIDs = initiatives.map(i => i.postID).filter(Boolean);
      const relevantPickups = allSystemPickups.filter(p => 
        memberIDs.includes(p.collectorID) || 
        memberIDs.includes(p.giverID) ||
        initiativePostIDs.includes(p.postID)
      );
      allPickups.push(...relevantPickups);
    } catch (err) { /* ignore */ }

    // Deduplicate
    const pickupMap = new Map();
    allPickups.forEach((p, index) => {
      const key = p.pickupID || `${p.collectorID}-${p.giverID}-${p.postID}-${p.createdAt?.seconds || index}`;
      if (!pickupMap.has(key)) pickupMap.set(key, p);
    });
    allPickups = Array.from(pickupMap.values());
    const completedPickups = allPickups.filter(p => p.status === 'Completed');

    // Calculate Earnings
    let totalEarnings = 0;
    let thisMonthEarnings = 0;
    let lastMonthEarnings = 0;

    completedPickups.forEach(pickup => {
      let earning = 0;
      if (Array.isArray(pickup.actualWaste) && pickup.actualWaste.length > 0) {
        earning = pickup.actualWaste.reduce((sum, mat) => {
          return sum + (mat.payment || (mat.quantity * (mat.pricePerKg || 0)) || 0);
        }, 0);
      } else if (pickup.paymentReceived) {
        earning = pickup.paymentReceived;
      }
      totalEarnings += earning;

      const pickupDate = pickup.completedAt?.toDate ? pickup.completedAt.toDate() : 
                         pickup.completedAt ? new Date(pickup.completedAt) : new Date(pickup.createdAt);
      if (pickupDate >= thisMonthStart) {
        thisMonthEarnings += earning;
      } else if (pickupDate >= lastMonthStart && pickupDate <= lastMonthEnd) {
        lastMonthEarnings += earning;
      }
    });

    const earningsGrowthRate = lastMonthEarnings > 0 
      ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : (thisMonthEarnings > 0 ? 100 : 0);
    const avgPerPickup = completedPickups.length > 0 ? Math.round(totalEarnings / completedPickups.length) : 0;

    // Calculate Volume
    const totalFromInitiatives = initiatives.reduce((sum, post) => sum + (post.currentAmount || 0), 0);
    let totalFromPickups = 0;
    completedPickups.forEach(pickup => {
      if (Array.isArray(pickup.actualWaste) && pickup.actualWaste.length > 0) {
        totalFromPickups += pickup.actualWaste.reduce((sum, mat) => sum + (mat.quantity || 0), 0);
      } else if (pickup.actualWaste?.finalAmount) {
        totalFromPickups += pickup.actualWaste.finalAmount;
      }
    });
    const totalCollected = Math.max(totalFromInitiatives, totalFromPickups);

    // Calculate Operations
    const successRate = allPickups.length > 0 ? Math.round((completedPickups.length / allPickups.length) * 100) : 0;
    const giverCounts = {};
    allPickups.forEach(p => { if (p.giverID) giverCounts[p.giverID] = (giverCounts[p.giverID] || 0) + 1; });
    const uniqueGivers = Object.keys(giverCounts).length;
    const repeatGiversCount = Object.values(giverCounts).filter(count => count > 1).length;
    const repeatGiversRate = uniqueGivers > 0 ? Math.round((repeatGiversCount / uniqueGivers) * 100) : 0;

    const thisMonthGivers = new Set();
    allPickups.forEach(p => {
      const pickupDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      if (pickupDate >= thisMonthStart && p.giverID) thisMonthGivers.add(p.giverID);
    });

    // Calculate Material Breakdown
    const materialTotals = {};
    initiatives.forEach(post => {
      if (post.materials && Array.isArray(post.materials) && post.materials.length > 0) {
        post.materials.forEach(mat => {
          const type = mat.materialName || mat.type || mat.name || 'Other';
          const amount = mat.currentQuantity ?? mat.amount ?? mat.quantity ?? 0;
          materialTotals[type] = (materialTotals[type] || 0) + amount;
        });
      }
    });
    completedPickups.forEach(pickup => {
      if (Array.isArray(pickup.actualWaste) && pickup.actualWaste.length > 0) {
        pickup.actualWaste.forEach(mat => {
          const type = mat.materialName || mat.type || 'Other';
          const amount = mat.quantity || mat.amount || 0;
          materialTotals[type] = (materialTotals[type] || 0) + amount;
        });
      }
    });

    const materialTotal = Object.values(materialTotals).reduce((sum, amt) => sum + amt, 0);
    const materialBreakdown = Object.entries(materialTotals)
      .map(([type, amount]) => ({
        type,
        amount: Math.round(amount * 100) / 100,
        percentage: materialTotal > 0 ? Math.round((amount / materialTotal) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // Calculate Environmental Impact
    const co2Saved = totalCollected * 2.5;
    const treesEquivalent = Math.floor(co2Saved / 21);
    const waterSaved = totalCollected * 50;
    const landfillDiverted = totalCollected / 1000;

    const barangays = new Set();
    initiatives.forEach(p => {
      if (p.location?.barangay?.name) barangays.add(p.location.barangay.name);
    });
    const barrangaysCovered = barangays.size;

    // Calculate Platform Insights
    const dayOfWeekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const hourCounts = {};
    completedPickups.forEach(pickup => {
      const date = pickup.completedAt?.toDate ? pickup.completedAt.toDate() : 
                   pickup.completedAt ? new Date(pickup.completedAt) : null;
      if (date) {
        dayOfWeekCounts[date.getDay()]++;
        hourCounts[date.getHours()] = (hourCounts[date.getHours()] || 0) + 1;
      }
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDayIndex = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakCollectionDay = completedPickups.length > 0 ? dayNames[peakDayIndex] : 'N/A';
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakCollectionTime = peakHour ? 
      `${parseInt(peakHour) > 12 ? parseInt(peakHour) - 12 : peakHour}:00 ${parseInt(peakHour) >= 12 ? 'PM' : 'AM'}` : 'N/A';

    const barangayVolumes = {};
    initiatives.forEach(p => {
      const brgy = p.location?.barangay?.name || 'Unknown';
      barangayVolumes[brgy] = (barangayVolumes[brgy] || 0) + (p.currentAmount || 0);
    });
    const topBarangay = Object.entries(barangayVolumes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Build comprehensive report
    const reportData = {
      // Organization Info
      organizationName: organization.organizationName,
      organizationDescription: organization.description || '',
      generatedAt: new Date().toISOString(),
      reportPeriod: 'All Time',
      memberCount: memberIDs.length,

      // Earnings
      earnings: {
        totalEarnings: Math.round(totalEarnings),
        thisMonth: Math.round(thisMonthEarnings),
        lastMonth: Math.round(lastMonthEarnings),
        growthRate: earningsGrowthRate,
        avgPerPickup: avgPerPickup
      },

      // Volume
      volume: {
        totalCollected: Math.round(totalCollected * 100) / 100,
        fromInitiatives: Math.round(totalFromInitiatives * 100) / 100,
        fromPickups: Math.round(totalFromPickups * 100) / 100
      },

      // Operations
      operations: {
        totalPickups: allPickups.length,
        completedPickups: completedPickups.length,
        successRate: successRate,
        uniqueGivers: uniqueGivers,
        repeatGivers: repeatGiversRate,
        activeGiversThisMonth: thisMonthGivers.size
      },

      // Environmental Impact
      impact: {
        co2Saved: Math.round(co2Saved * 100) / 100,
        treesEquivalent: treesEquivalent,
        waterSaved: Math.round(waterSaved),
        landfillDiverted: Math.round(landfillDiverted * 1000) / 1000,
        householdsServed: uniqueGivers,
        barrangaysCovered: barrangaysCovered
      },

      // Material Breakdown
      materialBreakdown: materialBreakdown,

      // Platform Insights
      insights: {
        peakCollectionDay: peakCollectionDay,
        peakCollectionTime: peakCollectionTime,
        topBarangay: topBarangay,
        totalInitiatives: initiatives.length,
        completedInitiatives: initiatives.filter(i => i.status === 'Completed').length
      }
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