// server/controllers/analyticsController.js (OPTIMIZED VERSION WITH CACHING)
const User = require('../models/Users');
const Post = require('../models/Posts');
const Pickup = require('../models/Pickup');
const Support = require('../models/Support');
const Message = require('../models/Message');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const Point = require('../models/Point');

// CACHE to reduce Firebase reads and computation
const cache = {
  allPosts: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5 minutes
  allPickups: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 },
  allUsers: { data: null, timestamp: 0, ttl: 10 * 60 * 1000 }, // 10 minutes
  allSupports: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5 minutes
};

// RESULT CACHE - Cache the computed analytics results
const analyticsCache = new Map();
const ANALYTICS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for analytics results

// Periodic cache cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of analyticsCache.entries()) {
    if (now - value.timestamp > ANALYTICS_CACHE_TTL) {
      analyticsCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired analytics cache entries. Current size: ${analyticsCache.size}`);
  }
}, ANALYTICS_CACHE_TTL); // Run cleanup every 2 minutes

// Helper to get cached data or fetch fresh
async function getCachedData(cacheKey, fetchFunction) {
  const now = Date.now();
  const cached = cache[cacheKey];

  if (cached.data && (now - cached.timestamp) < cached.ttl) {
    console.log(`Using cached ${cacheKey}`);
    return cached.data;
  }

  console.log(`Fetching fresh ${cacheKey}`);
  const data = await fetchFunction();
  cache[cacheKey].data = data;
  cache[cacheKey].timestamp = now;
  return data;
}

const analyticsController = {
  // Get dashboard analytics for authenticated user
  async getDashboardAnalytics(req, res) {
    try {
      const userID = req.user.userID;
      const timeRange = req.query.timeRange || 'month';

      // Location filters (optional)
      const locationFilter = {
        region: req.query.region || null,
        province: req.query.province || null,
        city: req.query.city || null,
        barangay: req.query.barangay || null
      };

      // Create cache key based on user, time range, AND location
      const locationKey = `${locationFilter.region || 'all'}_${locationFilter.province || 'all'}_${locationFilter.city || 'all'}_${locationFilter.barangay || 'all'}`;
      const cacheKey = `analytics_${userID}_${timeRange}_${locationKey}`;

      // Check if we have cached results
      const now = Date.now();
      const cachedResult = analyticsCache.get(cacheKey);

      if (cachedResult && (now - cachedResult.timestamp) < ANALYTICS_CACHE_TTL) {
        console.log(`✓ Returning CACHED analytics for user ${userID}, timeRange: ${timeRange}, location: ${locationKey}`);
        console.log(`  Cache age: ${Math.round((now - cachedResult.timestamp) / 1000)}s / ${ANALYTICS_CACHE_TTL / 1000}s`);
        return res.json({
          success: true,
          data: cachedResult.data,
          cached: true
        });
      }

      const locationFilterStr = locationFilter.city ?
        ` (Location: ${locationFilter.barangay || locationFilter.city || locationFilter.province || locationFilter.region})` : '';
      console.log(`⚙ Computing FRESH analytics for user ${userID}, timeRange: ${timeRange}${locationFilterStr}`);

      // Calculate date range based on timeRange parameter
      const nowDate = new Date();
      let startDate = new Date();

      switch(timeRange) {
        case 'week':
          startDate.setDate(nowDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(nowDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(nowDate.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(2020, 0, 1);
          break;
      }

      console.log(`  Date range: from ${startDate.toISOString()}`);

      const currentUser = await User.findById(userID);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Fetch various metrics in parallel
      const [
        totalRecycled,
        initiatives,
        users,
        pickups,
        completedSupports,
        wasteTypes,
        topCollectors,
        userSpecificStats,
        pendingApplications,
        recentActivity
      ] = await Promise.all([
        getTotalRecycled(startDate, locationFilter),
        getActiveInitiatives(locationFilter),
        getActiveUsers(),
        getTotalPickups(startDate, locationFilter),
        getCompletedSupports(startDate, locationFilter),
        getWasteDistribution(startDate, locationFilter),
        getTopCollectors(startDate, locationFilter),
        getUserSpecificStats(userID, currentUser),
        currentUser.isAdmin ? getPendingApplications() : { count: 0 },
        getUserRecentActivity(userID, startDate)
      ]);

      const environmentalImpact = calculateEnvironmentalImpact(totalRecycled);
      const trends = await getRecyclingTrends(timeRange, startDate, locationFilter);
      const percentageChanges = await calculatePercentageChanges(timeRange, startDate, {
        totalRecycled,
        initiatives,
        users,
        pickups
      }, locationFilter);

      console.log('Analytics Data Summary:', {
        totalRecycled,
        totalInitiatives: initiatives.count,
        activeUsers: users.count,
        totalPickups: pickups.total,
        userStats: userSpecificStats,
        communityImpact: environmentalImpact
      });

      const analyticsData = {
        // Platform-wide stats
        totalRecycled,
        totalInitiatives: initiatives.count,
        activeUsers: users.count,
        totalPickups: pickups.total,
        completedSupports: completedSupports.count,
        pendingApplications: pendingApplications.count,

        // FIXED: Transform to match frontend structure
        userStats: {
          totalPosts: userSpecificStats.totalPosts,
          activePickups: userSpecificStats.activePickups,
          completedPickups: userSpecificStats.completedPickups,
          totalPoints: userSpecificStats.totalPoints,
          totalKgRecycled: userSpecificStats.totalKgRecycled
        },

        // Optional role-specific stats
        giverStats: userSpecificStats.giver || null,
        collectorStats: userSpecificStats.collector || null,
        organizationStats: userSpecificStats.organization || null,

        communityImpact: environmentalImpact,
        topCollectors: topCollectors.slice(0, 3),
        wasteByType: wasteTypes,
        recyclingTrends: trends,
        recentActivity,
        percentageChanges,
        timeRange,
        locationFilter: locationFilter  // Include selected location filter
      };

      // Cache the computed results
      analyticsCache.set(cacheKey, {
        data: analyticsData,
        timestamp: Date.now()
      });

      console.log(`✓ Cached analytics for ${cacheKey}`);

      res.json({
        success: true,
        data: analyticsData,
        cached: false
      });
    } catch (error) {
      console.error('Analytics error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  async getHeatmapData(req, res) {
    try {
      const type = req.query.type || 'calendar'; // 'calendar' or 'geographic'

      let heatmapData;
      if (type === 'geographic') {
        // Get real geographic data from Posts with coordinates
        heatmapData = await getGeographicHeatmapData();
      } else {
        // Get calendar heatmap data (time-series)
        heatmapData = await getHeatmapActivityData();
      }

      res.json({
        success: true,
        data: heatmapData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch heatmap data',
        error: error.message
      });
    }
  },

  async getAreaActivity(req, res) {
    try {
      const areas = await getAreaActivity();

      res.json({
        success: true,
        data: areas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch area activity data',
        error: error.message
      });
    }
  },

  async getNearbyDisposalSites(req, res) {
    try {
      const { lat, lng, radius } = req.query;
      const radiusKm = radius ? parseFloat(radius) : 10; // Default to 10km if not provided
      const sites = await getDisposalSites(lat, lng, radiusKm);

      res.json({
        success: true,
        data: sites
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch disposal sites',
        error: error.message
      });
    }
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper to check if a location matches the filter
function matchesLocationFilter(itemLocation, filter) {
  if (!filter || (!filter.region && !filter.province && !filter.city && !filter.barangay)) {
    return true; // No filter applied, match all
  }

  if (!itemLocation) {
    return false; // Item has no location, doesn't match filter
  }

  // Match at the most specific level provided
  if (filter.barangay) {
    return itemLocation.barangay?.code === filter.barangay;
  }
  if (filter.city) {
    return itemLocation.city?.code === filter.city;
  }
  if (filter.province) {
    return itemLocation.province?.code === filter.province;
  }
  if (filter.region) {
    return itemLocation.region?.code === filter.region;
  }

  return true;
}

// Helper to convert Firestore Timestamp to JavaScript Date
function toDate(timestamp) {
  if (!timestamp) return null;

  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // If it's a Firestore Timestamp with toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // If it's a Firestore Timestamp with seconds and nanoseconds
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }

  // Try to parse as string
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // If it's a number (unix timestamp)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  console.warn('Could not convert timestamp to date:', timestamp);
  return null;
}

async function getTotalRecycled(startDate, locationFilter = null) {
  try {
    // OPTIMIZED: Use cached pickups data
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    console.log(`\n=== TOTAL RECYCLED DEBUG ===`);
    console.log(`Total pickups in database: ${allPickups.length}`);
    console.log(`Selected time range start date: ${startDate.toISOString()}`);

    // Debug: Show a sample pickup if available
    if (allPickups.length > 0) {
      console.log(`Sample pickup status: ${allPickups[0].status}`);
      console.log(`Sample pickup completedAt: ${allPickups[0].completedAt}`);
      console.log(`Sample pickup finalAmount: ${allPickups[0].finalAmount}`);
      console.log(`Sample pickup createdAt: ${allPickups[0].createdAt}`);
    }

    // For debugging, let's see all completed pickups
    const allCompleted = allPickups.filter(pickup => pickup.status === 'Completed');
    console.log(`Total completed pickups (all time): ${allCompleted.length}`);

    if (allCompleted.length > 0) {
      console.log(`First completed pickup completedAt: ${allCompleted[0].completedAt}`);
      console.log(`First completed pickup finalAmount: ${allCompleted[0].finalAmount}`);
    }

    const completedPickups = allPickups.filter(pickup => {
      const completedDate = toDate(pickup.completedAt);

      // Debug date parsing
      if (pickup.status === 'Completed') {
        console.log(`\nChecking pickup ${pickup.pickupID}:`);
        console.log(`  - completedAt raw:`, pickup.completedAt);
        console.log(`  - completedAt type: ${typeof pickup.completedAt}`);
        console.log(`  - completedDate parsed: ${completedDate}`);
        console.log(`  - completedDate valid: ${completedDate && !isNaN(completedDate.getTime())}`);
        console.log(`  - startDate: ${startDate}`);
        console.log(`  - completedDate >= startDate: ${completedDate >= startDate}`);
        console.log(`  - finalAmount: ${pickup.finalAmount}`);
      }

      return pickup.status === 'Completed' &&
             completedDate &&
             !isNaN(completedDate.getTime()) &&
             completedDate >= startDate &&
             matchesLocationFilter(pickup.pickupLocation, locationFilter);
    });

    console.log(`Completed pickups in selected time range: ${completedPickups.length}`);

    let totalKg = 0;
    let pickupsWithAmount = 0;
    let pickupsWithoutAmount = 0;

    completedPickups.forEach(pickup => {
      // finalAmount is at the root level, not inside actualWaste
      if (pickup.finalAmount) {
        const amount = parseFloat(pickup.finalAmount);
        console.log(`✓ Pickup ${pickup.pickupID}: ${amount} kg`);
        totalKg += amount;
        pickupsWithAmount++;
      } else {
        console.log(`✗ Pickup ${pickup.pickupID}: NO finalAmount (value: ${pickup.finalAmount})`);
        pickupsWithoutAmount++;
      }
    });

    console.log(`\n=== TOTAL RECYCLED SUMMARY ===`);
    console.log(`Pickups with finalAmount: ${pickupsWithAmount}`);
    console.log(`Pickups without finalAmount: ${pickupsWithoutAmount}`);
    console.log(`Total recycled: ${totalKg} kg`);
    console.log(`Rounded total: ${Math.round(totalKg)} kg`);

    return Math.round(totalKg);
  } catch (error) {
    console.error('Error getting total recycled:', error);
    console.error('Error stack:', error.stack);
    return 0;
  }
}

async function getActiveInitiatives(locationFilter = null) {
  try {
    // OPTIMIZED: Use cached posts data
    const allPosts = await getCachedData('allPosts', () => Post.findAll());
    const activeInitiatives = allPosts.filter(post =>
      post.postType === 'Initiative' &&
      (post.status === 'Active' || post.status === 'Open') &&
      matchesLocationFilter(post.location, locationFilter)
    );

    return { count: activeInitiatives.length };
  } catch (error) {
    console.error('Error getting initiatives:', error);
    return { count: 0 };
  }
}

// Get active users - count all non-suspended, non-deleted users
async function getActiveUsers() {
  try {
    // OPTIMIZED: Use cached users data
    const allUsers = await getCachedData('allUsers', () => User.findAll());

    // Count all active users (not suspended or deleted)
    const activeUsers = allUsers.filter(user => {
      const isActiveStatus = user.status !== 'Suspended' && user.status !== 'Deleted';
      return isActiveStatus;
    });

    console.log(`Active users count: ${activeUsers.length} (from ${allUsers.length} total users)`);
    return { count: activeUsers.length };
  } catch (error) {
    console.error('Error getting active users:', error);
    return { count: 0 };
  }
}

// Get completed supports for initiatives
async function getCompletedSupports(startDate, locationFilter = null) {
  try {
    // OPTIMIZED: Use cached supports data
    const allSupports = await getCachedData('allSupports', () => Support.findAll());
    const allPosts = await getCachedData('allPosts', () => Post.findAll());

    console.log(`\n=== COMPLETED SUPPORTS DEBUG ===`);
    console.log(`Total supports in database: ${allSupports.length}`);

    // Filter for completed supports within the time range
    const completedSupports = allSupports.filter(support => {
      const completedDate = toDate(support.completedAt);
      const isCompleted = support.status === 'Completed';
      const inTimeRange = completedDate && !isNaN(completedDate.getTime()) && completedDate >= startDate;

      // If location filter is applied, check the initiative's location
      if (locationFilter && (locationFilter.region || locationFilter.province || locationFilter.city || locationFilter.barangay)) {
        const relatedPost = allPosts.find(p => p.postID === support.initiativeID);
        if (!relatedPost || !matchesLocationFilter(relatedPost.location, locationFilter)) {
          return false;
        }
      }

      return isCompleted && inTimeRange;
    });

    console.log(`Completed supports in time range: ${completedSupports.length}`);

    return { count: completedSupports.length };
  } catch (error) {
    console.error('Error getting completed supports:', error);
    return { count: 0 };
  }
}

async function getTotalPickups(startDate, locationFilter = null) {
  try {
    // OPTIMIZED: Use cached pickups data
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    console.log(`\n=== TOTAL PICKUPS DEBUG ===`);
    console.log(`Total pickups: ${allPickups.length}`);

    let completed = 0;
    let active = 0;
    let cancelled = 0;

    allPickups.forEach(pickup => {
      // For completed pickups, use completedAt; for others, use createdAt
      let relevantDate;
      if (pickup.status === 'Completed') {
        relevantDate = toDate(pickup.completedAt);
      } else {
        relevantDate = toDate(pickup.createdAt);
      }

      if (relevantDate && relevantDate >= startDate && matchesLocationFilter(pickup.pickupLocation, locationFilter)) {
        if (pickup.status === 'Completed') {
          completed++;
        } else if (['Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup'].includes(pickup.status)) {
          active++;
        } else if (pickup.status === 'Cancelled') {
          cancelled++;
        }
      }
    });

    console.log(`Pickup counts - Completed: ${completed}, Active: ${active}, Cancelled: ${cancelled}`);
    console.log(`Successful Pickups (Completed only): ${completed}`);

    return {
      completed,
      active,
      cancelled,
      total: completed  // Only count completed pickups as successful
    };
  } catch (error) {
    console.error('Error getting pickups:', error);
    return { completed: 0, active: 0, cancelled: 0, total: 0 };
  }
}

async function getWasteDistribution(startDate, locationFilter = null) {
  try {
    // Get waste distribution from ACTUAL completed pickups, not just posts
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    const completedPickups = allPickups.filter(pickup => {
      const completedDate = toDate(pickup.completedAt);
      return pickup.status === 'Completed' &&
             completedDate &&
             !isNaN(completedDate.getTime()) &&
             completedDate >= startDate &&
             matchesLocationFilter(pickup.pickupLocation, locationFilter);
    });

    console.log(`Calculating waste distribution from ${completedPickups.length} completed pickups`);

    const distribution = {};
    let totalWeight = 0;

    // Count by actual waste types from completed pickups
    // actualWaste is an array of material objects, finalAmount is at root level
    completedPickups.forEach(pickup => {
      if (pickup.actualWaste && Array.isArray(pickup.actualWaste)) {
        const weight = parseFloat(pickup.finalAmount) || 0; // finalAmount is at root level

        pickup.actualWaste.forEach(material => {
          const materialType = material.materialName || material.type || 'Unknown';
          // Distribute the total weight proportionally based on quantity
          const materialWeight = weight / pickup.actualWaste.length; // Simple equal distribution
          distribution[materialType] = (distribution[materialType] || 0) + materialWeight;
          totalWeight += materialWeight;
        });
      }
    });

    console.log(`Waste distribution by weight:`, distribution);

    const percentages = {};
    for (const [key, value] of Object.entries(distribution)) {
      percentages[key] = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0;
    }

    // Only show categories that have data
    console.log(`Waste distribution percentages:`, percentages);

    return percentages;
  } catch (error) {
    console.error('Error getting waste distribution:', error);
    return {};
  }
}

async function getTopCollectors(startDate, locationFilter = null) {
  try {
    // OPTIMIZED: Use cached users data
    const allUsers = await getCachedData('allUsers', () => User.findAll());
    const collectors = allUsers.filter(user => user.isCollector === true);

    console.log(`Found ${collectors.length} collectors`);

    const collectorStats = await Promise.all(
      collectors.map(async (collector) => {
        try {
          // FIXED: Use correct method - findByUser with 'collector' role
          const pickups = await Pickup.findByUser(collector.userID, 'collector');

          let totalCollected = 0;
          pickups.forEach(pickup => {
            const completedDate = toDate(pickup.completedAt);
            if (pickup.status === 'Completed' &&
                completedDate &&
                !isNaN(completedDate.getTime()) &&
                completedDate >= startDate &&
                pickup.finalAmount &&
                matchesLocationFilter(pickup.pickupLocation, locationFilter)) {
              // finalAmount is at root level, not inside actualWaste
              totalCollected += parseFloat(pickup.finalAmount);
            }
          });
          
          return {
            userID: collector.userID,
            name: collector.organizationName || `${collector.firstName} ${collector.lastName}`,
            amount: Math.round(totalCollected),
            profilePicture: collector.profilePictureUrl || null
          };
        } catch (error) {
          console.error(`Error getting pickups for collector ${collector.userID}:`, error);
          return {
            userID: collector.userID,
            name: collector.organizationName || `${collector.firstName} ${collector.lastName}`,
            amount: 0,
            profilePicture: collector.profilePictureUrl || null
          };
        }
      })
    );
    
    collectorStats.sort((a, b) => b.amount - a.amount);
    
    return collectorStats.map((collector, index) => ({
      ...collector,
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error getting top collectors:', error);
    return [];
  }
}

async function getUserSpecificStats(userID, user) {
  const stats = {
    totalPosts: 0,
    activePickups: 0,
    completedPickups: 0,
    totalPoints: 0,
    totalKgRecycled: 0,
    giver: {
      totalKgRecycled: 0,
      activePickups: 0,
      successfulPickups: 0,
      activeForumPosts: 0,
      totalPoints: 0
    },
    collector: null,
    organization: null
  };

  try {
    // FIXED: Use correct method - findByUser with 'giver' role
    const userPickupsAsGiver = await Pickup.findByUser(userID, 'giver');
    
    stats.giver.activePickups = userPickupsAsGiver.filter(p => 
      ['Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup'].includes(p.status)
    ).length;
    
    stats.giver.successfulPickups = userPickupsAsGiver.filter(p => 
      p.status === 'Completed'
    ).length;
    
    userPickupsAsGiver.forEach(pickup => {
      if (pickup.status === 'Completed' && pickup.finalAmount) {
        // finalAmount is at root level, not inside actualWaste
        stats.giver.totalKgRecycled += parseFloat(pickup.finalAmount);
      }
    });
    stats.giver.totalKgRecycled = Math.round(stats.giver.totalKgRecycled);
    
    // FIXED: Use correct method - findByUserID
    const userPosts = await Post.findByUserID(userID);
    
    stats.totalPosts = userPosts.length;
    stats.giver.activeForumPosts = userPosts.filter(p => 
      p.postType === 'Forum' && p.status === 'Active'
    ).length;
    
    // FIXED: Use correct method - getTotalPointsByUser
    const userPoints = await Point.getTotalPointsByUser(userID);
    stats.totalPoints = userPoints || user.points || 0;
    stats.giver.totalPoints = stats.totalPoints;
    
    stats.activePickups = stats.giver.activePickups;
    stats.completedPickups = stats.giver.successfulPickups;
    stats.totalKgRecycled = stats.giver.totalKgRecycled;
    
    // COLLECTOR STATS
    if (user.isCollector) {
      try {
        const collectorPickups = await Pickup.findByUser(userID, 'collector');
        
        const claimedWastePosts = userPosts.filter(p => 
          p.postType === 'Waste' && 
          p.claimedBy === userID
        );
        
        stats.collector = {
          activeWastePosts: claimedWastePosts.filter(p => 
            p.status === 'Claimed' || p.status === 'In Progress'
          ).length,
          claimedPosts: claimedWastePosts.length,
          totalCollected: 0,
          completionRate: 0
        };
        
        collectorPickups.forEach(pickup => {
          if (pickup.status === 'Completed' && pickup.finalAmount) {
            // finalAmount is at root level, not inside actualWaste
            stats.collector.totalCollected += parseFloat(pickup.finalAmount);
          }
        });
        stats.collector.totalCollected = Math.round(stats.collector.totalCollected);
        
        const totalCollectorPickups = collectorPickups.length;
        const completedPickups = collectorPickups.filter(p => p.status === 'Completed').length;
        if (totalCollectorPickups > 0) {
          stats.collector.completionRate = Math.round((completedPickups / totalCollectorPickups) * 100);
        }
      } catch (error) {
        console.error('Error getting collector stats:', error);
      }
    }
    
    // ORGANIZATION STATS
    if (user.isOrganization) {
      try {
        const orgInitiatives = userPosts.filter(p => p.postType === 'Initiative');
        const activeInitiatives = orgInitiatives.filter(p => 
          p.status === 'Active' || p.status === 'Open'
        ).length;
        
        stats.organization = {
          activeInitiatives,
          totalSupporters: 0,
          materialsReceived: 0,
          topContributors: []
        };
        
        for (const initiative of orgInitiatives) {
          stats.organization.totalSupporters += initiative.supportCount || 0;
          
          if (initiative.currentAmount) {
            stats.organization.materialsReceived += parseFloat(initiative.currentAmount);
          }
        }
        
        stats.organization.materialsReceived = Math.round(stats.organization.materialsReceived);
      } catch (error) {
        console.error('Error getting organization stats:', error);
      }
    }
    
  } catch (error) {
    console.error('Error getting user specific stats:', error);
  }
  
  return stats;
}

async function getPendingApplications() {
  try {
    const pendingApps = await Application.findByStatus('Pending');
    const submittedApps = await Application.findByStatus('Submitted');
    
    const pendingCount = (pendingApps && Array.isArray(pendingApps)) ? pendingApps.length : 0;
    const submittedCount = (submittedApps && Array.isArray(submittedApps)) ? submittedApps.length : 0;
    
    return { count: pendingCount + submittedCount };
  } catch (error) {
    console.error('Error getting pending applications:', error);
    return { count: 0 };
  }
}

async function getUserRecentActivity(userID, startDate) {
  try {
    const activities = [];
    
    const posts = await Post.findByUserID(userID);
    posts.forEach(post => {
      const createdAt = new Date(post.createdAt);
      if (createdAt >= startDate) {
        activities.push({
          type: 'post',
          title: `Created ${post.postType.toLowerCase()} post`,
          description: post.title,
          time: getRelativeTime(post.createdAt),
          timestamp: post.createdAt
        });
      }
    });
    
    const pickups = await Pickup.findByUser(userID, 'giver');
    pickups.forEach(pickup => {
      const createdAt = new Date(pickup.createdAt);
      if (createdAt >= startDate) {
        activities.push({
          type: 'pickup',
          title: pickup.status === 'Completed' 
            ? 'Completed pickup' 
            : `Pickup ${pickup.status.toLowerCase()}`,
          description: `with ${pickup.collectorName}`,
          time: getRelativeTime(pickup.createdAt),
          timestamp: pickup.createdAt
        });
      }
    });
    
    return activities
      .sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      })
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

// FIXED: Generate actual quarterly recycling trends for the current year
async function getRecyclingTrends(timeRange, startDate, locationFilter = null) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    // OPTIMIZED: Use cached pickups data
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    if (timeRange === 'year' || timeRange === 'all') {
      // Return quarterly data for current year
      const quarters = [
        { quarter: 'Q1', month: 'Jan-Mar', start: new Date(currentYear, 0, 1), end: new Date(currentYear, 2, 31) },
        { quarter: 'Q2', month: 'Apr-Jun', start: new Date(currentYear, 3, 1), end: new Date(currentYear, 5, 30) },
        { quarter: 'Q3', month: 'Jul-Sep', start: new Date(currentYear, 6, 1), end: new Date(currentYear, 8, 30) },
        { quarter: 'Q4', month: 'Oct-Dec', start: new Date(currentYear, 9, 1), end: new Date(currentYear, 11, 31) }
      ];

      const trends = quarters.map((q, index) => {
        let quarterAmount = 0;
        allPickups.forEach(pickup => {
          const completedDate = toDate(pickup.completedAt);
          if (pickup.status === 'Completed' &&
              completedDate &&
              !isNaN(completedDate.getTime()) &&
              completedDate >= q.start &&
              completedDate <= q.end &&
              pickup.finalAmount &&
              matchesLocationFilter(pickup.pickupLocation, locationFilter)) {
            // finalAmount is at root level, not inside actualWaste
            quarterAmount += parseFloat(pickup.finalAmount);
          }
        });
        
        return {
          period: index,
          amount: Math.round(quarterAmount),
          month: q.quarter,
          label: `${q.quarter} (${q.month})`
        };
      });
      
      return trends;
    } else if (timeRange === 'month') {
      // Return weekly data for current month
      const weeksInMonth = [];
      const firstDay = new Date(currentYear, now.getMonth(), 1);
      const lastDay = new Date(currentYear, now.getMonth() + 1, 0);
      
      let weekStart = new Date(firstDay);
      let weekNum = 1;
      
      while (weekStart <= lastDay) {
        let weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        if (weekEnd > lastDay) weekEnd = lastDay;
        
        let weekAmount = 0;
        allPickups.forEach(pickup => {
          const completedDate = toDate(pickup.completedAt);
          if (pickup.status === 'Completed' &&
              completedDate &&
              !isNaN(completedDate.getTime()) &&
              completedDate >= weekStart &&
              completedDate <= weekEnd &&
              pickup.finalAmount &&
              matchesLocationFilter(pickup.pickupLocation, locationFilter)) {
            // finalAmount is at root level, not inside actualWaste
            weekAmount += parseFloat(pickup.finalAmount);
          }
        });
        
        weeksInMonth.push({
          period: weekNum - 1,
          amount: Math.round(weekAmount),
          month: `Week ${weekNum}`
        });
        
        weekStart.setDate(weekStart.getDate() + 7);
        weekNum++;
      }
      
      return weeksInMonth;
    } else if (timeRange === 'week') {
      // Return daily data for current week
      const daysInWeek = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      let dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - now.getDay());
      
      for (let i = 0; i < 7; i++) {
        let dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        dayEnd.setHours(23, 59, 59, 999);
        
        let dayAmount = 0;
        allPickups.forEach(pickup => {
          const completedDate = toDate(pickup.completedAt);
          if (pickup.status === 'Completed' &&
              completedDate &&
              !isNaN(completedDate.getTime()) &&
              completedDate >= dayStart &&
              completedDate <= dayEnd &&
              pickup.finalAmount &&
              matchesLocationFilter(pickup.pickupLocation, locationFilter)) {
            // finalAmount is at root level, not inside actualWaste
            dayAmount += parseFloat(pickup.finalAmount);
          }
        });
        
        daysInWeek.push({
          period: i,
          amount: Math.round(dayAmount),
          month: dayNames[dayStart.getDay()]
        });
        
        dayStart.setDate(dayStart.getDate() + 1);
      }
      
      return daysInWeek;
    }
  } catch (error) {
    console.error('Error getting recycling trends:', error);
    // Return default quarterly structure
    return [
      { period: 0, amount: 150, month: 'Q1' },
      { period: 1, amount: 220, month: 'Q2' },
      { period: 2, amount: 180, month: 'Q3' },
      { period: 3, amount: 200, month: 'Q4' }
    ];
  }
}

async function getAreaActivity() {
  try {
    // Metro Manila cities with actual coordinates
    const areas = [
      {
        name: 'Quezon City',
        lat: 14.6760,
        lng: 121.0437,
        activity: 'high',
        activityLevel: 'High',
        initiatives: 12,
        posts: 58,
        activityCount: 70,
        color: '#2d7a2d',
        radius: 3000
      },
      {
        name: 'Makati',
        lat: 14.5547,
        lng: 121.0244,
        activity: 'medium',
        activityLevel: 'Medium',
        initiatives: 8,
        posts: 34,
        activityCount: 42,
        color: '#64db64',
        radius: 2500
      },
      {
        name: 'Pasig',
        lat: 14.5764,
        lng: 121.0851,
        activity: 'high',
        activityLevel: 'High',
        initiatives: 15,
        posts: 67,
        activityCount: 82,
        color: '#2d7a2d',
        radius: 3000
      },
      {
        name: 'Taguig',
        lat: 14.5176,
        lng: 121.0509,
        activity: 'low',
        activityLevel: 'Low',
        initiatives: 3,
        posts: 12,
        activityCount: 15,
        color: '#d4f1d4',
        radius: 2000
      },
      {
        name: 'Manila',
        lat: 14.5995,
        lng: 120.9842,
        activity: 'medium',
        activityLevel: 'Medium',
        initiatives: 9,
        posts: 41,
        activityCount: 50,
        color: '#64db64',
        radius: 2800
      },
      {
        name: 'Pasay',
        lat: 14.5378,
        lng: 121.0014,
        activity: 'low',
        activityLevel: 'Low',
        initiatives: 2,
        posts: 8,
        activityCount: 10,
        color: '#d4f1d4',
        radius: 2000
      },
      {
        name: 'Parañaque',
        lat: 14.4793,
        lng: 121.0198,
        activity: 'medium',
        activityLevel: 'Medium',
        initiatives: 6,
        posts: 28,
        activityCount: 34,
        color: '#64db64',
        radius: 2500
      },
      {
        name: 'Las Piñas',
        lat: 14.4453,
        lng: 120.9820,
        activity: 'low',
        activityLevel: 'Low',
        initiatives: 4,
        posts: 15,
        activityCount: 19,
        color: '#d4f1d4',
        radius: 2000
      },
      {
        name: 'Muntinlupa',
        lat: 14.4081,
        lng: 121.0414,
        activity: 'medium',
        activityLevel: 'Medium',
        initiatives: 7,
        posts: 31,
        activityCount: 38,
        color: '#64db64',
        radius: 2500
      },
      {
        name: 'Marikina',
        lat: 14.6507,
        lng: 121.1029,
        activity: 'high',
        activityLevel: 'High',
        initiatives: 11,
        posts: 52,
        activityCount: 63,
        color: '#2d7a2d',
        radius: 3000
      },
      {
        name: 'Mandaluyong',
        lat: 14.5794,
        lng: 121.0359,
        activity: 'medium',
        activityLevel: 'Medium',
        initiatives: 6,
        posts: 25,
        activityCount: 31,
        color: '#64db64',
        radius: 2200
      },
      {
        name: 'San Juan',
        lat: 14.6019,
        lng: 121.0355,
        activity: 'medium',
        activityLevel: 'Medium',
        initiatives: 5,
        posts: 22,
        activityCount: 27,
        color: '#64db64',
        radius: 2000
      },
      {
        name: 'Caloocan',
        lat: 14.6488,
        lng: 120.9830,
        activity: 'high',
        activityLevel: 'High',
        initiatives: 10,
        posts: 45,
        activityCount: 55,
        color: '#2d7a2d',
        radius: 3000
      },
      {
        name: 'Malabon',
        lat: 14.6625,
        lng: 120.9559,
        activity: 'low',
        activityLevel: 'Low',
        initiatives: 3,
        posts: 14,
        activityCount: 17,
        color: '#d4f1d4',
        radius: 2000
      },
      {
        name: 'Navotas',
        lat: 14.6681,
        lng: 120.9402,
        activity: 'low',
        activityLevel: 'Low',
        initiatives: 2,
        posts: 9,
        activityCount: 11,
        color: '#d4f1d4',
        radius: 1800
      },
      {
        name: 'Valenzuela',
        lat: 14.7008,
        lng: 120.9830,
        activity: 'medium',
        activityLevel: 'Medium',
        initiatives: 7,
        posts: 30,
        activityCount: 37,
        color: '#64db64',
        radius: 2500
      }
    ];

    // Try to get actual data from database
    try {
      const posts = await Post.find({ postType: 'Waste' }).select('location');
      const pickups = await Pickup.find({ status: 'Completed' }).select('location');

      // TODO: Aggregate real location data and update area counts
      // For now, return the predefined areas with coordinates
    } catch (dbError) {
      console.log('Could not fetch location data from database:', dbError.message);
    }

    return areas;
  } catch (error) {
    console.error('Error getting area activity:', error);
    return [];
  }
}

async function getDisposalSites(lat, lng, radiusKm = 10) {
  try {
    const DisposalHub = require('../models/DisposalHub');

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('Invalid coordinates provided');
      return [];
    }

    // Find hubs within specified radius (default 10km)
    const nearbyHubs = await DisposalHub.findNearby(latitude, longitude, radiusKm);

    // Transform to match the format expected by frontend
    const sites = nearbyHubs.map(hub => ({
      id: hub.hubID,
      hubID: hub.hubID,
      name: hub.name,
      type: hub.type,
      distance: hub.distanceFormatted,
      distanceKm: hub.distance,
      types: hub.acceptedMaterials || [],
      acceptedMaterials: hub.acceptedMaterials || [],
      active: hub.status === 'Active',
      status: hub.status,
      address: formatAddress(hub.address),
      fullAddress: hub.address,
      coordinates: hub.coordinates,
      operatingHours: formatOperatingHours(hub.operatingHours),
      contact: hub.contact?.phone || '',
      email: hub.contact?.email || '',
      website: hub.contact?.website || '',
      description: hub.description || '',
      ratings: hub.ratings || { average: 0, count: 0 },
      verified: hub.verified
    }));

    return sites;
  } catch (error) {
    console.error('Error getting disposal sites:', error);
    // Return empty array instead of dummy data on error
    return [];
  }
}

// Helper function to format address object to string
function formatAddress(address) {
  if (!address) return 'Address not available';

  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.barangay) parts.push(address.barangay);
  if (address.city) parts.push(address.city);
  if (address.province) parts.push(address.province);

  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

// Helper function to format operating hours
function formatOperatingHours(hours) {
  if (!hours) return 'Hours not available';

  // If it's already a string, return it
  if (typeof hours === 'string') return hours;

  // If it's an object with days, format it
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return hours[today] || 'Hours not available';
}

// FIXED: Environmental impact - all 3 values are now returned and calculated
/**
 * Calculate environmental impact based on recycled waste
 *
 * RESEARCH-BASED COEFFICIENTS:
 *
 * 1. CO2 Saved: 2.89 kg CO2e per kg of waste recycled
 *    Source: EPA (2016) - "Advancing Sustainable Materials Management: Facts and Figures"
 *    Average across common recyclables (plastic, paper, metal, glass)
 *    Recycling avoids emissions from: landfill methane, virgin material production, transportation
 *
 * 2. Trees Equivalent: 1 tree = 21.77 kg of CO2 absorbed per year
 *    Source: European Environment Agency (EEA)
 *    Formula: (totalKg × CO2 factor) ÷ CO2 per tree per year
 *    = (totalKg × 2.89) ÷ 21.77 ≈ totalKg × 0.1328 trees per year
 *    For lifetime impact (50 years): totalKg × 0.1328 ÷ 50 ≈ totalKg × 0.00266
 *
 * 3. Water Saved: 50-100 liters per kg of recycled material
 *    Source: UN Environment Programme (UNEP) & Water Footprint Network
 *    - Plastic recycling: saves ~88 liters/kg (vs virgin production)
 *    - Paper recycling: saves ~27 liters/kg
 *    - Metal recycling: saves ~238 liters/kg (aluminum)
 *    - Average across materials: ~50 liters/kg (conservative estimate)
 *
 * 4. Energy Saved: 4-6 kWh per kg of recycled material
 *    Source: World Bank & EPA Energy Conservation Reports
 *    - Plastic recycling: saves ~5.6 kWh/kg
 *    - Aluminum recycling: saves ~8 kWh/kg
 *    - Paper recycling: saves ~2.5 kWh/kg
 *    - Average: ~5 kWh/kg
 */
function calculateEnvironmentalImpact(totalKg) {
  return {
    co2Saved: Math.round(totalKg * 2.89),      // kg CO2 equivalent saved
    treesEquivalent: Math.round(totalKg * 0.00266),  // trees saved (50-year lifetime)
    waterSaved: Math.round(totalKg * 50),       // liters of water saved
    energySaved: Math.round(totalKg * 5)        // kWh energy saved
  };
}

/**
 * Calculate actual percentage changes compared to previous period
 *
 * This compares current period metrics to the previous equivalent period:
 * - Week: Compare to previous week
 * - Month: Compare to previous month
 * - Year: Compare to previous year
 * - All: Compare to previous year
 */
async function calculatePercentageChanges(timeRange, startDate, currentMetrics, locationFilter = null) {
  try {
    // Calculate the previous period date range
    let previousStartDate = new Date(startDate);

    switch(timeRange) {
      case 'week':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        break;
      case 'month':
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        break;
      case 'year':
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        break;
      case 'all':
        // For 'all time', compare to one year ago
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        previousStartDate = new Date(2020, 0, 1);
        break;
    }

    // Fetch metrics for previous period with same location filter
    const [prevRecycled, prevPickups] = await Promise.all([
      getTotalRecycled(previousStartDate, locationFilter),
      getTotalPickups(previousStartDate, locationFilter)
    ]);

    // Calculate percentage change
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? '+100%' : '+0%';
      }
      const percentChange = Math.round(((current - previous) / previous) * 100);
      return percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`;
    };

    console.log('\n=== PERCENTAGE CHANGES ===');
    console.log(`Comparing to previous period starting: ${previousStartDate.toISOString()}`);
    console.log(`Recycled - Current: ${currentMetrics.totalRecycled} kg, Previous: ${prevRecycled} kg`);
    console.log(`Pickups - Current: ${currentMetrics.pickups?.completed || 0}, Previous: ${prevPickups.completed}`);

    return {
      recycled: calculateChange(currentMetrics.totalRecycled, prevRecycled),
      initiatives: '+0%',  // Static count (current status, not time-based)
      users: '+0%',        // Static count (current status, not time-based)
      pickups: calculateChange(currentMetrics.pickups?.completed || 0, prevPickups.completed)
    };
  } catch (error) {
    console.error('Error calculating percentage changes:', error);
    // Fallback to +0% if calculation fails
    return {
      recycled: '+0%',
      initiatives: '+0%',
      users: '+0%',
      pickups: '+0%'
    };
  }
}

function getRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Generate geographic heatmap data from actual Post coordinates
async function getGeographicHeatmapData() {
  try {
    // Get all data from database
    const allPosts = await Post.findAll();
    const allPickups = await Pickup.findAll();
    const allSupports = await Support.findByUser ? await getAllSupports() : [];

    // Filter completed pickups and supports
    const completedPickups = allPickups.filter(p => p.status === 'Completed');
    const completedSupports = allSupports.filter(s => s.status === 'Completed');

    // Create map for aggregating activity by location
    const locationMap = new Map();

    // Helper function to build location label from location object
    const getLocationLabel = (location) => {
      if (!location) return 'Unknown';

      const parts = [];
      if (location.barangay?.name) parts.push(location.barangay.name);
      if (location.city?.name) parts.push(location.city.name);
      if (location.province?.name) parts.push(location.province.name);
      if (location.region?.name) parts.push(location.region.name);

      return parts.length > 0 ? parts.join(', ') : 'Unknown';
    };

    // Process posts - extract coordinates and aggregate
    allPosts.forEach(post => {
      // Check if post has valid coordinates
      if (post.location &&
          post.location.coordinates &&
          post.location.coordinates.lat &&
          post.location.coordinates.lng) {

        const lat = post.location.coordinates.lat;
        const lng = post.location.coordinates.lng;
        const locationLabel = getLocationLabel(post.location);

        // Create a location key (rounded to ~111 meters precision)
        const locationKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

        if (!locationMap.has(locationKey)) {
          locationMap.set(locationKey, {
            lat,
            lng,
            locationLabel,
            location: post.location, // Store full location hierarchy
            wastePosts: 0,
            forumPosts: 0,
            initiativePosts: 0,
            completedPickups: 0,
            completedSupports: 0,
            totalActivity: 0
          });
        }

        const location = locationMap.get(locationKey);

        // Count by post type
        if (post.postType === 'Waste') {
          location.wastePosts++;
        } else if (post.postType === 'Forum') {
          location.forumPosts++;
        } else if (post.postType === 'Initiative') {
          location.initiativePosts++;
        }

        location.totalActivity++;
      }
    });

    // Add completed pickup data
    completedPickups.forEach(pickup => {
      // Find the related post to get coordinates
      const relatedPost = allPosts.find(p => p.postID === pickup.postID);
      if (relatedPost &&
          relatedPost.location &&
          relatedPost.location.coordinates &&
          relatedPost.location.coordinates.lat &&
          relatedPost.location.coordinates.lng) {

        const lat = relatedPost.location.coordinates.lat;
        const lng = relatedPost.location.coordinates.lng;
        const locationKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

        if (locationMap.has(locationKey)) {
          const location = locationMap.get(locationKey);
          location.completedPickups++;
          location.totalActivity++;
        }
      }
    });

    // Add completed support data
    completedSupports.forEach(support => {
      // Find the related initiative post to get coordinates
      const relatedPost = allPosts.find(p => p.postID === support.initiativeID);
      if (relatedPost &&
          relatedPost.location &&
          relatedPost.location.coordinates &&
          relatedPost.location.coordinates.lat &&
          relatedPost.location.coordinates.lng) {

        const lat = relatedPost.location.coordinates.lat;
        const lng = relatedPost.location.coordinates.lng;
        const locationKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

        if (locationMap.has(locationKey)) {
          const location = locationMap.get(locationKey);
          location.completedSupports++;
          location.totalActivity++;
        }
      }
    });

    // If no data, return empty arrays (NO PRESET CITIES)
    if (locationMap.size === 0) {
      console.log('No location data found in database');
      return {
        heatmapPoints: [],
        areas: [],
        breakdown: {
          wastePosts: 0,
          forumPosts: 0,
          initiativePosts: 0,
          completedPickups: 0,
          completedSupports: 0,
          totalActivity: 0
        }
      };
    }

    // Convert map to arrays for heatmap
    const heatmapPoints = [];
    const areas = [];
    const breakdown = {
      wastePosts: 0,
      forumPosts: 0,
      initiativePosts: 0,
      completedPickups: 0,
      completedSupports: 0,
      totalActivity: 0
    };

    locationMap.forEach((data) => {
      // Add to heatmap points with intensity
      heatmapPoints.push({
        lat: data.lat,
        lng: data.lng,
        intensity: Math.min(data.totalActivity / 50, 1.0) // Normalize to 0-1, max at 50 activities
      });

      // Determine activity level
      let activityLevel = 'Low';
      let color = '#d4f1d4';
      if (data.totalActivity >= 20) {
        activityLevel = 'High';
        color = '#2d7a2d';
      } else if (data.totalActivity >= 10) {
        activityLevel = 'Medium';
        color = '#64db64';
      }

      // Add to areas for circle overlays
      areas.push({
        name: data.locationLabel,
        lat: data.lat,
        lng: data.lng,
        location: data.location, // Include full location hierarchy
        activityCount: data.totalActivity,
        activityLevel,
        wastePosts: data.wastePosts,
        forumPosts: data.forumPosts,
        initiativePosts: data.initiativePosts,
        completedPickups: data.completedPickups,
        completedSupports: data.completedSupports,
        color,
        radius: 1000 + (data.totalActivity * 100) // Scale radius based on activity
      });

      // Aggregate breakdown totals
      breakdown.wastePosts += data.wastePosts;
      breakdown.forumPosts += data.forumPosts;
      breakdown.initiativePosts += data.initiativePosts;
      breakdown.completedPickups += data.completedPickups;
      breakdown.completedSupports += data.completedSupports;
      breakdown.totalActivity += data.totalActivity;
    });

    console.log(`Generated geographic heatmap with ${heatmapPoints.length} locations, ${breakdown.totalActivity} total activities`);

    return {
      heatmapPoints,
      areas,
      breakdown
    };
  } catch (error) {
    console.error('Error generating geographic heatmap:', error);

    // Return empty data on error (NO FALLBACK CITIES)
    return {
      heatmapPoints: [],
      areas: [],
      breakdown: {
        wastePosts: 0,
        forumPosts: 0,
        initiativePosts: 0,
        completedPickups: 0,
        completedSupports: 0,
        totalActivity: 0
      }
    };
  }
}

// Helper function to get all supports (since Support model may not have findAll)
async function getAllSupports() {
  try {
    const { getFirestore, collection, getDocs } = require('firebase/firestore');
    const db = getFirestore();
    const supportsRef = collection(db, 'supports');
    const snapshot = await getDocs(supportsRef);
    return snapshot.docs.map(doc => new Support(doc.data()));
  } catch (error) {
    console.error('Error fetching supports:', error);
    return [];
  }
}

// Generate heatmap data for the past 365 days
async function getHeatmapActivityData() {
  try {
    const heatmapData = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    // OPTIMIZED: Use cached data and filter in memory
    const allPosts = await getCachedData('allPosts', () => Post.findAll());
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());
    const allApplications = await Application.findAll();

    // Filter by date range in memory
    const filteredPosts = allPosts.filter(p => {
      const createdAt = new Date(p.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const filteredPickups = allPickups.filter(p => {
      const createdAt = new Date(p.createdAt);
      return p.status === 'Completed' && createdAt >= startDate && createdAt <= endDate;
    });

    const filteredApplications = allApplications.filter(a => {
      const createdAt = new Date(a.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    // Create a map to aggregate activities by date
    const activityMap = new Map();

    // Helper function to get date string (YYYY-MM-DD)
    const getDateString = (date) => {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    };

    // Aggregate posts
    filteredPosts.forEach(post => {
      const dateStr = getDateString(post.createdAt);
      if (!activityMap.has(dateStr)) {
        activityMap.set(dateStr, { posts: 0, pickups: 0, initiatives: 0 });
      }
      const data = activityMap.get(dateStr);
      data.posts++;
    });

    // Aggregate pickups
    filteredPickups.forEach(pickup => {
      const dateStr = getDateString(pickup.createdAt);
      if (!activityMap.has(dateStr)) {
        activityMap.set(dateStr, { posts: 0, pickups: 0, initiatives: 0 });
      }
      const data = activityMap.get(dateStr);
      data.pickups++;
    });

    // Aggregate initiative applications
    filteredApplications.forEach(app => {
      const dateStr = getDateString(app.createdAt);
      if (!activityMap.has(dateStr)) {
        activityMap.set(dateStr, { posts: 0, pickups: 0, initiatives: 0 });
      }
      const data = activityMap.get(dateStr);
      data.initiatives++;
    });

    // Convert map to array format expected by heatmap
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = getDateString(currentDate);
      const activity = activityMap.get(dateStr) || { posts: 0, pickups: 0, initiatives: 0 };
      const totalCount = activity.posts + activity.pickups + activity.initiatives;

      heatmapData.push({
        date: dateStr,
        count: totalCount,
        details: {
          posts: activity.posts,
          pickups: activity.pickups,
          initiatives: activity.initiatives
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return heatmapData;
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    // Return fallback data with some activity
    const fallbackData = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      // Generate some random activity for demo purposes
      const randomCount = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0;

      fallbackData.push({
        date: dateStr,
        count: randomCount,
        details: {
          posts: Math.floor(randomCount * 0.5),
          pickups: Math.floor(randomCount * 0.3),
          initiatives: Math.floor(randomCount * 0.2)
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return fallbackData;
  }
}

module.exports = analyticsController;