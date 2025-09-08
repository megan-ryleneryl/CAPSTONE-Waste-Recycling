// config/firebase.js - Firebase Configuration for Capstone Project
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
const { getStorage } = require('firebase/storage');
const admin = require('firebase-admin');
require('dotenv').config();

// Your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtaEB8Sw4Nj9tjsGAAsyTdS8XsVvpvK0E",
  authDomain: "capstone-recycling-system.firebaseapp.com",
  projectId: "capstone-recycling-system",
  storageBucket: "capstone-recycling-system.firebasestorage.app",
  messagingSenderId: "175035875160",
  appId: "1:175035875160:web:01a59fc73c851aa7842f2d",
  measurementId: "G-VC8LSSY61Z"
};

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('Firebase Client SDK initialized');

// Initialize Firebase Admin SDK
let adminAuth = null;
let adminDb = null;
let adminStorage = null;
let adminMessaging = null;

try {
  // Try to load service account key
  const serviceAccount = require('./serviceAccountKey.json');
    
  const adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "capstone-recycling-system",
    storageBucket: "capstone-recycling-system.firebasestorage.app"
  });

  adminAuth = admin.auth();
  adminDb = admin.firestore();
  adminStorage = admin.storage();
  adminMessaging = admin.messaging();
  
  console.log('Firebase Admin SDK initialized');
} catch (error) {
  console.warn('Firebase Admin SDK not initialized:', error.message);
}

// Helper functions for the capstone project
const FirebaseHelper = {
  // Check if admin is available
  isAdminAvailable() {
    return adminAuth !== null;
  },

  // Get current timestamp
  getTimestamp() {
    return admin ? admin.firestore.Timestamp.now() : new Date();
  },

  // Get server timestamp (for Firestore)
  getServerTimestamp() {
    return admin ? admin.firestore.FieldValue.serverTimestamp() : new Date();
  },

  // Increment field helper
  increment(value = 1) {
    return admin ? admin.firestore.FieldValue.increment(value) : value;
  },

  // Array operations
  arrayUnion(...elements) {
    return admin ? admin.firestore.FieldValue.arrayUnion(...elements) : elements;
  },

  arrayRemove(...elements) {
    return admin ? admin.firestore.FieldValue.arrayRemove(...elements) : [];
  },

  // Test Firebase connection
  async testConnection() {
    try {
      if (adminDb) {
        // Test Firestore connection
        const testRef = adminDb.collection('_capstone_test').doc('connection');
        await testRef.set({ 
          timestamp: new Date(), 
          test: true,
          message: 'Capstone project Firebase test'
        });
        await testRef.delete();
        
        console.log('Firestore connection successful');
        return { success: true, message: 'Firebase connected successfully' };
      } else {
        console.warn('Admin SDK not available - some features may not work');
        return { success: false, message: 'Admin SDK not available' };
      }
    } catch (error) {
      console.error('Firebase connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }
};

// Export everything
module.exports = {
  // Client SDK
  app,
  auth,
  db,
  storage,
  
  // Admin SDK (might be null if service account not available)
  admin,
  adminAuth,
  adminDb,
  adminStorage, 
  adminMessaging,
  
  // Helpers
  FirebaseHelper,
  
  // Firebase utilities (if admin available)
  FieldValue: admin ? admin.firestore.FieldValue : null,
  Timestamp: admin ? admin.firestore.Timestamp : null
};

// Test connection on startup (capstone development)
if (process.env.NODE_ENV === 'development') {
  setTimeout(async () => {
    console.log('Testing Firebase setup...');
    const result = await FirebaseHelper.testConnection();
    
    if (result.success) {
      console.log('Firebase setup complete and working.');
      
      // Optional: Initialize sample data for demos
      // await FirebaseHelper.initializeSampleData();
    } else {
      console.log('Firebase setup incomplete:', result.message || result.error);
      console.log('Check SETUP_CHECKLIST.md for troubleshooting steps');
    }
  }, 2000);
}