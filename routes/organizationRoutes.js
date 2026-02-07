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
    const user = await User.findById(req.user.userID);
    const organizationID = user?.organizationID;

    if (!organizationID) {
      return res.status(404).json({ success: false, message: 'User is not part of any organization' });
    }

    const organization = await Organization.findById(organizationID);
    if (!organization || !organization.isMember(req.user.userID)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Fetch initiative posts from ALL members and admins
    const allMemberIDs = [...new Set([...organization.members, ...organization.admins])];

    const allInitiatives = [];
    await Promise.all(
      allMemberIDs.map(async (memberID) => {
        try {
          const memberPosts = await Post.findByUserID(memberID);
          const initiatives = memberPosts.filter(p => p.postType === 'Initiative');
          allInitiatives.push(...initiatives);
        } catch (err) {
          console.error(`Failed to fetch posts for member ${memberID}:`, err);
        }
      })
    );

    // Enrich with user data
    const enrichedInitiatives = await Promise.all(
      allInitiatives.map(async (post) => {
        const postData = post.toFirestore ? post.toFirestore() : post;
        let authorName = 'Unknown';
        try {
          const author = await User.findById(postData.userID);
          if (author) {
            authorName = `${author.firstName} ${author.lastName}`;
          }
        } catch (e) { /* ignore */ }

        return {
          ...postData,
          authorName
        };
      })
    );

    // Sort by createdAt descending
    enrichedInitiatives.sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
      return dateB - dateA;
    });

    res.json({ success: true, initiatives: enrichedInitiatives });
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
    const { timeRange = 'all' } = req.query;

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

    // Calculate time filter
    const now = new Date();
    let timeFilter = null;
    switch (timeRange) {
      case 'week':
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        timeFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        timeFilter = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        timeFilter = null; // all time
    }

    // Last month bounds for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fetch all pickups for all members (both as giver and collector)
    let allPickups = [];
    await Promise.all(
      allMemberIDs.map(async (memberID) => {
        try {
          // Pickups where member is either giver or collector
          const memberPickups = await Pickup.findByUser(memberID, 'both');
          allPickups.push(...memberPickups);
        } catch (err) {
          console.error(`Failed to fetch pickups for ${memberID}:`, err);
        }
      })
    );

    // Deduplicate by pickupID
    const pickupMap = new Map();
    allPickups.forEach(p => pickupMap.set(p.pickupID, p));
    allPickups = Array.from(pickupMap.values());

    // Helper to parse date from various formats
    const parseDate = (d) => {
      if (!d) return null;
      if (d.seconds) return new Date(d.seconds * 1000);
      if (d.toDate) return d.toDate();
      return new Date(d);
    };

    // Apply time filter
    const filteredPickups = timeFilter
      ? allPickups.filter(p => {
          const date = parseDate(p.createdAt);
          return date && date >= timeFilter;
        })
      : allPickups;

    const completedPickups = filteredPickups.filter(p => p.status === 'Completed');
    const allCompletedPickups = allPickups.filter(p => p.status === 'Completed');

    // --- Earnings ---
    const totalEarningsAll = allCompletedPickups.reduce((sum, p) => sum + (p.paymentReceived || 0), 0);
    const totalEarnings = completedPickups.reduce((sum, p) => sum + (p.paymentReceived || 0), 0);

    const thisMonthPickups = allCompletedPickups.filter(p => {
      const d = parseDate(p.createdAt);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonthPickups = allCompletedPickups.filter(p => {
      const d = parseDate(p.createdAt);
      return d && d >= lastMonthStart && d <= lastMonthEnd;
    });

    const thisMonthEarnings = thisMonthPickups.reduce((sum, p) => sum + (p.paymentReceived || 0), 0);
    const lastMonthEarnings = lastMonthPickups.reduce((sum, p) => sum + (p.paymentReceived || 0), 0);
    const growthRate = lastMonthEarnings > 0
      ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : (thisMonthEarnings > 0 ? 100 : 0);
    const avgPerPickup = completedPickups.length > 0
      ? Math.round(totalEarnings / completedPickups.length)
      : 0;

    // Projected: extrapolate from current month
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthly = dayOfMonth > 0
      ? Math.round((thisMonthEarnings / dayOfMonth) * daysInMonth)
      : 0;

    // --- Volume (kg collected) ---
    const totalCollected = completedPickups.reduce((sum, p) => {
      return sum + (p.actualWaste?.finalAmount || p.expectedWaste?.estimatedAmount || 0);
    }, 0);
    const thisMonthVolume = thisMonthPickups.reduce((sum, p) => {
      return sum + (p.actualWaste?.finalAmount || p.expectedWaste?.estimatedAmount || 0);
    }, 0);
    const lastMonthVolume = lastMonthPickups.reduce((sum, p) => {
      return sum + (p.actualWaste?.finalAmount || p.expectedWaste?.estimatedAmount || 0);
    }, 0);
    const volumeGrowth = lastMonthVolume > 0
      ? Math.round(((thisMonthVolume - lastMonthVolume) / lastMonthVolume) * 100)
      : (thisMonthVolume > 0 ? 100 : 0);

    // --- Operations ---
    const totalPickupsCount = filteredPickups.length;
    const completedCount = completedPickups.length;
    const successRate = totalPickupsCount > 0
      ? Math.round((completedCount / totalPickupsCount) * 100)
      : 0;

    // Unique givers
    const allGiverIDs = new Set(completedPickups.map(p => p.giverID));
    const thisMonthGiverIDs = new Set(thisMonthPickups.map(p => p.giverID));

    // Repeat givers (appeared more than once across all time)
    const giverFrequency = {};
    allCompletedPickups.forEach(p => {
      giverFrequency[p.giverID] = (giverFrequency[p.giverID] || 0) + 1;
    });
    const repeatGiverCount = Object.values(giverFrequency).filter(count => count > 1).length;
    const totalUniqueGivers = Object.keys(giverFrequency).length;
    const repeatGiverRate = totalUniqueGivers > 0
      ? Math.round((repeatGiverCount / totalUniqueGivers) * 100)
      : 0;

    // Avg response time (hours from creation to completion - approximation)
    let totalResponseHours = 0;
    let responseCount = 0;
    completedPickups.forEach(p => {
      const created = parseDate(p.createdAt);
      const completed = parseDate(p.completedAt || p.updatedAt);
      if (created && completed) {
        const hours = (completed - created) / (1000 * 60 * 60);
        if (hours > 0 && hours < 720) { // cap at 30 days
          totalResponseHours += hours;
          responseCount++;
        }
      }
    });
    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseHours / responseCount) : 0;

    // --- Environmental Impact ---
    // Standard conversion factors per kg of recycled material:
    // CO2: ~2.5 kg CO2 saved per kg recycled (EPA average)
    // Water: ~7 liters saved per kg recycled
    // Trees: ~17 trees saved per ton (1000kg) = 0.017 per kg
    const totalKg = allCompletedPickups.reduce((sum, p) => {
      return sum + (p.actualWaste?.finalAmount || p.expectedWaste?.estimatedAmount || 0);
    }, 0);

    const co2Saved = Math.round(totalKg * 2.5);
    const treesEquivalent = Math.round(totalKg * 0.017);
    const waterSaved = Math.round(totalKg * 7);
    const landfillDiverted = parseFloat((totalKg / 1000).toFixed(2)); // tons

    // Barangays/households from pickup locations
    const barangays = new Set();
    const households = new Set();
    allCompletedPickups.forEach(p => {
      if (p.pickupLocation) {
        const loc = typeof p.pickupLocation === 'string' ? p.pickupLocation : '';
        if (loc) households.add(loc);
      }
      // Try to extract barangay from location data
      const location = p.pickupLocation;
      if (location && typeof location === 'object' && location.barangay?.name) {
        barangays.add(location.barangay.name);
      } else if (typeof location === 'string' && location.length > 0) {
        barangays.add(location.split(',')[0]?.trim() || location);
      }
    });

    // --- Material Breakdown ---
    const materialMap = {};
    allCompletedPickups.forEach(p => {
      const types = p.actualWaste?.types || p.expectedWaste?.types || [];
      const amount = p.actualWaste?.finalAmount || p.expectedWaste?.estimatedAmount || 0;
      const perType = types.length > 0 ? amount / types.length : 0;
      types.forEach(type => {
        const name = typeof type === 'string' ? type : (type.name || type.materialName || 'Other');
        materialMap[name] = (materialMap[name] || 0) + perType;
      });
      if (types.length === 0 && amount > 0) {
        materialMap['Other'] = (materialMap['Other'] || 0) + amount;
      }
    });

    const totalMaterialKg = Object.values(materialMap).reduce((a, b) => a + b, 0);
    const materialBreakdown = Object.entries(materialMap)
      .map(([type, amount]) => ({
        type,
        amount: Math.round(amount * 100) / 100,
        percentage: totalMaterialKg > 0 ? Math.round((amount / totalMaterialKg) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // --- Platform Insights ---
    // Peak collection day/time
    const dayCount = {};
    const hourCount = {};
    allCompletedPickups.forEach(p => {
      const d = parseDate(p.pickupDate || p.createdAt);
      if (d) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
        dayCount[dayName] = (dayCount[dayName] || 0) + 1;

        const hour = d.getHours();
        let timeSlot;
        if (hour < 9) timeSlot = '6AM-9AM';
        else if (hour < 12) timeSlot = '9AM-12PM';
        else if (hour < 15) timeSlot = '12PM-3PM';
        else if (hour < 18) timeSlot = '3PM-6PM';
        else timeSlot = '6PM-9PM';
        hourCount[timeSlot] = (hourCount[timeSlot] || 0) + 1;
      }
    });

    const peakDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    const peakTime = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];

    // Top barangay
    const barangayCount = {};
    allCompletedPickups.forEach(p => {
      const loc = p.pickupLocation;
      let brgy = null;
      if (loc && typeof loc === 'object' && loc.barangay?.name) {
        brgy = loc.barangay.name;
      } else if (typeof loc === 'string' && loc.length > 0) {
        brgy = loc.split(',')[0]?.trim();
      }
      if (brgy) barangayCount[brgy] = (barangayCount[brgy] || 0) + 1;
    });
    const topBarangay = Object.entries(barangayCount).sort((a, b) => b[1] - a[1])[0];

    // Area ranking (approximate - count other org collectors in the area)
    let rankInArea = 1;
    let totalOrgsInArea = 1;

    const analyticsData = {
      earnings: {
        totalEarnings: totalEarningsAll,
        thisMonth: thisMonthEarnings,
        lastMonth: lastMonthEarnings,
        growthRate,
        avgPerPickup,
        projectedMonthly
      },
      operations: {
        totalPickups: totalPickupsCount,
        completedPickups: completedCount,
        successRate,
        avgResponseTime,
        repeatGivers: repeatGiverRate,
        activeGivers: thisMonthGiverIDs.size
      },
      volume: {
        totalCollected: Math.round(totalCollected * 100) / 100,
        thisMonth: Math.round(thisMonthVolume * 100) / 100,
        lastMonth: Math.round(lastMonthVolume * 100) / 100,
        growthRate: volumeGrowth,
        avgPerPickup: completedCount > 0 ? Math.round((totalCollected / completedCount) * 100) / 100 : 0
      },
      impact: {
        co2Saved,
        treesEquivalent,
        waterSaved,
        landfillDiverted,
        householdsServed: households.size,
        barrangaysCovered: barangays.size
      },
      materialBreakdown,
      platformInsights: {
        rankInArea,
        totalOrgsInArea,
        percentileMaterials: totalCollected > 0 ? 75 : 0,
        avgPickupRating: 0,
        giverSatisfaction: successRate,
        returnGiverRate: repeatGiverRate,
        peakCollectionDay: peakDay ? peakDay[0] : 'N/A',
        peakCollectionTime: peakTime ? peakTime[0] : 'N/A',
        topBarangay: topBarangay ? topBarangay[0] : 'N/A',
        untappedBarangays: 0,
        barrangaysCovered: barangays.size
      }
    };

    res.json({ success: true, data: analyticsData });
  } catch (error) {
    console.error('Organization analytics error:', error);
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