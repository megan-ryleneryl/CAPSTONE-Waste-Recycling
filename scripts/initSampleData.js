// scripts/initSampleData.js - Initialize sample data for capstone project
require('dotenv').config();
const { adminDb, FirebaseHelper } = require('../config/firebase');

async function initializeSampleData() {
  if (!adminDb) {
    console.error('❌ Firebase Admin not available');
    return;
  }

  try {
    console.log('🌱 Initializing Capstone Recycling Platform Sample Data...');
    console.log('');

    // 1. Create sample materials
    console.log('📦 Creating sample materials...');
    const materialsData = [
      {
        materialID: 'pet_bottles_001',
        category: 'Recyclable',
        type: 'pet_bottles',
        averagePricePerKg: 15.50,
        pricingHistory: [
          { price: 14.00, date: new Date('2024-12-01') },
          { price: 15.50, date: new Date('2025-01-01') }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        materialID: 'aluminum_cans_001',
        category: 'Recyclable', 
        type: 'aluminum_cans',
        averagePricePerKg: 45.00,
        pricingHistory: [
          { price: 42.00, date: new Date('2024-12-01') },
          { price: 45.00, date: new Date('2025-01-01') }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        materialID: 'cardboard_001',
        category: 'Recyclable',
        type: 'boxes_cartons', 
        averagePricePerKg: 8.00,
        pricingHistory: [
          { price: 7.50, date: new Date('2024-12-01') },
          { price: 8.00, date: new Date('2025-01-01') }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        materialID: 'plastic_bags_001',
        category: 'Recyclable',
        type: 'plastic_bags_sachets',
        averagePricePerKg: 12.00,
        pricingHistory: [
          { price: 11.00, date: new Date('2024-12-01') },
          { price: 12.00, date: new Date('2025-01-01') }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const material of materialsData) {
      await adminDb.collection('materials').doc(material.materialID).set(material);
      console.log(`   ✅ Created material: ${material.type}`);
    }

    // 2. Create sample badges
    console.log('🏆 Creating sample badges...');
    const badgesData = [
      {
        badgeID: 'eco_warrior_001',
        badgeName: 'Eco Warrior',
        description: 'Complete your first 5 pickups',
        icon: '/badges/eco-warrior.png',
        requirements: {
          minPickupsCompleted: 5
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        badgeID: 'recycling_hero_001',
        badgeName: 'Recycling Hero',
        description: 'Earn 100 points from recycling activities',
        icon: '/badges/recycling-hero.png',
        requirements: {
          minPoints: 100
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        badgeID: 'community_builder_001',
        badgeName: 'Community Builder',
        description: 'Create 10 posts in the platform',
        icon: '/badges/community-builder.png',
        requirements: {
          minPostsCreated: 10
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const badge of badgesData) {
      await adminDb.collection('badges').doc(badge.badgeID).set(badge);
      console.log(`   ✅ Created badge: ${badge.badgeName}`);
    }

    // 3. Create sample test users (for development)
    console.log('👥 Creating sample test users...');
    const testUsers = [
      {
        userID: 'test_giver_001',
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria.santos@test.com',
        phone: '0917 123 4567',
        passwordHash: 'handled_by_firebase',
        status: 'Verified',
        userType: 'Giver',
        isOrganization: false,
        organizationName: null,
        preferredTimes: ['morning', 'afternoon'],
        preferredLocations: ['Manila', 'Quezon City'],
        points: 50,
        badges: [],
        createdAt: new Date()
      },
      {
        userID: 'test_collector_001',
        firstName: 'Juan',
        lastName: 'Cruz',
        email: 'juan.cruz@test.com',
        phone: '0918 765 4321',
        passwordHash: 'handled_by_firebase',
        status: 'Verified',
        userType: 'Collector',
        isOrganization: true,
        organizationName: 'Green Solutions Inc.',
        preferredTimes: ['morning', 'evening'],
        preferredLocations: ['Manila', 'Makati'],
        points: 150,
        badges: [
          { badgeId: 'eco_warrior_001', earnedAt: new Date() }
        ],
        createdAt: new Date()
      }
    ];

    for (const user of testUsers) {
      await adminDb.collection('users').doc(user.userID).set(user);
      console.log(`   ✅ Created user: ${user.firstName} ${user.lastName} (${user.userType})`);
    }

    // 4. Create sample posts
    console.log('📝 Creating sample posts...');
    const samplePosts = [
      {
        postID: 'waste_post_001',
        userID: 'test_giver_001',
        postType: 'Waste',
        title: 'Clean PET Bottles Available',
        description: 'I have a collection of clean PET bottles ready for pickup. All bottles are rinsed and sorted.',
        location: 'Quezon City, Metro Manila',
        status: 'Active',
        items: [
          {
            itemName: 'PET Bottles (500ml)',
            materialID: 'pet_bottles_001',
            sellingPrice: 15.50,
            kg: 3.2
          },
          {
            itemName: 'PET Bottles (1L)',
            materialID: 'pet_bottles_001', 
            sellingPrice: 15.50,
            kg: 2.1
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        postID: 'forum_post_001',
        userID: 'test_collector_001',
        postType: 'Forum',
        title: 'Best Practices for Sorting Plastic Waste',
        description: 'Share your tips and tricks for efficiently sorting different types of plastic waste for maximum recycling value.',
        location: null,
        status: 'Active',
        category: 'Tips',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        postID: 'initiative_post_001',
        userID: 'test_collector_001',
        postType: 'Initiative',
        title: 'Metro Manila Clean-Up Drive 2025',
        description: 'Organizing a community clean-up drive. We need various recyclable materials to make this initiative successful.',
        location: 'Metro Manila',
        status: 'Active',
        materials: [
          {
            itemName: 'Plastic Bottles',
            materialID: 'pet_bottles_001',
            kg: 50
          },
          {
            itemName: 'Aluminum Cans',
            materialID: 'aluminum_cans_001',
            kg: 25
          }
        ],
        projectDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const post of samplePosts) {
      await adminDb.collection('posts').doc(post.postID).set(post);
      console.log(`   ✅ Created ${post.postType.toLowerCase()} post: ${post.title}`);
    }

    // 5. Create sample notifications
    console.log('🔔 Creating sample notifications...');
    const sampleNotifications = [
      {
        notificationID: 'notif_001',
        userID: 'test_giver_001',
        type: 'Pickup',
        title: 'New Pickup Request',
        message: 'Juan Cruz wants to collect your PET bottles in Quezon City',
        referenceID: 'waste_post_001',
        isRead: false,
        createdAt: new Date()
      },
      {
        notificationID: 'notif_002',
        userID: 'test_collector_001',
        type: 'Badge',
        title: 'Badge Earned! 🏆',
        message: 'Congratulations! You\'ve earned the "Eco Warrior" badge',
        referenceID: 'eco_warrior_001',
        isRead: false,
        createdAt: new Date()
      }
    ];

    for (const notification of sampleNotifications) {
      await adminDb.collection('notifications').doc(notification.notificationID).set(notification);
      console.log(`   ✅ Created notification: ${notification.title}`);
    }

    // 6. Create sample points
    console.log('⭐ Creating sample points...');
    const samplePoints = [
      {
        pointID: 'point_001',
        userID: 'test_giver_001',
        pointsEarned: 5,
        transaction: 'Post_Creation',
        receivedAt: new Date(),
        description: 'Created waste post: Clean PET Bottles Available'
      },
      {
        pointID: 'point_002',
        userID: 'test_collector_001',
        pointsEarned: 15,
        transaction: 'Pickup_Completion',
        receivedAt: new Date(),
        description: 'Completed pickup at Manila location'
      },
      {
        pointID: 'point_003',
        userID: 'test_collector_001',
        pointsEarned: 2,
        transaction: 'Post_Interaction',
        receivedAt: new Date(),
        description: 'Commented on forum post'
      }
    ];

    for (const point of samplePoints) {
      await adminDb.collection('points').doc(point.pointID).set(point);
      console.log(`   ✅ Created point transaction: ${point.pointsEarned} points for ${point.transaction}`);
    }

    console.log('');
    console.log('🎉 ===============================================');
    console.log('✅ SAMPLE DATA INITIALIZATION COMPLETE!');
    console.log('🎉 ===============================================');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   📦 Materials: ${materialsData.length} types`);
    console.log(`   🏆 Badges: ${badgesData.length} achievements`);
    console.log(`   👥 Users: ${testUsers.length} test accounts`);
    console.log(`   📝 Posts: ${samplePosts.length} sample posts`);
    console.log(`   🔔 Notifications: ${sampleNotifications.length} alerts`);
    console.log(`   ⭐ Points: ${samplePoints.length} transactions`);
    console.log('');
    console.log('🧪 Test your API now:');
    console.log('   GET http://localhost:3000/health');
    console.log('   GET http://localhost:3000/api/posts/public');
    console.log('');
    console.log('🚀 Your capstone project is ready for development!');

  } catch (error) {
    console.error('❌ Sample data initialization failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  initializeSampleData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { initializeSampleData };