// scripts/testFirebase.js - Simple Firebase connection test
require('dotenv').config();
const { adminDb, adminAuth } = require('../config/firebase');

async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase Connection for Capstone Project...');
  console.log('');

  try {
    // Test 1: Check if admin is initialized
    console.log('1. Testing Admin SDK...');
    if (adminDb && adminAuth) {
      console.log('✅ Firebase Admin SDK is available');
    } else {
      console.log('❌ Firebase Admin SDK not initialized');
      return;
    }

    // Test 2: Try to list collections (this should work even with empty database)
    console.log('');
    console.log('2. Testing Firestore access...');
    
    const collections = await adminDb.listCollections();
    console.log('✅ Firestore connection successful!');
    console.log(`📁 Collections found: ${collections.length}`);
    
    if (collections.length > 0) {
      collections.forEach(collection => {
        console.log(`   - ${collection.id}`);
      });
    } else {
      console.log('   (Database is empty - this is normal for new projects)');
    }

    // Test 3: Try to create a simple test document
    console.log('');
    console.log('3. Testing write operations...');
    
    const testDoc = {
      test: true,
      message: 'Capstone project test',
      timestamp: new Date(),
      project: 'recycling-platform'
    };

    await adminDb.collection('_test').doc('connection-test').set(testDoc);
    console.log('✅ Write operation successful!');
    
    // Test 4: Try to read the document back
    const readDoc = await adminDb.collection('_test').doc('connection-test').get();
    if (readDoc.exists) {
      console.log('✅ Read operation successful!');
      console.log('   Data:', readDoc.data());
    }

    // Clean up test document
    await adminDb.collection('_test').doc('connection-test').delete();
    console.log('✅ Cleanup successful!');

    console.log('');
    console.log('🎉 ===============================================');
    console.log('✅ FIREBASE FULLY OPERATIONAL!');
    console.log('🎉 ===============================================');
    console.log('');
    console.log('🚀 Your capstone project database is ready!');
    console.log('💡 You can now safely create real data');

  } catch (error) {
    console.log('❌ Firebase test failed:', error.message);
    console.log('');
    
    if (error.message.includes('NOT_FOUND')) {
      console.log('🔧 SOLUTION: Database not properly created');
      console.log('   1. Go to Firebase Console');
      console.log('   2. Select your project: capstone-recycling-system');
      console.log('   3. Click "Firestore Database" in sidebar');
      console.log('   4. Click "Create database"');
      console.log('   5. Choose "Start in test mode"');
      console.log('   6. Select location: asia-southeast1');
    }
    
    if (error.message.includes('UNAUTHENTICATED')) {
      console.log('🔧 SOLUTION: Service account key issue');
      console.log('   1. Download fresh serviceAccountKey.json from Firebase Console');
      console.log('   2. Replace the file in config/serviceAccountKey.json');
    }
    
    console.log('');
    console.log('📖 Full error details:', error.stack);
  }
}

// Run the test
testFirebaseConnection()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
  });