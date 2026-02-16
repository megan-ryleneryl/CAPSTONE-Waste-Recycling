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

// // config/firebase.js - Backend Firebase Admin SDK Configuration
// const admin = require('firebase-admin');
// const { Firestore } = require('@google-cloud/firestore');

// let adminAuth = null;
// let adminDb = null;

// try {
//   // Check if we're using environment variables or service account file
//   if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
//     // Production mode: Use environment variables
//     console.log('🔧 Initializing Firebase Admin with environment variables');
    
//     // Format the private key properly (replace \\n with actual newlines)
//     const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
//     admin.initializeApp({
//       credential: admin.credential.cert({
//         projectId: process.env.FIREBASE_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//         privateKey: privateKey,
//       }),
//       databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
//     });

//     adminAuth = admin.auth();
//     adminDb = admin.firestore();
    
//     console.log('✅ Firebase Admin SDK initialized successfully');
//   } else if (process.env.NODE_ENV !== 'production') {
//     // Development mode: Try to use service account file
//     console.log('🔧 Initializing Firebase Admin with service account file (development)');
    
//     try {
//       const serviceAccount = require('../serviceAccountKey.json');
      
//       admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//         databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
//       });

//       adminAuth = admin.auth();
//       adminDb = admin.firestore();
      
//       console.log('✅ Firebase Admin SDK initialized successfully');
//     } catch (fileError) {
//       console.warn('⚠️ Firebase Admin SDK initialization failed (serviceAccountKey.json not found)');
//       console.warn('This is normal for production - make sure environment variables are set');
//     }
//   } else {
//     console.error('❌ Firebase Admin credentials not found');
//     console.error('Please set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables');
//   }
// } catch (error) {
//   console.error('❌ Firebase Admin SDK initialization failed:', error.message);
//   console.error('Firebase Admin features will be disabled');
// }

// // Helper class for Firestore operations
// class FirebaseHelper {
//   static async testConnection() {
//     if (!adminDb) {
//       return { success: false, message: 'Firebase Admin not initialized' };
//     }
    
//     try {
//       // Try to access a collection to verify connection
//       await adminDb.collection('_test').limit(1).get();
//       return { success: true, message: 'Firebase connection successful' };
//     } catch (error) {
//       return { success: false, message: error.message };
//     }
//   }

//   static getDb() {
//     if (!adminDb) {
//       console.warn('Firebase Admin DB not initialized');
//       // Return a basic Firestore instance as fallback
//       return new Firestore({
//         projectId: process.env.FIREBASE_PROJECT_ID || 'capstone-recycling-system',
//       });
//     }
//     return adminDb;
//   }

//   static getAuth() {
//     return adminAuth;
//   }
// }

// module.exports = {
//   admin: adminAuth ? admin : null, // Export null if not initialized
//   adminAuth,
//   adminDb,
//   FirebaseHelper
// };