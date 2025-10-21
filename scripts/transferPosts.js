// Script to transfer posts from old userID to new userID
// Run this with: node scripts/transferPosts.js

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function transferPosts(oldUserID, newUserID) {
  try {
    console.log(`Starting post transfer from ${oldUserID} to ${newUserID}...`);

    // Find all posts by old userID
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, where('userID', '==', oldUserID));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No posts found for old userID');
      return;
    }

    console.log(`Found ${querySnapshot.size} posts to transfer`);

    // Update each post
    let successCount = 0;
    let errorCount = 0;

    for (const postDoc of querySnapshot.docs) {
      try {
        const postRef = doc(db, 'posts', postDoc.id);
        await updateDoc(postRef, {
          userID: newUserID
        });
        console.log(`✓ Transferred post: ${postDoc.id}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to transfer post ${postDoc.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Transfer Complete ===');
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Total: ${querySnapshot.size}`);

  } catch (error) {
    console.error('Error during transfer:', error);
  }
}

// Replace these with your actual userIDs
const OLD_USER_ID = 'YOUR_OLD_USER_ID_HERE';
const NEW_USER_ID = 'YOUR_NEW_USER_ID_HERE';

// Validate userIDs before running
if (OLD_USER_ID === 'YOUR_OLD_USER_ID_HERE' || NEW_USER_ID === 'YOUR_NEW_USER_ID_HERE') {
  console.error('\n⚠️  ERROR: Please edit this file and replace the placeholder userIDs with your actual userIDs');
  console.error('   - Find your old userID in the Firestore console or from old posts');
  console.error('   - Find your new userID by checking localStorage or console logs after login\n');
  process.exit(1);
}

// Run the transfer
transferPosts(OLD_USER_ID, NEW_USER_ID)
  .then(() => {
    console.log('\nScript completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
