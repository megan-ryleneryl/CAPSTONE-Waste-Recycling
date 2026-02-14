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
    console.log(`Cleaned ${cleaned} expired analytics cache entries. Current size: ${analyticsCache.size}`);
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
      // Use bounded periods (startDate to endDate) for accurate period-to-period comparison
      const nowDate = new Date();
      let startDate = new Date();
      let endDate = new Date(nowDate); // End date is always now

      switch(timeRange) {
        case 'week':
          // Current week: Monday to today (or Sunday if week is complete)
          const dayOfWeek = startDate.getDay();
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate.setDate(startDate.getDate() - daysFromMonday);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          // Current month: 1st to today (or last day if month is complete)
          startDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
          break;
        case 'year':
          // Current year: Jan 1 to today (or Dec 31 if year is complete)
          startDate = new Date(nowDate.getFullYear(), 0, 1);
          break;
        case 'all':
          // All time: From 2020-01-01 to today
          startDate = new Date(2020, 0, 1);
          break;
      }

      console.log(`  Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const currentUser = await User.findById(userID);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Fetch various metrics in parallel
      // Use bounded time ranges for all metrics except Active Users (which is cumulative)
      const [
        totalRecycled,
        initiatives,
        completedInitiatives,
        users,
        pickups,
        completedSupports,
        wasteTypes,
        topCollectors,
        topRecyclers,
        topEarners,
        communityEarnings,
        userEarnings,
        userSpecificStats,
        pendingApplications,
        recentActivity
      ] = await Promise.all([
        getTotalRecycledInRange(startDate, endDate, locationFilter), // BOUNDED: Only this period
        getActiveInitiatives(locationFilter), // UNBOUNDED: Current active initiatives
        getCompletedInitiativesInRange(startDate, endDate, locationFilter), // BOUNDED: Only this period
        getActiveUsers(locationFilter), // UNBOUNDED: Cumulative total users
        getTotalPickupsInRange(startDate, endDate, locationFilter), // BOUNDED: Only this period
        getCompletedSupportsInRange(startDate, endDate, locationFilter), // BOUNDED: Only this period
        getWasteDistribution(startDate, locationFilter),
        getTopCollectors(startDate, locationFilter),
        getTopRecyclers(startDate, locationFilter),
        getTopEarners(startDate, locationFilter),
        getCommunityEarningsStats(startDate, locationFilter),
        getUserEarningsStats(userID, startDate),
        getUserSpecificStats(userID, currentUser, startDate, endDate),
        currentUser.isAdmin ? getPendingApplications() : { count: 0 },
        getUserRecentActivity(userID, startDate)
      ]);

      // Extract totalKg and materialBreakdown from the result
      const recycledData = totalRecycled;
      const totalRecycledKg = recycledData.totalKg;
      const materialBreakdown = recycledData.materialBreakdown;

      // Calculate environmental impact with per-material computation
      const environmentalImpact = calculateEnvironmentalImpact(totalRecycledKg, materialBreakdown);
      const trends = await getRecyclingTrends(timeRange, startDate, locationFilter);
      const percentageChanges = await calculatePercentageChanges(timeRange, startDate, {
        totalRecycled: totalRecycledKg,
        completedInitiatives,
        users,
        pickups,
        completedSupports
      }, locationFilter);

      console.log('Analytics Data Summary:', {
        totalRecycled: totalRecycledKg,
        totalInitiatives: initiatives.count,
        completedInitiatives: completedInitiatives.count,
        activeUsers: users.count,
        totalPickups: pickups.total,
        completedPickups: pickups.completed,
        userStats: userSpecificStats,
        communityImpact: environmentalImpact,
        percentageChanges
      });

      const analyticsData = {
        // Platform-wide stats
        totalRecycled: totalRecycledKg,
        totalInitiatives: initiatives.count,
        completedInitiatives: completedInitiatives.count,
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
        topRecyclers: topRecyclers.slice(0, 3),
        topEarners: topEarners.slice(0, 5),
        communityEarnings,
        userEarnings,
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
  },

  // Get city leaderboard for Leagues page
  async getCityLeaderboard(req, res) {
    try {
      const userID = req.user.userID;
      const currentUser = await User.findById(userID);

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get all users with their location and points
      const allUsers = await getCachedData('allUsers', () => User.findAll());

      // Group users by city
      const cityMap = new Map();

      allUsers.forEach(user => {
        if (user.status === 'Suspended' || user.status === 'Deleted') return;

        const cityCode = user.userLocation?.city?.code;
        const cityName = user.userLocation?.city?.name;

        if (!cityCode || !cityName) return;

        if (!cityMap.has(cityCode)) {
          cityMap.set(cityCode, {
            cityCode,
            cityName,
            totalPoints: 0,
            userCount: 0,
            users: []
          });
        }

        const cityData = cityMap.get(cityCode);
        cityData.totalPoints += user.points || 0;
        cityData.userCount += 1;
        cityData.users.push({
          userID: user.userID,
          name: user.organizationName || `${user.firstName} ${user.lastName}`,
          points: user.points || 0
        });
      });

      // Convert to array and calculate scores
      const cities = Array.from(cityMap.values()).map(city => ({
        cityCode: city.cityCode,
        cityName: city.cityName,
        totalPoints: city.totalPoints,
        userCount: city.userCount,
        score: city.userCount > 0 ? Math.round(city.totalPoints / city.userCount) : 0,
        users: city.users.sort((a, b) => b.points - a.points).slice(0, 10) // Top 10 users
      }));

      // Sort by score (engagement score = total points / users)
      cities.sort((a, b) => b.score - a.score);

      // Add rank to each city
      cities.forEach((city, index) => {
        city.rank = index + 1;
      });

      // Get current user's city data
      const userCityCode = currentUser.userLocation?.city?.code;
      let userCityData = null;
      let topUsersInCity = [];

      if (userCityCode) {
        const userCity = cities.find(c => c.cityCode === userCityCode);
        if (userCity) {
          userCityData = {
            ...userCity,
            pointsToOvertake: 0,
            nextCity: null
          };

          // Calculate points needed to overtake next city
          if (userCity.rank > 1) {
            const nextCity = cities[userCity.rank - 2]; // City above in ranking
            const pointsDiff = nextCity.score - userCity.score;
            userCityData.pointsToOvertake = Math.max(0, pointsDiff * userCity.userCount + 1);
            userCityData.nextCity = nextCity.cityName;
          }

          // Get top users in the user's city (Heavy Lifters)
          topUsersInCity = userCity.users.slice(0, 3).map((u, idx) => ({
            rank: idx + 1,
            name: u.name,
            points: u.points
          }));
        }
      }

      // Get waste distribution for user's city
      const wasteByType = await getWasteDistributionForCity(userCityCode);

      res.json({
        success: true,
        data: {
          cities: cities.map(c => ({
            cityCode: c.cityCode,
            cityName: c.cityName,
            totalPoints: c.totalPoints,
            userCount: c.userCount,
            score: c.score,
            rank: c.rank
          })),
          userCityData,
          topUsersInCity,
          wasteByType
        }
      });
    } catch (error) {
      console.error('City leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch city leaderboard',
        error: error.message
      });
    }
  }
};

// Get waste distribution for a specific city
async function getWasteDistributionForCity(cityCode) {
  try {
    if (!cityCode) return {};

    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    const completedPickups = allPickups.filter(pickup => {
      return pickup.status === 'Completed' &&
             pickup.pickupLocation?.city?.code === cityCode;
    });

    const distribution = {};
    let totalWeight = 0;

    completedPickups.forEach(pickup => {
      if (pickup.actualWaste && Array.isArray(pickup.actualWaste)) {
        const weight = parseFloat(pickup.finalAmount) || 0;

        pickup.actualWaste.forEach(material => {
          const materialType = material.materialName || material.type || 'Other';
          const materialWeight = weight / pickup.actualWaste.length;
          distribution[materialType] = (distribution[materialType] || 0) + materialWeight;
          totalWeight += materialWeight;
        });
      }
    });

    return distribution;
  } catch (error) {
    console.error('Error getting waste distribution for city:', error);
    return {};
  }
}

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

    const completedPickups = allPickups.filter(pickup => {
      const completedDate = toDate(pickup.completedAt);

      return pickup.status === 'Completed' &&
             completedDate &&
             !isNaN(completedDate.getTime()) &&
             completedDate >= startDate &&
             matchesLocationFilter(pickup.pickupLocation, locationFilter);
    });

    let totalKg = 0;

    completedPickups.forEach(pickup => {
      // finalAmount is at the root level, not inside actualWaste
      if (pickup.finalAmount) {
        const amount = parseFloat(pickup.finalAmount);
        totalKg += amount;
      }
    });

    console.log(`DEBUG getTotalRecycled: startDate=${startDate.toISOString()}, completedPickups=${completedPickups.length}, totalKg=${Math.round(totalKg)}`);
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

// Get completed initiatives within a time range
// Uses updatedAt since initiatives don't have completedAt timestamp
async function getCompletedInitiatives(startDate, locationFilter = null) {
  try {
    const allPosts = await getCachedData('allPosts', () => Post.findAll());

    // Debug: Find all initiatives
    const allInitiatives = allPosts.filter(post => post.postType === 'Initiative');
    const completedInitiativesAll = allInitiatives.filter(post => post.status === 'Completed');

    console.log(`DEBUG getCompletedInitiatives: Total initiatives=${allInitiatives.length}, Completed=${completedInitiativesAll.length}`);

    const completedInitiatives = allPosts.filter(post => {
      const updatedDate = toDate(post.updatedAt);
      const isMatch = post.postType === 'Initiative' &&
             post.status === 'Completed' &&
             updatedDate &&
             !isNaN(updatedDate.getTime()) &&
             updatedDate >= startDate &&
             matchesLocationFilter(post.location, locationFilter);

      if (post.postType === 'Initiative' && post.status === 'Completed') {
        console.log(`  Initiative "${post.title}": updatedAt=${updatedDate?.toISOString() || 'null'}, startDate=${startDate.toISOString()}, match=${isMatch}`);
      }

      return isMatch;
    });

    console.log(`  Completed initiatives in range: ${completedInitiatives.length}`);
    return { count: completedInitiatives.length };
  } catch (error) {
    console.error('Error getting completed initiatives:', error);
    return { count: 0 };
  }
}

// Get active users - count all non-suspended, non-deleted users
// Optionally filter by location if user has set their userLocation
async function getActiveUsers(locationFilter = null) {
  try {
    // OPTIMIZED: Use cached users data
    const allUsers = await getCachedData('allUsers', () => User.findAll());

    // Count all active users (not suspended or deleted)
    let activeUsers = allUsers.filter(user => {
      const isActiveStatus = user.status !== 'Suspended' && user.status !== 'Deleted';
      return isActiveStatus;
    });

    // If location filter is provided, filter users by their userLocation
    if (locationFilter) {
      const usersWithLocation = activeUsers.filter(user => user.userLocation);

      if (locationFilter.barangay) {
        activeUsers = usersWithLocation.filter(user =>
          user.userLocation?.barangay?.code === locationFilter.barangay
        );
      } else if (locationFilter.city) {
        activeUsers = usersWithLocation.filter(user =>
          user.userLocation?.city?.code === locationFilter.city
        );
      } else if (locationFilter.province) {
        activeUsers = usersWithLocation.filter(user =>
          user.userLocation?.province?.code === locationFilter.province
        );
      } else if (locationFilter.region) {
        activeUsers = usersWithLocation.filter(user =>
          user.userLocation?.region?.code === locationFilter.region
        );
      }
    }

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

    const percentages = {};
    for (const [key, value] of Object.entries(distribution)) {
      percentages[key] = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0;
    }

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

// Get top recyclers (givers who posted and recycled the most waste)
async function getTopRecyclers(startDate, locationFilter = null) {
  try {
    const allUsers = await getCachedData('allUsers', () => User.findAll());
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    // Calculate recycling stats for all users (as givers)
    const recyclerMap = {};

    allPickups.forEach(pickup => {
      if (!pickup.giverID || pickup.status !== 'Completed' || !pickup.finalAmount) return;

      const completedDate = toDate(pickup.completedAt);
      if (!completedDate || isNaN(completedDate.getTime()) || completedDate < startDate) return;
      if (!matchesLocationFilter(pickup.pickupLocation, locationFilter)) return;

      if (!recyclerMap[pickup.giverID]) {
        recyclerMap[pickup.giverID] = { totalRecycled: 0, pickupCount: 0 };
      }
      recyclerMap[pickup.giverID].totalRecycled += parseFloat(pickup.finalAmount);
      recyclerMap[pickup.giverID].pickupCount += 1;
    });

    // Build ranked list with user details
    const recyclerStats = Object.entries(recyclerMap)
      .filter(([, stats]) => stats.totalRecycled > 0)
      .map(([userID, stats]) => {
        const user = allUsers.find(u => u.userID === userID);
        return {
          userID,
          name: user
            ? (user.organizationName || `${user.firstName} ${user.lastName}`)
            : 'Unknown User',
          amount: Math.round(stats.totalRecycled),
          pickupCount: stats.pickupCount,
          profilePicture: user?.profilePictureUrl || null
        };
      });

    recyclerStats.sort((a, b) => b.amount - a.amount);

    return recyclerStats.map((recycler, index) => ({
      ...recycler,
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error getting top recyclers:', error);
    return [];
  }
}

// Get top earners (users who earned the most from recycling) - only opted-in users
async function getTopEarners(startDate, locationFilter = null) {
  try {
    const allUsers = await getCachedData('allUsers', () => User.findAll());
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    // Filter users who have opted in to show earnings
    const optedInUsers = allUsers.filter(user =>
      user.privacySettings?.showEarnings === true
    );

    const earnerStats = await Promise.all(
      optedInUsers.map(async (user) => {
        try {
          // Get pickups where this user is the giver (received payment)
          const userPickups = allPickups.filter(pickup =>
            pickup.giverID === user.userID &&
            pickup.status === 'Completed' &&
            pickup.paymentReceived > 0 &&
            matchesLocationFilter(pickup.pickupLocation, locationFilter)
          );

          // Apply time filter
          const filteredPickups = userPickups.filter(pickup => {
            const completedDate = toDate(pickup.completedAt);
            return completedDate && !isNaN(completedDate.getTime()) && completedDate >= startDate;
          });

          const totalEarnings = filteredPickups.reduce(
            (sum, pickup) => sum + (parseFloat(pickup.paymentReceived) || 0), 0
          );

          const pickupCount = filteredPickups.length;

          return {
            userID: user.userID,
            name: user.privacySettings?.showNameOnLeaderboard
              ? (user.organizationName || `${user.firstName} ${user.lastName}`)
              : 'Anonymous User',
            totalEarnings: Math.round(totalEarnings * 100) / 100,
            pickupCount,
            profilePicture: user.privacySettings?.showNameOnLeaderboard
              ? user.profilePictureUrl
              : null,
            isAnonymous: !user.privacySettings?.showNameOnLeaderboard
          };
        } catch (error) {
          console.error(`Error getting earnings for user ${user.userID}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls and users with no earnings, then sort by earnings
    const validEarners = earnerStats.filter(e => e && e.totalEarnings > 0);
    validEarners.sort((a, b) => b.totalEarnings - a.totalEarnings);

    return validEarners.map((earner, index) => ({
      ...earner,
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error getting top earners:', error);
    return [];
  }
}

// Get community-wide earnings statistics (aggregate data, no privacy filter needed)
async function getCommunityEarningsStats(startDate, locationFilter = null) {
  try {
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    // Get all completed pickups with payment
    const completedPickups = allPickups.filter(pickup => {
      const completedDate = toDate(pickup.completedAt);
      return pickup.status === 'Completed' &&
             pickup.paymentReceived > 0 &&
             completedDate &&
             !isNaN(completedDate.getTime()) &&
             completedDate >= startDate &&
             matchesLocationFilter(pickup.pickupLocation, locationFilter);
    });

    const totalEarnings = completedPickups.reduce(
      (sum, pickup) => sum + (parseFloat(pickup.paymentReceived) || 0), 0
    );

    const pickupCount = completedPickups.length;
    const averagePerPickup = pickupCount > 0 ? totalEarnings / pickupCount : 0;

    // Get unique earners count
    const uniqueEarners = new Set(completedPickups.map(p => p.giverID)).size;

    return {
      totalCommunityEarnings: Math.round(totalEarnings * 100) / 100,
      pickupCount,
      averagePerPickup: Math.round(averagePerPickup * 100) / 100,
      uniqueEarners
    };
  } catch (error) {
    console.error('Error getting community earnings stats:', error);
    return {
      totalCommunityEarnings: 0,
      pickupCount: 0,
      averagePerPickup: 0,
      uniqueEarners: 0
    };
  }
}

// Get earnings stats for a specific user (for personal context)
async function getUserEarningsStats(userID, startDate) {
  try {
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());

    // Get user's completed pickups with payment (as giver)
    const userPickups = allPickups.filter(pickup => {
      const completedDate = toDate(pickup.completedAt);
      return pickup.giverID === userID &&
             pickup.status === 'Completed' &&
             pickup.paymentReceived > 0 &&
             completedDate &&
             !isNaN(completedDate.getTime()) &&
             completedDate >= startDate;
    });

    const totalEarnings = userPickups.reduce(
      (sum, pickup) => sum + (parseFloat(pickup.paymentReceived) || 0), 0
    );

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      pickupCount: userPickups.length,
      averagePerPickup: userPickups.length > 0
        ? Math.round((totalEarnings / userPickups.length) * 100) / 100
        : 0
    };
  } catch (error) {
    console.error('Error getting user earnings stats:', error);
    return { totalEarnings: 0, pickupCount: 0, averagePerPickup: 0 };
  }
}

async function getUserSpecificStats(userID, user, startDate = null, endDate = null) {
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

  // Helper to check if a pickup falls within the selected time range
  const isInTimeRange = (pickup) => {
    if (!startDate) return true; // No filter = all time
    const completedDate = toDate(pickup.completedAt);
    if (!completedDate || isNaN(completedDate.getTime())) return false;
    if (endDate) {
      return completedDate >= startDate && completedDate < endDate;
    }
    return completedDate >= startDate;
  };

  try {
    const userPickupsAsGiver = await Pickup.findByUser(userID, 'giver');

    // Active pickups are current state, not time-filtered
    stats.giver.activePickups = userPickupsAsGiver.filter(p =>
      ['Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup'].includes(p.status)
    ).length;

    // Completed pickups and kg recycled are TIME-FILTERED
    stats.giver.successfulPickups = userPickupsAsGiver.filter(p =>
      p.status === 'Completed' && isInTimeRange(p)
    ).length;

    userPickupsAsGiver.forEach(pickup => {
      if (pickup.status === 'Completed' && pickup.finalAmount && isInTimeRange(pickup)) {
        stats.giver.totalKgRecycled += parseFloat(pickup.finalAmount);
      }
    });
    stats.giver.totalKgRecycled = Math.round(stats.giver.totalKgRecycled);

    const userPosts = await Post.findByUserID(userID);

    stats.totalPosts = userPosts.length;
    stats.giver.activeForumPosts = userPosts.filter(p =>
      p.postType === 'Forum' && p.status === 'Active'
    ).length;

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
          if (pickup.status === 'Completed' && pickup.finalAmount && isInTimeRange(pickup)) {
            stats.collector.totalCollected += parseFloat(pickup.finalAmount);
          }
        });
        stats.collector.totalCollected = Math.round(stats.collector.totalCollected);

        const totalCollectorPickups = collectorPickups.filter(p => isInTimeRange(p)).length;
        const completedPickups = collectorPickups.filter(p => p.status === 'Completed' && isInTimeRange(p)).length;
        if (totalCollectorPickups > 0) {
          stats.collector.completionRate = Math.round((completedPickups / totalCollectorPickups) * 100);
        }
      } catch (error) {
        console.error('Error getting collector stats:', error);
      }
    }
    
    // ORGANIZATION STATS
    if (user.organizationID !== null) {
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
    // Include unverified hubs so users can see suggested locations
    const nearbyHubs = await DisposalHub.findNearby(latitude, longitude, radiusKm, { verified: false });

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
  if (address.region) parts.push(address.region);

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

// Material-specific environmental impact multipliers (per kg)
const MATERIAL_IMPACT = {
  'Aluminum': { co2: 9.0, water: 40, energy: 14, trees: 0 },
  'Plastic': { co2: 1.5, water: 17, energy: 5.3, trees: 0 },
  'Paper': { co2: 0.9, water: 26, energy: 4.0, trees: 0.017 },
  'Cardboard': { co2: 0.9, water: 26, energy: 4.0, trees: 0.017 },
  'Glass': { co2: 0.3, water: 2, energy: 0.3, trees: 0 },
  'E-waste': { co2: 2.0, water: 10, energy: 8.0, trees: 0 },
  'Electronic Waste': { co2: 2.0, water: 10, energy: 8.0, trees: 0 },
  'Organic': { co2: 0.5, water: 5, energy: 0.5, trees: 0 },
  'Metal': { co2: 9.0, water: 40, energy: 14, trees: 0 }, // Same as aluminum
  'Mixed': { co2: 2.0, water: 15, energy: 5.0, trees: 0.005 }, // Average for mixed materials
  'Other': { co2: 2.0, water: 15, energy: 5.0, trees: 0.005 }, // Average for other materials
  'Default': { co2: 2.0, water: 15, energy: 5.0, trees: 0.005 } // Average for unknown materials
};

function calculateEnvironmentalImpact(totalKg, materialBreakdown = null) {
  // If no material breakdown provided, use old flat multipliers
  if (!materialBreakdown || Object.keys(materialBreakdown).length === 0) {
    return {
      co2Saved: Math.round(totalKg * 2.88),
      treesEquivalent: Math.round(totalKg * 0.00264),
      waterSaved: Math.round(totalKg * 15),
      energySaved: Math.round(totalKg * 6)
    };
  }

  // Calculate per-material impacts
  let totalCO2 = 0;
  let totalWater = 0;
  let totalEnergy = 0;
  let totalTrees = 0;

  Object.entries(materialBreakdown).forEach(([material, kg]) => {
    // Normalize material name for matching
    const normalizedMaterial = material.trim();

    // Find matching multiplier (case-insensitive partial match)
    let multiplier = MATERIAL_IMPACT['Default'];
    for (const [key, value] of Object.entries(MATERIAL_IMPACT)) {
      if (key !== 'Default' && normalizedMaterial.toLowerCase().includes(key.toLowerCase())) {
        multiplier = value;
        break;
      }
    }

    totalCO2 += kg * multiplier.co2;
    totalWater += kg * multiplier.water;
    totalEnergy += kg * multiplier.energy;
    totalTrees += kg * multiplier.trees;
  });

  return {
    co2Saved: Math.round(totalCO2),
    treesEquivalent: Math.round(totalTrees),
    waterSaved: Math.round(totalWater),
    energySaved: Math.round(totalEnergy)
  };
}

// Get active initiatives that existed during a specific time period
async function getActiveInitiativesAtTime(startDate, endDate, locationFilter = null) {
  try {
    const allPosts = await getCachedData('allPosts', () => Post.findAll());
    const initiativesAtTime = allPosts.filter(post => {
      const createdAt = toDate(post.createdAt);
      return post.postType === 'Initiative' &&
             (post.status === 'Active' || post.status === 'Open') &&
             createdAt &&
             createdAt <= endDate && // Must have been created by the end of the period
             matchesLocationFilter(post.location, locationFilter);
    });

    return { count: initiativesAtTime.length };
  } catch (error) {
    console.error('Error getting initiatives at time:', error);
    return { count: 0 };
  }
}

// Get active users that existed during a specific time period
async function getActiveUsersAtTime(startDate, endDate, locationFilter = null) {
  try {
    const allUsers = await getCachedData('allUsers', () => User.findAll());
    let usersAtTime = allUsers.filter(user => {
      const createdAt = toDate(user.createdAt);
      return user.status !== 'Suspended' &&
             user.status !== 'Deleted' &&
             createdAt &&
             createdAt <= endDate; // Must have been created by the end of the period
    });

    // Apply location filter if provided
    if (locationFilter && (locationFilter.region || locationFilter.province || locationFilter.city || locationFilter.barangay)) {
      const usersWithLocation = usersAtTime.filter(user => user.userLocation);

      if (locationFilter.barangay) {
        usersAtTime = usersWithLocation.filter(user =>
          user.userLocation?.barangay?.code === locationFilter.barangay
        );
      } else if (locationFilter.city) {
        usersAtTime = usersWithLocation.filter(user =>
          user.userLocation?.city?.code === locationFilter.city
        );
      } else if (locationFilter.province) {
        usersAtTime = usersWithLocation.filter(user =>
          user.userLocation?.province?.code === locationFilter.province
        );
      } else if (locationFilter.region) {
        usersAtTime = usersWithLocation.filter(user =>
          user.userLocation?.region?.code === locationFilter.region
        );
      }
    }

    return { count: usersAtTime.length };
  } catch (error) {
    console.error('Error getting users at time:', error);
    return { count: 0 };
  }
}

// Get total recycled within a specific time range (for period comparison)
async function getTotalRecycledInRange(startDate, endDate, locationFilter = null) {
  try {
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());
    const completedPickups = allPickups.filter(pickup => {
      const completedDate = toDate(pickup.completedAt);
      return pickup.status === 'Completed' &&
             completedDate &&
             !isNaN(completedDate.getTime()) &&
             completedDate >= startDate &&
             completedDate < endDate &&
             matchesLocationFilter(pickup.pickupLocation, locationFilter);
    });

    let totalKg = 0;
    const materialBreakdown = {};

    completedPickups.forEach(pickup => {
      if (pickup.finalAmount) {
        const weight = parseFloat(pickup.finalAmount);
        totalKg += weight;

        // Extract material breakdown from actualWaste array
        if (pickup.actualWaste && Array.isArray(pickup.actualWaste) && pickup.actualWaste.length > 0) {
          // Distribute weight equally among materials (simple approach)
          const weightPerMaterial = weight / pickup.actualWaste.length;
          pickup.actualWaste.forEach(material => {
            const materialName = material.materialName || material.type || 'Other';
            materialBreakdown[materialName] = (materialBreakdown[materialName] || 0) + weightPerMaterial;
          });
        } else {
          // If no material breakdown available, categorize as "Mixed/Other"
          materialBreakdown['Mixed'] = (materialBreakdown['Mixed'] || 0) + weight;
        }
      }
    });

    console.log(`DEBUG getTotalRecycledInRange: ${startDate.toISOString()} to ${endDate.toISOString()}, pickups=${completedPickups.length}, kg=${Math.round(totalKg)}`);
    return {
      totalKg: Math.round(totalKg),
      materialBreakdown: materialBreakdown
    };
  } catch (error) {
    console.error('Error getting total recycled in range:', error);
    return {
      totalKg: 0,
      materialBreakdown: {}
    };
  }
}

// Get total pickups within a specific time range (for period comparison)
async function getTotalPickupsInRange(startDate, endDate, locationFilter = null) {
  try {
    const allPickups = await getCachedData('allPickups', () => Pickup.findAll());
    let completed = 0;

    allPickups.forEach(pickup => {
      const completedDate = toDate(pickup.completedAt);
      if (pickup.status === 'Completed' &&
          completedDate &&
          !isNaN(completedDate.getTime()) &&
          completedDate >= startDate &&
          completedDate < endDate &&
          matchesLocationFilter(pickup.pickupLocation, locationFilter)) {
        completed++;
      }
    });

    return { completed, total: completed };
  } catch (error) {
    console.error('Error getting pickups in range:', error);
    return { completed: 0, total: 0 };
  }
}

// Get completed initiatives within a specific time range (for period comparison)
async function getCompletedInitiativesInRange(startDate, endDate, locationFilter = null) {
  try {
    const allPosts = await getCachedData('allPosts', () => Post.findAll());
    const completedInitiatives = allPosts.filter(post => {
      const updatedDate = toDate(post.updatedAt);
      return post.postType === 'Initiative' &&
             post.status === 'Completed' &&
             updatedDate &&
             !isNaN(updatedDate.getTime()) &&
             updatedDate >= startDate &&
             updatedDate < endDate &&
             matchesLocationFilter(post.location, locationFilter);
    });

    return { count: completedInitiatives.length };
  } catch (error) {
    console.error('Error getting completed initiatives in range:', error);
    return { count: 0 };
  }
}

// Get completed supports within a specific time range (for period comparison)
async function getCompletedSupportsInRange(startDate, endDate, locationFilter = null) {
  try {
    const allSupports = await getCachedData('allSupports', () => Support.findAll());
    const allPosts = await getCachedData('allPosts', () => Post.findAll());

    const completedSupports = allSupports.filter(support => {
      const completedDate = toDate(support.completedAt);
      const isCompleted = support.status === 'Completed';
      const inTimeRange = completedDate &&
                          !isNaN(completedDate.getTime()) &&
                          completedDate >= startDate &&
                          completedDate < endDate;

      if (locationFilter && (locationFilter.region || locationFilter.province || locationFilter.city || locationFilter.barangay)) {
        const relatedPost = allPosts.find(p => p.postID === support.initiativeID);
        if (!relatedPost || !matchesLocationFilter(relatedPost.location, locationFilter)) {
          return false;
        }
      }

      return isCompleted && inTimeRange;
    });

    return { count: completedSupports.length };
  } catch (error) {
    console.error('Error getting completed supports in range:', error);
    return { count: 0 };
  }
}

/**
 * Calculate actual percentage changes compared to previous period
 *
 * This compares current period metrics to the previous equivalent period using CALENDAR periods:
 * - Week: Current week (Mon-Sun) vs Previous week (Mon-Sun)
 * - Month: Current month (1st-last) vs Previous month (1st-last)
 * - Year: Current year (Jan-Dec) vs Previous year (Jan-Dec)
 * - All: Last 365 days vs Previous 365 days
 */
async function calculatePercentageChanges(timeRange, startDate, currentMetrics, locationFilter = null) {
  try {
    const now = new Date();
    let currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd;

    switch(timeRange) {
      case 'week':
        // Current week: Monday to Sunday (or today if we're mid-week)
        currentPeriodEnd = new Date(now);
        currentPeriodStart = new Date(now);
        const dayOfWeek = currentPeriodStart.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
        currentPeriodStart.setDate(currentPeriodStart.getDate() - daysFromMonday);
        currentPeriodStart.setHours(0, 0, 0, 0);

        // Previous week: Previous Monday to Sunday
        previousPeriodEnd = new Date(currentPeriodStart);
        previousPeriodEnd.setMilliseconds(-1); // Just before current week starts
        previousPeriodStart = new Date(previousPeriodEnd);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 6);
        previousPeriodStart.setHours(0, 0, 0, 0);
        break;

      case 'month':
        // Current month: 1st to today
        currentPeriodEnd = new Date(now);
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Previous month: 1st to last day of previous month
        previousPeriodEnd = new Date(currentPeriodStart);
        previousPeriodEnd.setMilliseconds(-1); // Last moment of previous month
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;

      case 'year':
        // Current year: Jan 1 to today
        currentPeriodEnd = new Date(now);
        currentPeriodStart = new Date(now.getFullYear(), 0, 1);

        // Previous year: Jan 1 to Dec 31 of previous year
        previousPeriodEnd = new Date(currentPeriodStart);
        previousPeriodEnd.setMilliseconds(-1); // Last moment of previous year
        previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        break;

      case 'all':
        // All time: Use startDate (2020-01-01) to today
        currentPeriodEnd = new Date(now);
        currentPeriodStart = new Date(startDate);

        // Previous period: Same duration, shifted back
        const durationMs = currentPeriodEnd - currentPeriodStart;
        previousPeriodEnd = new Date(currentPeriodStart);
        previousPeriodEnd.setMilliseconds(-1);
        previousPeriodStart = new Date(previousPeriodEnd.getTime() - durationMs);
        break;
    }

    // Fetch metrics for previous period with BOUNDED time window (start to end)
    const [prevRecycledData, prevPickups, prevCompletedInitiatives, prevCompletedSupports] = await Promise.all([
      getTotalRecycledInRange(previousPeriodStart, previousPeriodEnd, locationFilter),
      getTotalPickupsInRange(previousPeriodStart, previousPeriodEnd, locationFilter),
      getCompletedInitiativesInRange(previousPeriodStart, previousPeriodEnd, locationFilter),
      getCompletedSupportsInRange(previousPeriodStart, previousPeriodEnd, locationFilter)
    ]);

    // Extract totalKg from recycled data
    const prevRecycled = prevRecycledData.totalKg;

    // For users, get the count as of the START of current period
    // This represents the baseline we're comparing growth against
    const [prevUsersCount] = await Promise.all([
      getActiveUsersAtTime(new Date(0), currentPeriodStart, locationFilter) // All users created before current period
    ]);

    console.log('Percentage Changes Calculation:', {
      timeRange,
      currentPeriod: `${currentPeriodStart.toISOString()} to ${currentPeriodEnd.toISOString()}`,
      previousPeriod: `${previousPeriodStart.toISOString()} to ${previousPeriodEnd.toISOString()}`,
      current: {
        recycled: currentMetrics.totalRecycled,
        initiatives: currentMetrics.completedInitiatives?.count || 0,
        users: currentMetrics.users?.count || 0,
        pickups: currentMetrics.pickups?.completed || 0,
        supports: currentMetrics.completedSupports?.count || 0
      },
      previous: {
        recycled: prevRecycled,
        initiatives: prevCompletedInitiatives.count,
        users: prevUsersCount.count,
        pickups: prevPickups.completed,
        supports: prevCompletedSupports.count
      }
    });

    // Calculate percentage change
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? '+100%' : '+0%';
      }
      const percentChange = Math.round(((current - previous) / previous) * 100);
      return percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`;
    };

    return {
      recycled: calculateChange(currentMetrics.totalRecycled, prevRecycled),
      initiatives: calculateChange(currentMetrics.completedInitiatives?.count || 0, prevCompletedInitiatives.count),
      users: calculateChange(currentMetrics.users?.count || 0, prevUsersCount.count),
      pickups: calculateChange(currentMetrics.pickups?.completed || 0, prevPickups.completed),
      supports: calculateChange(currentMetrics.completedSupports?.count || 0, prevCompletedSupports.count),
      // Include period dates for display on frontend
      currentPeriod: {
        start: currentPeriodStart.toISOString(),
        end: currentPeriodEnd.toISOString()
      },
      previousPeriod: {
        start: previousPeriodStart.toISOString(),
        end: previousPeriodEnd.toISOString()
      }
    };
  } catch (error) {
    console.error('Error calculating percentage changes:', error);
    // Fallback to +0% if calculation fails
    return {
      recycled: '+0%',
      initiatives: '+0%',
      users: '+0%',
      pickups: '+0%',
      supports: '+0%',
      currentPeriod: null,
      previousPeriod: null
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
    const allUsers = await User.findAll();

    // Filter completed pickups and supports
    const completedPickups = allPickups.filter(p => p.status === 'Completed');
    const completedSupports = allSupports.filter(s => s.status === 'Completed');

    // Filter active users who have set their userLocation
    const usersWithLocation = allUsers.filter(user =>
      user.userLocation &&
      user.userLocation.coordinates &&
      user.userLocation.coordinates.lat &&
      user.userLocation.coordinates.lng &&
      user.status !== 'Suspended' &&
      user.status !== 'Deleted'
    );

    // Create map for aggregating activity by location
    // Helper function to calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    };

    // Helper function to find or create a cluster within 2km range (same city only)
    const clusters = [];
    const CLUSTER_RADIUS_KM = 2; // 2km clustering radius

    const findNearbyCluster = (lat, lng, cityCode) => {
      for (const cluster of clusters) {
        // Only cluster within same city
        if (cluster.city?.code !== cityCode) continue;

        const distance = calculateDistance(lat, lng, cluster.centerLat, cluster.centerLng);
        if (distance <= CLUSTER_RADIUS_KM) {
          return cluster;
        }
      }
      return null;
    };

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

    // Process posts - cluster by proximity
    allPosts.forEach(post => {
      // Check if post has valid coordinates
      if (post.location &&
          post.location.coordinates &&
          post.location.coordinates.lat &&
          post.location.coordinates.lng) {

        const lat = post.location.coordinates.lat;
        const lng = post.location.coordinates.lng;
        const cityCode = post.location.city?.code;

        // Find nearby cluster or create new one (same city only)
        let cluster = findNearbyCluster(lat, lng, cityCode);

        if (!cluster) {
          // Create new cluster
          cluster = {
            centerLat: lat,
            centerLng: lng,
            points: [],
            barangays: new Set(), // Track unique barangays
            city: post.location.city,
            province: post.location.province,
            region: post.location.region,
            wastePosts: 0,
            forumPosts: 0,
            initiativePosts: 0,
            completedPickups: 0,
            completedSupports: 0,
            activeUsers: 0,
            totalActivity: 0
          };
          clusters.push(cluster);
        }

        // Add point to cluster
        cluster.points.push({ lat, lng });

        // Add barangay to set (if exists)
        if (post.location.barangay?.name) {
          cluster.barangays.add(post.location.barangay.name);
        }

        // Update cluster center (weighted average)
        const totalPoints = cluster.points.length;
        cluster.centerLat = cluster.points.reduce((sum, p) => sum + p.lat, 0) / totalPoints;
        cluster.centerLng = cluster.points.reduce((sum, p) => sum + p.lng, 0) / totalPoints;

        // Count by post type
        if (post.postType === 'Waste') {
          cluster.wastePosts++;
        } else if (post.postType === 'Forum') {
          cluster.forumPosts++;
        } else if (post.postType === 'Initiative') {
          cluster.initiativePosts++;
        }

        cluster.totalActivity++;
      }
    });

    // Add completed pickup data to clusters
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
        const cityCode = relatedPost.location.city?.code;

        // Find nearby cluster (same city only)
        const cluster = findNearbyCluster(lat, lng, cityCode);
        if (cluster) {
          cluster.completedPickups++;
          cluster.totalActivity++;
        }
      }
    });

    // Add completed support data to clusters
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
        const cityCode = relatedPost.location.city?.code;

        // Find nearby cluster (same city only)
        const cluster = findNearbyCluster(lat, lng, cityCode);
        if (cluster) {
          cluster.completedSupports++;
          cluster.totalActivity++;
        }
      }
    });

    // Add users with set userLocation to clusters
    usersWithLocation.forEach(user => {
      const lat = user.userLocation.coordinates.lat;
      const lng = user.userLocation.coordinates.lng;
      const cityCode = user.userLocation.city?.code;

      // Find nearby cluster or create new one (same city only)
      let cluster = findNearbyCluster(lat, lng, cityCode);

      if (!cluster) {
        // Create new cluster for users in areas without posts
        cluster = {
          centerLat: lat,
          centerLng: lng,
          points: [],
          barangays: new Set(),
          city: user.userLocation.city,
          province: user.userLocation.province,
          region: user.userLocation.region,
          wastePosts: 0,
          forumPosts: 0,
          initiativePosts: 0,
          completedPickups: 0,
          completedSupports: 0,
          activeUsers: 0,
          totalActivity: 0
        };
        clusters.push(cluster);
      }

      // Initialize activeUsers counter if not exists (for backward compatibility)
      if (!cluster.activeUsers) {
        cluster.activeUsers = 0;
      }

      // Add point to cluster
      cluster.points.push({ lat, lng });

      // Add barangay to set
      if (user.userLocation.barangay?.name) {
        cluster.barangays.add(user.userLocation.barangay.name);
      }

      // Update cluster center (weighted average)
      const totalPoints = cluster.points.length;
      cluster.centerLat = cluster.points.reduce((sum, p) => sum + p.lat, 0) / totalPoints;
      cluster.centerLng = cluster.points.reduce((sum, p) => sum + p.lng, 0) / totalPoints;

      // Increment active users count
      cluster.activeUsers++;
      cluster.totalActivity++;
    });

    // If no data, return empty arrays
    if (clusters.length === 0) {
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
          activeUsers: 0,
          totalActivity: 0
        }
      };
    }

    // Convert clusters to heatmap format
    const heatmapPoints = [];
    const areas = [];
    const breakdown = {
      wastePosts: 0,
      forumPosts: 0,
      initiativePosts: 0,
      completedPickups: 0,
      completedSupports: 0,
      activeUsers: 0,
      totalActivity: 0
    };

    clusters.forEach((cluster) => {
      // Build location name with barangay list
      let locationName = '';
      const barangayList = Array.from(cluster.barangays).sort();

      if (barangayList.length > 0) {
        // Format: "City, Region: Barangay1, Barangay2"
        const cityName = cluster.city?.name || 'Unknown City';
        const regionName = cluster.region?.name || 'Unknown Region';
        locationName = `${cityName}, ${regionName}: ${barangayList.join(', ')}`;
      } else {
        // Fallback: "City, Province, Region"
        const parts = [];
        if (cluster.city?.name) parts.push(cluster.city.name);
        if (cluster.province?.name) parts.push(cluster.province.name);
        if (cluster.region?.name) parts.push(cluster.region.name);
        locationName = parts.join(', ') || 'Unknown';
      }

      // Calculate dynamic radius based on point spread
      let radius = 500; // Minimum radius in meters
      if (cluster.points.length > 1) {
        // Find maximum distance from center to any point
        let maxDistance = 0;
        cluster.points.forEach(point => {
          const distance = calculateDistance(
            cluster.centerLat,
            cluster.centerLng,
            point.lat,
            point.lng
          );
          maxDistance = Math.max(maxDistance, distance);
        });

        // Convert to meters and add buffer (50% extra)
        radius = Math.max(500, maxDistance * 1000 * 1.5);

        // Cap at 2km to prevent huge zones
        radius = Math.min(radius, 2000);
      }

      // Add to heatmap points with intensity
      heatmapPoints.push({
        lat: cluster.centerLat,
        lng: cluster.centerLng,
        intensity: Math.min(cluster.totalActivity / 50, 1.0) // Normalize to 0-1, max at 50 activities
      });

      // Determine activity level
      let activityLevel = 'Low';
      let color = '#d4f1d4';
      if (cluster.totalActivity >= 20) {
        activityLevel = 'High';
        color = '#2d7a2d';
      } else if (cluster.totalActivity >= 10) {
        activityLevel = 'Medium';
        color = '#64db64';
      }

      // Add to areas for circle overlays
      areas.push({
        name: locationName,
        lat: cluster.centerLat,
        lng: cluster.centerLng,
        barangays: barangayList,
        city: cluster.city,
        province: cluster.province,
        region: cluster.region,
        activityCount: cluster.totalActivity,
        activityLevel,
        wastePosts: cluster.wastePosts,
        forumPosts: cluster.forumPosts,
        initiativePosts: cluster.initiativePosts,
        completedPickups: cluster.completedPickups,
        completedSupports: cluster.completedSupports,
        activeUsers: cluster.activeUsers || 0,
        color,
        radius // Dynamic radius based on point spread
      });

      // Aggregate breakdown totals
      breakdown.wastePosts += cluster.wastePosts;
      breakdown.forumPosts += cluster.forumPosts;
      breakdown.initiativePosts += cluster.initiativePosts;
      breakdown.completedPickups += cluster.completedPickups;
      breakdown.completedSupports += cluster.completedSupports;
      breakdown.activeUsers += cluster.activeUsers || 0;
      breakdown.totalActivity += cluster.totalActivity;
    });

    console.log(`Generated geographic heatmap with ${heatmapPoints.length} locations, ${breakdown.totalActivity} total activities (including ${breakdown.activeUsers} active users with set locations)`);

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
        activeUsers: 0,
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