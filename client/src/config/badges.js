// Badge definitions with achievements and requirements
// These can be synced with the backend badges collection

export const BADGE_CATEGORIES = {
  RECYCLING: 'recycling',
  COMMUNITY: 'community',
  MILESTONE: 'milestone',
  SPECIAL: 'special',
};

export const BADGE_RARITY = {
  COMMON: { label: 'Common', color: '#9ca3af', glow: 'rgba(156, 163, 175, 0.3)' },
  UNCOMMON: { label: 'Uncommon', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' },
  RARE: { label: 'Rare', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  EPIC: { label: 'Epic', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
  LEGENDARY: { label: 'Legendary', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
};

// Badge definitions - Simplified for first iteration
// Only includes badges that can be tracked with existing data
export const BADGES = {
  // Getting Started Badges
  FIRST_POST: {
    id: 'first_post',
    name: 'First Steps',
    description: 'Created your first waste post',
    icon: 'Recycle',
    category: BADGE_CATEGORIES.MILESTONE,
    rarity: 'COMMON',
    requirements: { minPostsCreated: 1 },
    points: 10,
    shareText: "I just took my first step towards a greener planet! Created my first waste post on EcoCollect.",
  },
  FIRST_PICKUP: {
    id: 'first_pickup',
    name: 'Recycling Rookie',
    description: 'Completed your first pickup',
    icon: 'Package',
    category: BADGE_CATEGORIES.RECYCLING,
    rarity: 'COMMON',
    requirements: { minPickupsCompleted: 1 },
    points: 15,
    shareText: "I completed my first recycling pickup! Every piece of waste recycled makes a difference.",
  },

  // Pickup Milestones
  PICKUPS_5: {
    id: 'pickups_5',
    name: 'Getting Consistent',
    description: 'Completed 5 pickups',
    icon: 'Truck',
    category: BADGE_CATEGORIES.MILESTONE,
    rarity: 'UNCOMMON',
    requirements: { minPickupsCompleted: 5 },
    points: 30,
    shareText: "5 pickups completed! Building good recycling habits.",
  },
  PICKUPS_25: {
    id: 'pickups_25',
    name: 'Pickup Pro',
    description: 'Completed 25 pickups',
    icon: 'Award',
    category: BADGE_CATEGORIES.MILESTONE,
    rarity: 'RARE',
    requirements: { minPickupsCompleted: 25 },
    points: 75,
    shareText: "25 pickups and counting! I'm a Pickup Pro now.",
  },
  PICKUPS_50: {
    id: 'pickups_50',
    name: 'Recycling Champion',
    description: 'Completed 50 pickups',
    icon: 'Trophy',
    category: BADGE_CATEGORIES.MILESTONE,
    rarity: 'EPIC',
    requirements: { minPickupsCompleted: 50 },
    points: 150,
    shareText: "50 pickups completed! I'm a Recycling Champion!",
  },

  // Points Milestones
  POINTS_100: {
    id: 'points_100',
    name: 'Point Collector',
    description: 'Earned 100 points',
    icon: 'Star',
    category: BADGE_CATEGORIES.MILESTONE,
    rarity: 'COMMON',
    requirements: { minPoints: 100 },
    points: 0,
    shareText: "I've earned 100 points on EcoCollect! Every action counts.",
  },
  POINTS_500: {
    id: 'points_500',
    name: 'Rising Star',
    description: 'Earned 500 points',
    icon: 'Sparkles',
    category: BADGE_CATEGORIES.MILESTONE,
    rarity: 'UNCOMMON',
    requirements: { minPoints: 500 },
    points: 0,
    shareText: "500 points earned! I'm a Rising Star in the recycling community.",
  },
  POINTS_1000: {
    id: 'points_1000',
    name: 'Eco Elite',
    description: 'Earned 1,000 points',
    icon: 'Zap',
    category: BADGE_CATEGORIES.MILESTONE,
    rarity: 'RARE',
    requirements: { minPoints: 1000 },
    points: 0,
    shareText: "1,000 points! I'm part of the Eco Elite making a real impact!",
  },

  // Community Badge
  INITIATIVE_CREATOR: {
    id: 'initiative_creator',
    name: 'Change Maker',
    description: 'Created a community initiative',
    icon: 'Lightbulb',
    category: BADGE_CATEGORIES.COMMUNITY,
    rarity: 'RARE',
    requirements: { minInitiativesCreated: 1 },
    points: 50,
    shareText: "I created a community recycling initiative! Join me in making a change.",
  },

  // Special Badge
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined during the beta period',
    icon: 'Rocket',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'LEGENDARY',
    requirements: { joinedBeforeDate: '2026-08-01' },
    points: 100,
    shareText: "I'm an Early Adopter of EcoCollect! Supporting sustainability from day one.",
  },
};

// Helper function to get badge by ID
export const getBadgeById = (id) => {
  return Object.values(BADGES).find(badge => badge.id === id);
};

// Helper function to get badges by category
export const getBadgesByCategory = (category) => {
  return Object.values(BADGES).filter(badge => badge.category === category);
};

// Helper function to get badges by rarity
export const getBadgesByRarity = (rarity) => {
  return Object.values(BADGES).filter(badge => badge.rarity === rarity);
};

// Get all badges sorted by rarity
export const getAllBadgesSorted = () => {
  const rarityOrder = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  return Object.values(BADGES).sort((a, b) =>
    rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
  );
};

// Check if user meets badge requirements
export const checkBadgeEligibility = (badge, userStats) => {
  const req = badge.requirements;

  if (req.minPostsCreated && (userStats.postsCreated || 0) < req.minPostsCreated) {
    return false;
  }
  if (req.minPickupsCompleted && (userStats.pickupsCompleted || 0) < req.minPickupsCompleted) {
    return false;
  }
  if (req.minPoints && (userStats.points || 0) < req.minPoints) {
    return false;
  }
  if (req.minInitiativesCreated && (userStats.initiativesCreated || 0) < req.minInitiativesCreated) {
    return false;
  }
  if (req.joinedBeforeDate && userStats.createdAt) {
    const joinDate = new Date(userStats.createdAt);
    const cutoffDate = new Date(req.joinedBeforeDate);
    if (joinDate >= cutoffDate) {
      return false;
    }
  }

  return true;
};

// Get all badges user is eligible for but hasn't earned yet
export const getEligibleBadges = (userStats, earnedBadgeIds = []) => {
  return Object.values(BADGES).filter(badge => {
    // Skip if already earned
    if (earnedBadgeIds.includes(badge.id)) {
      return false;
    }
    // Check if eligible
    return checkBadgeEligibility(badge, userStats);
  });
};
