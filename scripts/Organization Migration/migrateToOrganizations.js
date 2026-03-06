// migrateToOrganizations.js - Complete Migration Script
// This script migrates isOrganization users to the new Organizations schema
// RUN ONCE ONLY - Creates organizations and links them to users

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK
// IMPORTANT: Update this path to your actual service account key file
const serviceAccount = require('../../config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================
// STEP 1: Backup all users to JSON file
// ============================================
async function backupUsers() {
  console.log('📦 Step 1: Backing up users...');
  
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
    const backupPath = path.join(__dirname, `user-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(users, null, 2));
    
    console.log(`✅ Backed up ${users.length} users to ${backupPath}`);
    return users;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// ============================================
// STEP 2: Create Organization records
// ============================================
async function createOrganizations(users) {
  console.log('\n🏢 Step 2: Creating organizations...');
  
  const organizationsToCreate = [];
  const userOrgMapping = {}; // Map userID -> organizationID
  
  try {
    // Find all users who are organizations
    const orgUsers = users.filter(user => user.isOrganization === true);
    
    console.log(`Found ${orgUsers.length} organization users to migrate`);
    
    if (orgUsers.length === 0) {
      console.log('⚠️  No organization users found. Nothing to migrate.');
      return userOrgMapping;
    }
    
    // Create an organization for each org user
    for (const user of orgUsers) {
      const organizationID = uuidv4();
      
      const orgData = {
        organizationID: organizationID,
        organizationName: user.organizationName || user.username || 'Unnamed Organization',
        members: [user.userID], // The org user becomes the first member
        admins: [user.userID],  // The org user becomes the admin
        description: user.bio || '',
        profilePicture: user.profilePicture || null,
        isActive: true,
        createdAt: user.createdAt || admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      organizationsToCreate.push(orgData);
      userOrgMapping[user.userID] = organizationID;
      
      console.log(`  → Creating org: ${orgData.organizationName} (${organizationID})`);
    }
    
    // Create organizations in Firestore using batch writes
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    
    for (let i = 0; i < organizationsToCreate.length; i += batchSize) {
      const batch = db.batch();
      const chunk = organizationsToCreate.slice(i, i + batchSize);
      
      chunk.forEach(org => {
        const orgRef = db.collection('organizations').doc(org.organizationID);
        batch.set(orgRef, org);
      });
      
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
    
    // Save mapping to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mappingPath = path.join(__dirname, `user-org-mapping-${timestamp}.json`);
    fs.writeFileSync(mappingPath, JSON.stringify(userOrgMapping, null, 2));
    
    console.log(`✅ Created ${organizationsToCreate.length} organizations`);
    console.log(`✅ Saved mapping to ${mappingPath}`);
    
    return userOrgMapping;
  } catch (error) {
    console.error('❌ Organization creation failed:', error);
    throw error;
  }
}

// ============================================
// STEP 3: Update ALL users with organizationID
// ============================================
async function updateUsersWithOrgID(userOrgMapping, allUsers) {
  console.log('\n🔗 Step 3: Updating users with organizationID...');
  
  try {
    // Organization users get their organizationID
    const orgUserIDs = Object.keys(userOrgMapping);
    
    // Non-organization users get null
    const nonOrgUsers = allUsers.filter(user => !userOrgMapping[user.userID]);
    
    console.log(`Updating ${orgUserIDs.length} organization users with organizationID...`);
    console.log(`Setting organizationID to null for ${nonOrgUsers.length} regular users...`);
    console.log(`Total users to update: ${orgUserIDs.length + nonOrgUsers.length}`);
    
    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let updateCount = 0;
    
    // Update organization users with their organizationID
    for (let i = 0; i < orgUserIDs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = orgUserIDs.slice(i, i + batchSize);
      
      chunk.forEach(userID => {
        const userRef = db.collection('users').doc(userID);
        batch.update(userRef, { 
          organizationID: userOrgMapping[userID]
        });
        updateCount++;
      });
      
      await batch.commit();
      console.log(`  ✓ Updated ${updateCount}/${orgUserIDs.length + nonOrgUsers.length} users...`);
    }
    
    // Update non-organization users with null
    for (let i = 0; i < nonOrgUsers.length; i += batchSize) {
      const batch = db.batch();
      const chunk = nonOrgUsers.slice(i, i + batchSize);
      
      chunk.forEach(user => {
        const userRef = db.collection('users').doc(user.userID);
        batch.update(userRef, { 
          organizationID: null
        });
        updateCount++;
      });
      
      await batch.commit();
      console.log(`  ✓ Updated ${updateCount}/${orgUserIDs.length + nonOrgUsers.length} users...`);
    }
    
    console.log(`✅ Successfully updated ${updateCount} users total`);
    console.log(`   - ${orgUserIDs.length} organization users with organizationID`);
    console.log(`   - ${nonOrgUsers.length} regular users with organizationID: null`);
  } catch (error) {
    console.error('❌ User update failed:', error);
    throw error;
  }
}

// ============================================
// STEP 4: Verify migration results
// ============================================
async function verifyMigration(userOrgMapping, allUsers) {
  console.log('\n🔍 Step 4: Verifying migration...');
  
  try {
    const orgUserIDs = Object.keys(userOrgMapping);
    
    // Check organizations were created
    const orgsSnapshot = await db.collection('organizations').get();
    console.log(`  ✓ Organizations collection has ${orgsSnapshot.size} documents`);
    
    // Verify organization users have correct organizationID
    let verifiedOrgCount = 0;
    for (const userID of orgUserIDs) {
      const userDoc = await db.collection('users').doc(userID).get();
      if (userDoc.exists && userDoc.data().organizationID === userOrgMapping[userID]) {
        verifiedOrgCount++;
      }
    }
    console.log(`  ✓ Verified ${verifiedOrgCount}/${orgUserIDs.length} organization users have correct organizationID`);
    
    // Verify ALL users have organizationID field (either value or null)
    let usersWithField = 0;
    let usersWithNull = 0;
    for (const user of allUsers) {
      const userDoc = await db.collection('users').doc(user.userID).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if ('organizationID' in data) {
          usersWithField++;
          if (data.organizationID === null) {
            usersWithNull++;
          }
        }
      }
    }
    console.log(`  ✓ Verified ${usersWithField}/${allUsers.length} users have organizationID field`);
    console.log(`  ✓ ${usersWithNull} regular users have organizationID: null`);
    
    if (verifiedOrgCount === orgUserIDs.length && usersWithField === allUsers.length) {
      console.log('✅ Migration verification successful!');
      return true;
    } else {
      console.log('⚠️  Some users may not have been updated correctly');
      return false;
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================
async function runMigration() {
  console.log('🚀 Starting EcoTayo Organization Migration...');
  console.log('=' .repeat(50));
  console.log('This will:');
  console.log('1. Backup all users');
  console.log('2. Create organization records for isOrganization users');
  console.log('3. Add organizationID field to ALL users:');
  console.log('   - Organization users: set to their organizationID');
  console.log('   - Regular users: set to null');
  console.log('4. Verify the migration');
  console.log('=' .repeat(50));
  console.log('\n⚠️  WARNING: Run this script ONLY ONCE!\n');
  
  try {
    // Step 1: Backup users
    const users = await backupUsers();
    
    // Step 2: Create organizations
    const userOrgMapping = await createOrganizations(users);
    
    // Step 3: Update users
    await updateUsersWithOrgID(userOrgMapping, users);
    
    // Step 4: Verify
    const verified = await verifyMigration(userOrgMapping, users);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. ✓ Check Firebase Console - verify organizations collection');
    console.log('2. ✓ Review user-org-mapping-*.json file');
    console.log('3. ✓ Test querying organizations in your app');
    console.log('4. → Update backend code to use organizationID');
    console.log('5. → Remove isOrganization checks from codebase');
    console.log('\n⚠️  Keep backup files safe until you verify everything works!');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED!');
    console.error('Error:', error.message);
    console.log('\n🔄 ROLLBACK INSTRUCTIONS:');
    console.log('1. Delete the organizations collection in Firebase');
    console.log('2. Restore users from user-backup-*.json if needed');
    console.log('3. Remove organizationID field from affected users');
    console.log('\nBackup files are preserved for manual recovery.');
    process.exit(1);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// ============================================
// RUN THE MIGRATION
// ============================================
runMigration()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });