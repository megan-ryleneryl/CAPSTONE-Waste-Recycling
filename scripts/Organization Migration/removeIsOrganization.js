// removeIsOrganization.js - Clean up deprecated isOrganization field
// This script removes the isOrganization boolean from all User records in Firestore
// RUN ONCE ONLY after verifying the new organizationID system works

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// IMPORTANT: Update this path to your actual service account key file
const serviceAccount = require('../../config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================
// BACKUP USERS BEFORE CLEANUP
// ============================================
async function backupUsers() {
  console.log('📦 Step 1: Creating backup of all users...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `users-before-cleanup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(users, null, 2));
    
    console.log(`✅ Backed up ${users.length} users to ${backupPath}`);
    return { users, backupPath };
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// ============================================
// VERIFY ORGANIZATIONID FIELD EXISTS
// ============================================
async function verifyOrganizationIDExists() {
  console.log('\n🔍 Step 2: Verifying organizationID field exists on all users...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    let totalUsers = 0;
    let usersWithOrgID = 0;
    let usersWithoutOrgID = [];
    
    usersSnapshot.forEach(doc => {
      totalUsers++;
      const data = doc.data();
      
      if ('organizationID' in data) {
        usersWithOrgID++;
      } else {
        usersWithoutOrgID.push({
          userID: doc.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName
        });
      }
    });
    
    console.log(`  ✓ Total users: ${totalUsers}`);
    console.log(`  ✓ Users with organizationID field: ${usersWithOrgID}`);
    console.log(`  ✓ Users without organizationID field: ${usersWithoutOrgID.length}`);
    
    if (usersWithoutOrgID.length > 0) {
      console.log('\n⚠️  WARNING: Some users are missing the organizationID field!');
      console.log('Users without organizationID:');
      usersWithoutOrgID.slice(0, 5).forEach(user => {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
      });
      if (usersWithoutOrgID.length > 5) {
        console.log(`  ... and ${usersWithoutOrgID.length - 5} more`);
      }
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        readline.question('\nDo you want to continue anyway? (yes/no): ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === 'yes');
        });
      });
    }
    
    console.log('✅ All users have the organizationID field');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// ============================================
// CHECK CURRENT STATE OF ISORGANIZATION
// ============================================
async function analyzeIsOrganizationField() {
  console.log('\n📊 Step 3: Analyzing current isOrganization field...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    let totalUsers = 0;
    let usersWithField = 0;
    let usersWithTrue = 0;
    let usersWithFalse = 0;
    let mismatchedUsers = [];
    
    usersSnapshot.forEach(doc => {
      totalUsers++;
      const data = doc.data();
      
      if ('isOrganization' in data) {
        usersWithField++;
        
        if (data.isOrganization === true) {
          usersWithTrue++;
          
          // Check if organizationID is set (should be if isOrganization is true)
          if (!data.organizationID) {
            mismatchedUsers.push({
              userID: doc.id,
              email: data.email,
              issue: 'isOrganization=true but organizationID is null'
            });
          }
        } else if (data.isOrganization === false) {
          usersWithFalse++;
          
          // Check if organizationID is null (should be if isOrganization is false)
          if (data.organizationID !== null && data.organizationID !== undefined) {
            mismatchedUsers.push({
              userID: doc.id,
              email: data.email,
              issue: 'isOrganization=false but organizationID is set'
            });
          }
        }
      }
    });
    
    console.log(`  ✓ Total users: ${totalUsers}`);
    console.log(`  ✓ Users with isOrganization field: ${usersWithField}`);
    console.log(`  ✓ Users with isOrganization=true: ${usersWithTrue}`);
    console.log(`  ✓ Users with isOrganization=false: ${usersWithFalse}`);
    console.log(`  ✓ Mismatched users: ${mismatchedUsers.length}`);
    
    if (mismatchedUsers.length > 0) {
      console.log('\n⚠️  WARNING: Found users with mismatched data!');
      mismatchedUsers.forEach(user => {
        console.log(`  - ${user.email}: ${user.issue}`);
      });
    }
    
    return {
      totalUsers,
      usersWithField,
      usersWithTrue,
      usersWithFalse,
      mismatchedUsers
    };
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// ============================================
// REMOVE ISORGANIZATION FIELD
// ============================================
async function removeIsOrganizationField() {
  console.log('\n🗑️  Step 4: Removing isOrganization field from all users...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let processedCount = 0;
    let removedCount = 0;
    const userDocs = [];
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if ('isOrganization' in data) {
        userDocs.push(doc);
      }
    });
    
    console.log(`Found ${userDocs.length} users with isOrganization field to remove`);
    
    for (let i = 0; i < userDocs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = userDocs.slice(i, i + batchSize);
      
      chunk.forEach(doc => {
        batch.update(doc.ref, {
          isOrganization: admin.firestore.FieldValue.delete()
        });
        removedCount++;
      });
      
      await batch.commit();
      processedCount += chunk.length;
      console.log(`  ✓ Processed ${processedCount}/${userDocs.length} users...`);
    }
    
    console.log(`✅ Successfully removed isOrganization field from ${removedCount} users`);
    return removedCount;
  } catch (error) {
    console.error('❌ Removal failed:', error);
    throw error;
  }
}

// ============================================
// VERIFY CLEANUP
// ============================================
async function verifyCleanup() {
  console.log('\n✓ Step 5: Verifying cleanup...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    let totalUsers = 0;
    let usersStillWithField = 0;
    
    usersSnapshot.forEach(doc => {
      totalUsers++;
      const data = doc.data();
      
      if ('isOrganization' in data) {
        usersStillWithField++;
      }
    });
    
    console.log(`  ✓ Total users checked: ${totalUsers}`);
    console.log(`  ✓ Users still with isOrganization field: ${usersStillWithField}`);
    
    if (usersStillWithField === 0) {
      console.log('✅ Cleanup verification successful! All users cleaned.');
      return true;
    } else {
      console.log('⚠️  Some users still have the isOrganization field');
      return false;
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// ============================================
// MAIN CLEANUP FUNCTION
// ============================================
async function runCleanup() {
  console.log('🚀 Starting isOrganization Field Cleanup');
  console.log('=' .repeat(60));
  console.log('This will:');
  console.log('1. Backup all users');
  console.log('2. Verify organizationID field exists');
  console.log('3. Analyze current isOrganization data');
  console.log('4. Remove isOrganization field from all users');
  console.log('5. Verify cleanup was successful');
  console.log('=' .repeat(60));
  console.log('\n⚠️  WARNING: This will permanently remove the isOrganization field!');
  console.log('⚠️  Make sure the new organizationID system is working properly!\n');
  
  try {
    // Step 1: Backup
    const { users, backupPath } = await backupUsers();
    
    // Step 2: Verify organizationID exists
    const shouldContinue = await verifyOrganizationIDExists();
    if (!shouldContinue) {
      console.log('\n❌ Cleanup cancelled by user');
      process.exit(0);
    }
    
    // Step 3: Analyze current state
    const analysis = await analyzeIsOrganizationField();
    
    // Step 4: Confirm before proceeding
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirmed = await new Promise((resolve) => {
      readline.question('\n⚠️  Are you sure you want to remove isOrganization from all users? (yes/no): ', (answer) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes');
      });
    });
    
    if (!confirmed) {
      console.log('\n❌ Cleanup cancelled by user');
      process.exit(0);
    }
    
    // Step 5: Remove field
    const removedCount = await removeIsOrganizationField();
    
    // Step 6: Verify
    const verified = await verifyCleanup();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nResults:`);
    console.log(`  ✓ Total users: ${analysis.totalUsers}`);
    console.log(`  ✓ Removed isOrganization from: ${removedCount} users`);
    console.log(`  ✓ Backup saved to: ${backupPath}`);
    
    console.log('\nNext steps:');
    console.log('1. ✓ Verify application still works correctly');
    console.log('2. ✓ Check that organization features still work');
    console.log('3. ✓ Monitor for any errors in logs');
    console.log('4. → Remove isOrganization from User model (Users.js)');
    console.log('5. → Remove isOrganization validation from User.validate()');
    console.log('6. → Remove isOrganization from User.toFirestore()');
    
    console.log('\n⚠️  Keep the backup file safe for at least 1 week!');
    
  } catch (error) {
    console.error('\n❌ CLEANUP FAILED!');
    console.error('Error:', error.message);
    console.log('\n🔄 ROLLBACK INSTRUCTIONS:');
    console.log('1. Check the backup file for user data');
    console.log('2. If needed, restore users from backup');
    console.log('3. Contact support if issues persist');
    process.exit(1);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// ============================================
// RUN THE CLEANUP
// ============================================
runCleanup()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });