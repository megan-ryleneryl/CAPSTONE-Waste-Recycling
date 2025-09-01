// firebase.js - Complete Firebase Configuration for Firestore
const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
const { getStorage, connectStorageEmulator } = require('firebase/storage');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase client configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Try to load service account key
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  console.warn('Service account key not found. Some admin features may not work.');
}

let adminApp;
if (serviceAccount) {
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

// Admin services
const adminAuth = adminApp ? admin.auth() : null;
const adminDb = adminApp ? admin.firestore() : null;
const adminStorage = adminApp ? admin.storage() : null;
const adminMessaging = adminApp ? admin.messaging() : null;

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.warn('Could not connect to emulators:', error.message);
  }
}

// Helper functions for common operations
const FirebaseHelper = {
  // Batch write helper
  async batchWrite(operations) {
    const batch = adminDb.batch();
    
    operations.forEach(op => {
      const ref = adminDb.collection(op.collection).doc(op.id);
      if (op.type === 'set') {
        batch.set(ref, op.data);
      } else if (op.type === 'update') {
        batch.update(ref, op.data);
      } else if (op.type === 'delete') {
        batch.delete(ref);
      }
    });
    
    return await batch.commit();
  },

  // Transaction helper
  async runTransaction(callback) {
    return await adminDb.runTransaction(callback);
  },

  // Increment counter helper
  async incrementCounter(collection, docId, field, increment = 1) {
    const ref = adminDb.collection(collection).doc(docId);
    return await ref.update({
      [field]: admin.firestore.FieldValue.increment(increment)
    });
  },

  // Array operations helper
  async addToArray(collection, docId, field, value) {
    const ref = adminDb.collection(collection).doc(docId);
    return await ref.update({
      [field]: admin.firestore.FieldValue.arrayUnion(value)
    });
  },

  async removeFromArray(collection, docId, field, value) {
    const ref = adminDb.collection(collection).doc(docId);
    return await ref.update({
      [field]: admin.firestore.FieldValue.arrayRemove(value)
    });
  },

  // Timestamp helper
  getTimestamp() {
    return admin.firestore.Timestamp.now();
  },

  // Server timestamp
  getServerTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }
};

// Export everything
module.exports = {
  // Client SDK
  app,
  auth,
  db,
  storage,
  
  // Admin SDK
  admin,
  adminAuth,
  adminDb,
  adminStorage,
  adminMessaging,
  
  // Helpers
  FirebaseHelper,
  
  // Firebase types and utilities
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp
};