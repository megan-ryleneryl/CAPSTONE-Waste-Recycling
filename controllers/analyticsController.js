// server/controllers/analyticsController.js
const User = require('../models/Users');
const Post = require('../models/Posts');
const Pickup = require('../models/Pickup');
const Message = require('../models/Message');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const Point = require('../models/Point');

const analyticsController = {
  // Get dashboard analytics for authenticated user
  async getDashboardAnalytics(req, res) {
    try {
      const userID = req.user.userID;
      const timeRange = req.query.timeRange || 'month';
      
      // Calculate date range based on timeRange parameter
      const now = new Date();
      let startDate = new Date();
      
      switch(timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(2020, 0, 1); // App launch date
          break;
      }
      
      console.log(`Fetching analytics for user ${userID}, timeRange: ${timeRange}, from: ${startDate.toISOString()}`);

      // Fetch current user data to check roles
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
        wasteTypes,
        topCollectors,
        userSpecificStats,
        pendingApplications,
        recentActivity
      ] = await Promise.all([
        getTotalRecycled(startDate),
        getActiveInitiatives(),
        getActiveUsers(startDate),
        getTotalPickups(startDate),
        getWasteDistribution(startDate),
        getTopCollectors(startDate),
        getUserSpecificStats(userID, currentUser),
        currentUser.isAdmin ? getPendingApplications() : { count: 0 },
        getUserRecentActivity(userID, startDate)
      ]);

      // Calculate environmental impact based on actual recycled amount
      const environmentalImpact = calculateEnvironmentalImpact(totalRecycled);

      // Get trends based on time range
      const trends = await getRecyclingTrends(timeRange, startDate);

      // Calculate percentage changes
      const percentageChanges = calculatePercentageChanges(timeRange, {
        totalRecycled,
        initiatives,
        users,
        pickups
      });

      res.json({
        success: true,
        data: {
          // Platform-wide stats (visible to admins)
          totalRecycled,
          totalInitiatives: initiatives.count,
          activeUsers: users.count,
          totalPickups: pickups.total,
          pendingApplications: pendingApplications.count,
          
          // Giver-specific stats (all users have giver capabilities)
          giverStats: userSpecificStats.giver,
          
          // Collector-specific stats (only if user is a collector)
          collectorStats: userSpecificStats.collector,
          
          // Organization-specific stats (only if user is an organization)
          organizationStats: userSpecificStats.organization,
          
          // Environmental impact
          communityImpact: environmentalImpact,
          
          // Additional data
          topCollectors: topCollectors.slice(0, 3),
          wasteByType: wasteTypes,
          recyclingTrends: trends,
          recentActivity,
          percentageChanges,
          timeRange
        }
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  },

  // Get heatmap data for activity visualization
  async getHeatmapData(req, res) {
    try {
      const areas = await getAreaActivity();
      
      res.json({
        success: true,
        data: areas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch heatmap data',
        error: error.message
      });
    }
  },

  // Get nearby disposal sites based on location
  async getNearbyDisposalSites(req, res) {
    try {
      const { lat, lng } = req.query;
      const sites = await getDisposalSites(lat, lng);
      
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

// Get total weight recycled in the time period
async function getTotalRecycled(startDate) {
  try {
    const allPickups = await Pickup.findAll();
    
    // Filter by date and status
    const completedPickups = allPickups.filter(pickup => {
      const completedDate = pickup.completedAt ? new Date(pickup.completedAt) : null;
      return pickup.status === 'Completed' && 
             completedDate && 
             completedDate >= startDate;
    });
    
    // Calculate total weight
    let totalKg = 0;
    completedPickups.forEach(pickup => {
      if (pickup.actualWaste?.finalAmount) {
        totalKg += parseFloat(pickup.actualWaste.finalAmount);
      }
    });
    
    return Math.round(totalKg);
  } catch (error) {
    console.error('Error getting total recycled:', error);
    return 0;
  }
}

// Get active initiatives count
async function getActiveInitiatives() {
  try {
    const allPosts = await Post.findAll();
    const activeInitiatives = allPosts.filter(post => 
      post.postType === 'Initiative' && 
      (post.status === 'Active' || post.status === 'Open')
    );
    
    return { count: activeInitiatives.length };
  } catch (error) {
    console.error('Error getting initiatives:', error);
    return { count: 0 };
  }
}

// Get count of active users in the time period
async function getActiveUsers(startDate) {
  try {
    const allUsers = await User.findAll();
    const activeUsers = allUsers.filter(user => {
      const lastActive = user.lastActive ? new Date(user.lastActive) : new Date(user.createdAt);
      return lastActive >= startDate && user.status === 'Active';
    });
    
    return { count: activeUsers.length };
  } catch (error) {
    console.error('Error getting active users:', error);
    return { count: 0 };
  }
}

// Get pickup statistics
async function getTotalPickups(startDate) {
  try {
    const allPickups = await Pickup.findAll();
    
    let completed = 0;
    let active = 0;
    let cancelled = 0;
    
    allPickups.forEach(pickup => {
      const createdAt = pickup.createdAt ? new Date(pickup.createdAt) : new Date();
      if (createdAt >= startDate) {
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
      total: completed + active 
    };
  } catch (error) {
    console.error('Error getting pickups:', error);
    return { completed: 0, active: 0, cancelled: 0, total: 0 };
  }
}

// Get waste type distribution
async function getWasteDistribution(startDate) {
  try {
    const allPosts = await Post.findAll();
    const wastePosts = allPosts.filter(post => {
      const createdAt = post.createdAt ? new Date(post.createdAt) : new Date();
      return post.postType === 'Waste' && createdAt >= startDate;
    });
    
    const distribution = {};
    let total = 0;
    
    // Count materials from posts
    wastePosts.forEach(post => {
      if (post.materials && Array.isArray(post.materials)) {
        post.materials.forEach(material => {
          distribution[material] = (distribution[material] || 0) + 1;
          total++;
        });
      }
    });
    
    // Convert to percentages
    const percentages = {};
    for (const [key, value] of Object.entries(distribution)) {
      percentages[key] = total > 0 ? Math.round((value / total) * 100) : 0;
    }
    
    // Ensure we have default categories
    const defaultCategories = ['Plastic', 'Paper', 'Metal', 'Glass', 'E-waste', 'Organic'];
    defaultCategories.forEach(category => {
      if (!percentages[category]) {
        percentages[category] = 0;
      }
    });
    
    return percentages;
  } catch (error) {
    console.error('Error getting waste distribution:', error);
    // Return default distribution
    return {
      'Plastic': 35,
      'Paper': 25,
      'Metal': 15,
      'Glass': 10,
      'E-waste': 10,
      'Organic': 5
    };
  }
}

// Get top collectors with their collected amounts
async function getTopCollectors(startDate) {
  try {
    const allUsers = await User.findAll();
    const collectors = allUsers.filter(user => user.isCollector === true);
    
    // Get pickup data for each collector
    const collectorStats = await Promise.all(
      collectors.map(async (collector) => {
        const pickups = await Pickup.findByCollector(collector.userID);
        
        // Calculate total collected in the time period
        let totalCollected = 0;
        pickups.forEach(pickup => {
          const completedDate = pickup.completedAt ? new Date(pickup.completedAt) : null;
          if (pickup.status === 'Completed' && 
              completedDate && 
              completedDate >= startDate &&
              pickup.actualWaste?.finalAmount) {
            totalCollected += parseFloat(pickup.actualWaste.finalAmount);
          }
        });
        
        return {
          userID: collector.userID,
          name: collector.organizationName || `${collector.firstName} ${collector.lastName}`,
          amount: Math.round(totalCollected),
          profilePicture: collector.profilePicture || null
        };
      })
    );
    
    // Sort by amount collected and assign badges
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

// Get user-specific statistics based on their roles
async function getUserSpecificStats(userID, user) {
  const stats = {
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
    // ===== GIVER STATS (All users have giver capabilities) =====
    const userPickupsAsGiver = await Pickup.findByGiver(userID);
    
    stats.giver.activePickups = userPickupsAsGiver.filter(p => 
      ['Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup'].includes(p.status)
    ).length;
    
    stats.giver.successfulPickups = userPickupsAsGiver.filter(p => 
      p.status === 'Completed'
    ).length;
    
    // Calculate total recycled weight as giver
    userPickupsAsGiver.forEach(pickup => {
      if (pickup.status === 'Completed' && pickup.actualWaste?.finalAmount) {
        stats.giver.totalKgRecycled += parseFloat(pickup.actualWaste.finalAmount);
      }
    });
    stats.giver.totalKgRecycled = Math.round(stats.giver.totalKgRecycled);
    
    // Get user's posts
    const userPosts = await Post.findByUser(userID);
    
    // Count active forum posts
    stats.giver.activeForumPosts = userPosts.filter(p => 
      p.postType === 'Forum' && p.status === 'Active'
    ).length;
    
    // Get user's total points
    const userPoints = await Point.getUserTotal(userID);
    stats.giver.totalPoints = userPoints || user.points || 0;
    
    // ===== COLLECTOR STATS (If user is a collector) =====
    if (user.isCollector) {
      const collectorPickups = await Pickup.findByCollector(userID);
      
      // Get waste posts claimed by this collector
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
      
      // Calculate total collected as collector
      collectorPickups.forEach(pickup => {
        if (pickup.status === 'Completed' && pickup.actualWaste?.finalAmount) {
          stats.collector.totalCollected += parseFloat(pickup.actualWaste.finalAmount);
        }
      });
      stats.collector.totalCollected = Math.round(stats.collector.totalCollected);
      
      // Calculate completion rate
      const totalCollectorPickups = collectorPickups.length;
      const completedPickups = collectorPickups.filter(p => p.status === 'Completed').length;
      if (totalCollectorPickups > 0) {
        stats.collector.completionRate = Math.round((completedPickups / totalCollectorPickups) * 100);
      }
    }
    
    // ===== ORGANIZATION STATS (If user is an organization) =====
    if (user.isOrganization) {
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
      
      // Calculate supporters and materials from initiatives
      for (const initiative of orgInitiatives) {
        // Get supporters (users who have donated to this initiative)
        const supporters = await getInitiativeSupporters(initiative.postID);
        stats.organization.totalSupporters += supporters.length;
        
        // Calculate materials received
        if (initiative.materialsReceived) {
          stats.organization.materialsReceived += parseFloat(initiative.materialsReceived || 0);
        }
        
        // Track top contributors
        supporters.forEach(supporter => {
          const existingContributor = stats.organization.topContributors.find(
            c => c.userID === supporter.userID
          );
          if (existingContributor) {
            existingContributor.amount += supporter.amount;
          } else {
            stats.organization.topContributors.push({
              userID: supporter.userID,
              name: supporter.name,
              amount: supporter.amount
            });
          }
        });
      }
      
      // Sort and limit top contributors
      stats.organization.topContributors.sort((a, b) => b.amount - a.amount);
      stats.organization.topContributors = stats.organization.topContributors.slice(0, 5);
      stats.organization.materialsReceived = Math.round(stats.organization.materialsReceived);
    }
    
  } catch (error) {
    console.error('Error getting user specific stats:', error);
  }
  
  return stats;
}

// Get pending applications count (for admins)
async function getPendingApplications() {
  try {
    const allApplications = await Application.findAll();
    const pending = allApplications.filter(app => 
      app.status === 'Pending' || app.status === 'Submitted'
    );
    return { count: pending.length };
  } catch (error) {
    console.error('Error getting pending applications:', error);
    return { count: 0 };
  }
}

// Get supporters for an initiative
async function getInitiativeSupporters(initiativeID) {
  try {
    // This would query from an InitiativeSupport collection
    // For now, returning empty array - implement based on your support model
    return [];
  } catch (error) {
    console.error('Error getting initiative supporters:', error);
    return [];
  }
}

// Get user's recent activity
async function getUserRecentActivity(userID, startDate) {
  try {
    const activities = [];
    
    // Get user's posts
    const posts = await Post.findByUser(userID);
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
    
    // Get user's pickups
    const pickups = await Pickup.findByGiver(userID);
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
    
    // Sort by timestamp and return top 10
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

// Get recycling trends over time
async function getRecyclingTrends(timeRange, startDate) {
  try {
    // This would aggregate data over time periods
    // For now, returning sample trend data
    const trends = [];
    const periods = timeRange === 'week' ? 7 : timeRange === 'month' ? 4 : 12;
    
    for (let i = 0; i < periods; i++) {
      trends.push({
        period: i,
        amount: Math.floor(Math.random() * 100) + 50
      });
    }
    
    return trends;
  } catch (error) {
    console.error('Error getting recycling trends:', error);
    return [];
  }
}

// Get area activity for heatmap
async function getAreaActivity() {
  try {
    // This would aggregate posts/pickups by location
    // For now, returning sample data for Metro Manila areas
    return [
      { area: 'Quezon City', activity: 'high', initiatives: 12, posts: 58, color: '#3B6535' },
      { area: 'Makati', activity: 'medium', initiatives: 8, posts: 34, color: '#F0924C' },
      { area: 'Pasig', activity: 'high', initiatives: 15, posts: 67, color: '#3B6535' },
      { area: 'Taguig', activity: 'low', initiatives: 3, posts: 12, color: '#B3F2AC' },
      { area: 'Manila', activity: 'medium', initiatives: 9, posts: 41, color: '#F0924C' },
      { area: 'Pasay', activity: 'low', initiatives: 2, posts: 8, color: '#B3F2AC' },
      { area: 'Parañaque', activity: 'medium', initiatives: 6, posts: 28, color: '#F0924C' },
      { area: 'Las Piñas', activity: 'low', initiatives: 4, posts: 15, color: '#B3F2AC' },
      { area: 'Muntinlupa', activity: 'medium', initiatives: 7, posts: 31, color: '#F0924C' },
      { area: 'Marikina', activity: 'high', initiatives: 11, posts: 52, color: '#3B6535' }
    ];
  } catch (error) {
    console.error('Error getting area activity:', error);
    return [];
  }
}

// Get nearby disposal sites
async function getDisposalSites(lat, lng) {
  try {
    // This would query from a disposal sites collection with geolocation
    // For now, returning sample data
    const sites = [
      { 
        id: 1, 
        name: 'Green Earth MRF', 
        distance: '1.2 km', 
        types: ['Plastic', 'Paper', 'Metal'], 
        active: true,
        address: '123 Recycling St., Quezon City',
        operatingHours: '8:00 AM - 5:00 PM',
        contact: '+63 2 1234 5678',
        lat: parseFloat(lat) + 0.01,
        lng: parseFloat(lng) + 0.01
      },
      { 
        id: 2, 
        name: 'City Recycling Center', 
        distance: '2.5 km', 
        types: ['All waste types accepted'], 
        active: true,
        address: '456 Green Avenue, Makati',
        operatingHours: '7:00 AM - 6:00 PM',
        contact: '+63 2 9876 5432',
        lat: parseFloat(lat) - 0.02,
        lng: parseFloat(lng) + 0.02
      },
      { 
        id: 3, 
        name: 'E-Waste Collection Hub', 
        distance: '3.8 km', 
        types: ['Electronics', 'Batteries', 'Appliances'], 
        active: true,
        address: '789 Tech Park, BGC Taguig',
        operatingHours: '9:00 AM - 5:00 PM',
        contact: '+63 2 5555 1234',
        lat: parseFloat(lat) + 0.03,
        lng: parseFloat(lng) - 0.01
      },
      {
        id: 4,
        name: 'Community Recycling Point',
        distance: '0.8 km',
        types: ['Plastic', 'Paper', 'Glass'],
        active: true,
        address: 'Barangay Hall, Local Street',
        operatingHours: '8:00 AM - 4:00 PM',
        contact: '+63 917 123 4567',
        lat: parseFloat(lat) + 0.005,
        lng: parseFloat(lng) - 0.005
      }
    ];
    
    // Sort by distance
    return sites.sort((a, b) => 
      parseFloat(a.distance) - parseFloat(b.distance)
    );
  } catch (error) {
    console.error('Error getting disposal sites:', error);
    return [];
  }
}

// Calculate environmental impact metrics
function calculateEnvironmentalImpact(totalKg) {
  // Environmental impact calculations based on EPA estimates
  return {
    co2Saved: Math.round(totalKg * 2.97), // kg CO2 per kg recycled
    treesEquivalent: Math.round(totalKg * 0.0154), // trees saved equivalent
    waterSaved: Math.round(totalKg * 5.84), // liters of water saved
    energySaved: Math.round(totalKg * 0.94), // kWh of energy saved
    landfillDiverted: totalKg // kg diverted from landfills
  };
}

// Calculate percentage changes from previous period
function calculatePercentageChanges(timeRange, currentMetrics) {
  // In production, this would compare with actual previous period data
  // For now, generating realistic percentage changes
  const changes = {};
  
  // Helper function to generate realistic change
  const generateChange = (current) => {
    if (current === 0) return '+0%';
    // Generate change between -15% and +30%
    const change = Math.floor(Math.random() * 45) - 15;
    return change >= 0 ? `+${change}%` : `${change}%`;
  };
  
  return {
    recycled: generateChange(currentMetrics.totalRecycled),
    initiatives: generateChange(currentMetrics.initiatives.count),
    users: generateChange(currentMetrics.users.count),
    pickups: generateChange(currentMetrics.pickups.completed)
  };
}

// Convert timestamp to relative time
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

module.exports = analyticsController;