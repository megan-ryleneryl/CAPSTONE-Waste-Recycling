// client/src/services/pickupService.js
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

class PickupService {
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
}

export default new PickupService();