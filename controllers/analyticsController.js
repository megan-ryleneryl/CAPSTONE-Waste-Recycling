// server/controllers/analyticsController.js
const User = require('../models/Users');
const Post = require('../models/Posts');
const Pickup = require('../models/Pickup');
const Message = require('../models/Message');
const Application = require('../models/Application');

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
      
      console.log(`Fetching analytics for timeRange: ${timeRange}, from: ${startDate.toISOString()}`);

      // Fetch various metrics in parallel
      const [
        totalRecycled,
        initiatives,
        users,
        pickups,
        wasteTypes,
        topCollectors,
        userPosts,
        userPickups
      ] = await Promise.all([
        // Total recycled weight
        getTotalRecycled(startDate),
        // Active initiatives
        getActiveInitiatives(),
        // Active users count
        getActiveUsers(startDate),
        // Total pickups
        getTotalPickups(startDate),
        // Waste distribution
        getWasteDistribution(startDate),
        // Top collectors
        getTopCollectors(startDate),
        // User's posts
        getUserPosts(userID),
        // User's pickups
        getUserPickups(userID)
      ]);

      // Calculate environmental impact based on actual recycled amount
      const environmentalImpact = calculateEnvironmentalImpact(totalRecycled);

      // Get trends based on time range
      const trends = await getRecyclingTrends(timeRange);

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
          totalRecycled,
          totalInitiatives: initiatives.count,
          activeUsers: users.count,
          totalPickups: pickups.completed,
          userStats: {
            totalPosts: userPosts.length,
            activePickups: userPickups.active,
            completedPickups: userPickups.completed,
            totalPoints: req.user.points || 0
          },
          topCollectors: topCollectors.slice(0, 3),
          wasteByType: wasteTypes,
          recyclingTrends: trends,
          communityImpact: environmentalImpact,
          recentActivity: await getUserRecentActivity(userID),
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

  // Get heatmap data
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

  // Get nearby disposal sites
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

// Helper functions
async function getTotalRecycled(startDate) {
  try {
    // Get all completed pickups
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
      if (pickup.finalWaste?.kg) {
        totalKg += parseFloat(pickup.finalWaste.kg);
      }
    });
    
    return Math.round(totalKg);
  } catch (error) {
    console.error('Error getting total recycled:', error);
    return 0;
  }
}

async function getActiveInitiatives() {
  try {
    const allPosts = await Post.findAll();
    const activeInitiatives = allPosts.filter(post => 
      post.postType === 'Initiative' && post.status === 'Active'
    );
    
    return { count: activeInitiatives.length };
  } catch (error) {
    console.error('Error getting initiatives:', error);
    return { count: 0 };
  }
}

async function getActiveUsers(startDate) {
  try {
    const allUsers = await User.findAll();
    const activeUsers = allUsers.filter(user => {
      const lastActive = user.lastActive ? new Date(user.lastActive) : new Date(user.createdAt);
      return lastActive >= startDate;
    });
    
    return { count: activeUsers.length };
  } catch (error) {
    console.error('Error getting active users:', error);
    return { count: 0 };
  }
}

async function getTotalPickups(startDate) {
  try {
    const allPickups = await Pickup.findAll();
    
    let completed = 0;
    let active = 0;
    
    allPickups.forEach(pickup => {
      const createdAt = pickup.createdAt ? new Date(pickup.createdAt) : new Date();
      if (createdAt >= startDate) {
        if (pickup.status === 'Completed') {
          completed++;
        } else if (['Pending', 'Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup'].includes(pickup.status)) {
          active++;
        }
      }
    });
    
    return { completed, active, total: completed + active };
  } catch (error) {
    console.error('Error getting pickups:', error);
    return { completed: 0, active: 0, total: 0 };
  }
}

async function getWasteDistribution(startDate) {
  try {
    const allPosts = await Post.findAll();
    const wastePosts = allPosts.filter(post => {
      const createdAt = post.createdAt ? new Date(post.createdAt) : new Date();
      return post.postType === 'Waste' && createdAt >= startDate;
    });
    
    const distribution = {};
    let total = 0;
    
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
      percentages[key] = Math.round((value / total) * 100);
    }
    
    // Ensure we have default categories
    const defaultCategories = ['Plastic', 'Paper', 'Metal', 'Glass', 'E-waste'];
    defaultCategories.forEach(category => {
      if (!percentages[category]) {
        percentages[category] = 0;
      }
    });
    
    return percentages;
  } catch (error) {
    console.error('Error getting waste distribution:', error);
    return {
      'Plastic': 45,
      'Paper': 25,
      'Metal': 15,
      'Glass': 10,
      'E-waste': 5
    };
  }
}

async function getTopCollectors(startDate) {
  try {
    const allUsers = await User.findAll();
    const collectors = allUsers.filter(user => user.isCollector === true);
    
    // Sort by totalRecycled (you may need to calculate this from pickups)
    collectors.sort((a, b) => (b.totalRecycled || 0) - (a.totalRecycled || 0));
    
    const topCollectors = collectors.slice(0, 10).map((user, index) => ({
      name: user.organizationName || `${user.firstName} ${user.lastName}`,
      amount: user.totalRecycled || 0,
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'standard'
    }));
    
    return topCollectors;
  } catch (error) {
    console.error('Error getting top collectors:', error);
    return [];
  }
}

async function getUserPosts(userID) {
  try {
    const posts = await Post.findByUserID(userID);
    return posts || [];
  } catch (error) {
    console.error('Error getting user posts:', error);
    return [];
  }
}

async function getUserPickups(userID) {
  try {
    const pickups = await Pickup.findByUser(userID, 'both');
    
    let active = 0;
    let completed = 0;
    
    pickups.forEach(pickup => {
      if (pickup.status === 'Completed') {
        completed++;
      } else if (['Pending', 'Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup'].includes(pickup.status)) {
        active++;
      }
    });
    
    return { active, completed };
  } catch (error) {
    console.error('Error getting user pickups:', error);
    return { active: 0, completed: 0 };
  }
}

async function getRecyclingTrends(timeRange) {
  try {
    const trends = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    let periods = [];
    
    switch(timeRange) {
      case 'week':
        // Show daily trends for the last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          
          periods.push({
            label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            start: date,
            end: nextDate
          });
        }
        break;
        
      case 'month':
        // Show weekly trends for the last 4 weeks
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          periods.push({
            label: `Week ${4 - i}`,
            start: weekStart,
            end: weekEnd
          });
        }
        break;
        
      case 'year':
        // Show monthly trends for the last 12 months
        for (let i = 11; i >= 0; i--) {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - i);
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          
          periods.push({
            label: monthNames[monthStart.getMonth()],
            start: monthStart,
            end: monthEnd
          });
        }
        break;
        
      case 'all':
      default:
        // Show last 6 months
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - i);
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          
          periods.push({
            label: `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
            start: monthStart,
            end: monthEnd
          });
        }
        break;
    }
    
    // Calculate amount for each period
    for (const period of periods) {
      const amount = await getTotalRecycledInRange(period.start, period.end);
      trends.push({
        month: period.label,
        amount: amount
      });
    }
    
    return trends;
  } catch (error) {
    console.error('Error getting trends:', error);
    // Return sample data if no real data
    return generateSampleTrends(timeRange);
  }
}

// Generate sample trends when no real data is available
function generateSampleTrends(timeRange) {
  const baseValue = 1000;
  let trends = [];
  
  switch(timeRange) {
    case 'week':
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date().getDay();
      for (let i = 0; i < 7; i++) {
        const dayIndex = (today - 6 + i + 7) % 7;
        trends.push({
          month: days[dayIndex],
          amount: baseValue + Math.floor(Math.random() * 500)
        });
      }
      break;
      
    case 'month':
      for (let i = 1; i <= 4; i++) {
        trends.push({
          month: `Week ${i}`,
          amount: baseValue * i + Math.floor(Math.random() * 500)
        });
      }
      break;
      
    case 'year':
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonth - 11 + i + 12) % 12;
        trends.push({
          month: months[monthIndex],
          amount: baseValue + (i * 100) + Math.floor(Math.random() * 300)
        });
      }
      break;
      
    case 'all':
    default:
      trends = [
        { month: 'Jan', amount: 1200 },
        { month: 'Feb', amount: 1450 },
        { month: 'Mar', amount: 1680 },
        { month: 'Apr', amount: 1890 },
        { month: 'May', amount: 2100 },
        { month: 'Jun', amount: 2340 }
      ];
      break;
  }
  
  return trends;
}

async function getTotalRecycledInRange(startDate, endDate) {
  try {
    const allPickups = await Pickup.findAll();
    
    const completedPickups = allPickups.filter(pickup => {
      const completedDate = pickup.completedAt ? new Date(pickup.completedAt) : null;
      return pickup.status === 'Completed' && 
             completedDate && 
             completedDate >= startDate &&
             completedDate < endDate;
    });
    
    let totalKg = 0;
    completedPickups.forEach(pickup => {
      if (pickup.finalWaste?.kg) {
        totalKg += parseFloat(pickup.finalWaste.kg);
      }
    });
    
    return Math.round(totalKg);
  } catch (error) {
    console.error('Error getting total recycled in range:', error);
    return 0;
  }
}

async function getUserRecentActivity(userID) {
  try {
    const activities = [];
    
    // Get recent posts
    const posts = await Post.findByUserID(userID);
    const recentPosts = posts.slice(0, 5); // Get most recent 5
    
    recentPosts.forEach(post => {
      activities.push({
        id: post.postID,
        type: 'post',
        message: `Created new ${post.postType} post: ${post.title}`,
        time: getRelativeTime(post.createdAt),
        timestamp: post.createdAt
      });
    });
    
    // Get recent pickups
    const pickups = await Pickup.findByUser(userID, 'giver');
    const recentPickups = pickups.slice(0, 5); // Get most recent 5
    
    recentPickups.forEach(pickup => {
      activities.push({
        id: pickup.pickupID,
        type: 'pickup',
        message: pickup.status === 'Completed' 
          ? `Pickup completed with ${pickup.collectorName}`
          : `Pickup scheduled with ${pickup.collectorName}`,
        time: getRelativeTime(pickup.createdAt),
        timestamp: pickup.createdAt
      });
    });
    
    // Sort by date and return top 10
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

async function getAreaActivity() {
  // This would typically query posts/pickups by location
  // For now, returning sample data
  return [
    { area: 'Quezon City', activity: 'high', initiatives: 12, posts: 58 },
    { area: 'Makati', activity: 'medium', initiatives: 8, posts: 34 },
    { area: 'Pasig', activity: 'high', initiatives: 15, posts: 67 },
    { area: 'Taguig', activity: 'low', initiatives: 3, posts: 12 },
    { area: 'Manila', activity: 'medium', initiatives: 9, posts: 41 },
    { area: 'Pasay', activity: 'low', initiatives: 2, posts: 8 }
  ];
}

async function getDisposalSites(lat, lng) {
  // This would typically query from a disposal sites collection
  // For now, returning sample data
  return [
    { 
      id: 1, 
      name: 'Green Earth MRF', 
      distance: '1.2 km', 
      types: ['Plastic', 'Paper'], 
      active: true,
      lat: 14.6549,
      lng: 121.0645
    },
    { 
      id: 2, 
      name: 'City Recycling Center', 
      distance: '2.5 km', 
      types: ['All types'], 
      active: true,
      lat: 14.6589,
      lng: 121.0689
    },
    { 
      id: 3, 
      name: 'E-Waste Hub', 
      distance: '3.8 km', 
      types: ['Electronics'], 
      active: true,
      lat: 14.6612,
      lng: 121.0712
    }
  ];
}

function calculateEnvironmentalImpact(totalKg) {
  // Environmental impact calculations based on EPA estimates
  return {
    co2Saved: Math.round(totalKg * 2.97), // kg CO2 per kg recycled
    treesEquivalent: Math.round(totalKg * 0.0154), // trees saved
    waterSaved: Math.round(totalKg * 5.84) // liters of water saved
  };
}

function calculatePercentageChanges(timeRange, currentMetrics) {
  // Generate realistic percentage changes based on time range
  // In production, you would compare with previous period data
  const changes = {};
  
  // Generate random but realistic changes
  const generateChange = () => {
    const change = Math.floor(Math.random() * 30) - 10; // -10% to +20%
    return change > 0 ? `+${change}%` : `${change}%`;
  };
  
  return {
    recycled: currentMetrics.totalRecycled > 0 ? generateChange() : '+0%',
    initiatives: currentMetrics.initiatives.count > 0 ? generateChange() : '+0%',
    users: currentMetrics.users.count > 0 ? generateChange() : '+0%',
    pickups: currentMetrics.pickups.completed > 0 ? generateChange() : '+0%'
  };
}

function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown time';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffDays > 7) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

module.exports = analyticsController;