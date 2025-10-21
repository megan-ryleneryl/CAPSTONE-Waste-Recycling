// client/src/services/pickupService.js
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

class PickupService {
  // Create a new pickup
  async createPickup(pickupData) {
    try {
      const pickupID = `pickup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const pickupDoc = {
        ...pickupData,
        pickupID,
        status: 'Proposed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'pickups', pickupID), pickupDoc);
      
      // Create notification
      await this.createPickupNotification(pickupDoc);
      
      return { success: true, data: pickupDoc };
    } catch (error) {
      console.error('Error creating pickup:', error);
      return { success: false, error: error.message };
    }
  }

  // Get pickups for a user
  async getUserPickups(userID, role = 'both') {
    try {
      const pickupsRef = collection(db, 'pickups');
      let q;

      if (role === 'giver') {
        q = query(pickupsRef, where('giverID', '==', userID), orderBy('createdAt', 'desc'));
      } else if (role === 'collector') {
        q = query(pickupsRef, where('collectorID', '==', userID), orderBy('createdAt', 'desc'));
      } else {
        // Get both - requires composite query or two separate queries
        const giverQuery = query(pickupsRef, where('giverID', '==', userID));
        const collectorQuery = query(pickupsRef, where('collectorID', '==', userID));
        
        const [giverSnap, collectorSnap] = await Promise.all([
          getDocs(giverQuery),
          getDocs(collectorQuery)
        ]);
        
        const pickups = [
          ...giverSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          ...collectorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        ];
        
        return pickups.sort((a, b) => b.createdAt - a.createdAt);
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching pickups:', error);
      return [];
    }
  }

  // Get pickup by ID
  async getPickupById(pickupID) {
    try {
      const pickupDoc = await getDoc(doc(db, 'pickups', pickupID));
      if (pickupDoc.exists()) {
        return { id: pickupDoc.id, ...pickupDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching pickup:', error);
      return null;
    }
  }

  // Update pickup status
  async updatePickupStatus(pickupID, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      // Add specific timestamp based on status
      if (status === 'Confirmed') updateData.confirmedAt = serverTimestamp();
      if (status === 'In-Progress') updateData.startedAt = serverTimestamp();
      if (status === 'Completed') updateData.completedAt = serverTimestamp();
      if (status === 'Cancelled') updateData.cancelledAt = serverTimestamp();

      await updateDoc(doc(db, 'pickups', pickupID), updateData);
      return { success: true };
    } catch (error) {
      console.error('Error updating pickup:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscribe to pickup changes (real-time)
  subscribeToUserPickups(userID, role, callback) {
    const pickupsRef = collection(db, 'pickups');

    if (role === 'giver') {
      const q = query(pickupsRef, where('giverID', '==', userID), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const pickups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(pickups);
      });
    } else if (role === 'collector') {
      const q = query(pickupsRef, where('collectorID', '==', userID), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const pickups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(pickups);
      });
    } else {
      // For 'both', we need to subscribe to two separate queries
      const giverQuery = query(pickupsRef, where('giverID', '==', userID));
      const collectorQuery = query(pickupsRef, where('collectorID', '==', userID));

      let giverPickups = [];
      let collectorPickups = [];

      const unsubscribeGiver = onSnapshot(giverQuery, (snapshot) => {
        giverPickups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Combine and deduplicate
        const allPickups = [...giverPickups, ...collectorPickups];
        const uniquePickups = Array.from(
          new Map(allPickups.map(p => [p.id, p])).values()
        );

        // Sort by createdAt
        uniquePickups.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        });

        callback(uniquePickups);
      });

      const unsubscribeCollector = onSnapshot(collectorQuery, (snapshot) => {
        collectorPickups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Combine and deduplicate
        const allPickups = [...giverPickups, ...collectorPickups];
        const uniquePickups = Array.from(
          new Map(allPickups.map(p => [p.id, p])).values()
        );

        // Sort by createdAt
        uniquePickups.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        });

        callback(uniquePickups);
      });

      // Return a function that unsubscribes from both
      return () => {
        unsubscribeGiver();
        unsubscribeCollector();
      };
    }
  }

  // Create notification
  async createPickupNotification(pickupData) {
    try {
      const notificationID = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await setDoc(doc(db, 'notifications', notificationID), {
        notificationID,
        userID: pickupData.giverID,
        type: 'PICKUP_SCHEDULED',
        title: 'New Pickup Schedule',
        message: `${pickupData.collectorName} has scheduled a pickup for ${pickupData.postTitle}`,
        referenceID: pickupData.pickupID,
        referenceType: 'pickup',
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
}

export default new PickupService();