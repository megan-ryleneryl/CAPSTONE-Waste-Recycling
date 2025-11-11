const { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class DisposalHub {
  constructor(data = {}) {
    this.hubID = data.hubID || null;
    this.name = data.name || '';
    this.type = data.type || 'MRF'; // 'MRF' or 'Junk Shop'
    this.coordinates = data.coordinates || { lat: null, lng: null };
    this.address = data.address || {
      street: '',
      barangay: '',
      city: '',
      province: '',
      region: '',
      postalCode: ''
    };
    this.acceptedMaterials = data.acceptedMaterials || [];
    this.operatingHours = data.operatingHours || {
      monday: '8:00 AM - 5:00 PM',
      tuesday: '8:00 AM - 5:00 PM',
      wednesday: '8:00 AM - 5:00 PM',
      thursday: '8:00 AM - 5:00 PM',
      friday: '8:00 AM - 5:00 PM',
      saturday: '8:00 AM - 12:00 PM',
      sunday: 'Closed'
    };
    this.contact = data.contact || {
      phone: '',
      email: '',
      website: ''
    };
    this.verified = data.verified || false;
    this.addedBy = data.addedBy || null; // userID who suggested this hub
    this.verifiedBy = data.verifiedBy || null; // admin userID who verified
    this.verifiedAt = data.verifiedAt || null;
    this.photos = data.photos || [];
    this.ratings = data.ratings || {
      average: 0,
      count: 0
    };
    this.status = data.status || 'Active'; // 'Active', 'Temporarily Closed', 'Permanently Closed'
    this.description = data.description || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Convert to plain object for Firebase
  toFirestore() {
    return {
      hubID: this.hubID,
      name: this.name,
      type: this.type,
      coordinates: this.coordinates,
      address: this.address,
      acceptedMaterials: this.acceptedMaterials,
      operatingHours: this.operatingHours,
      contact: this.contact,
      verified: this.verified,
      addedBy: this.addedBy,
      verifiedBy: this.verifiedBy,
      verifiedAt: this.verifiedAt,
      photos: this.photos,
      ratings: this.ratings,
      status: this.status,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Calculate distance between two coordinates using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  // Create a new disposal hub
  static async create(hubData) {
    try {
      const db = getFirestore();
      const hubID = uuidv4();
      const hub = new DisposalHub({ ...hubData, hubID });

      const hubRef = doc(db, 'disposalHubs', hubID);
      await setDoc(hubRef, hub.toFirestore());

      console.log(`Disposal hub created: ${hubID}`);
      return hub;
    } catch (error) {
      console.error('Error creating disposal hub:', error);
      throw error;
    }
  }

  // Find disposal hub by ID
  static async findById(hubID) {
    try {
      const db = getFirestore();
      const hubRef = doc(db, 'disposalHubs', hubID);
      const hubSnap = await getDoc(hubRef);

      if (hubSnap.exists()) {
        return new DisposalHub(hubSnap.data());
      }
      return null;
    } catch (error) {
      console.error('Error finding disposal hub:', error);
      throw error;
    }
  }

  // Find all disposal hubs
  static async findAll() {
    try {
      const db = getFirestore();
      const hubsRef = collection(db, 'disposalHubs');
      const snapshot = await getDocs(hubsRef);

      return snapshot.docs.map(doc => new DisposalHub(doc.data()));
    } catch (error) {
      console.error('Error finding all disposal hubs:', error);
      throw error;
    }
  }

  // Find nearby disposal hubs within a radius
  static async findNearby(lat, lng, radiusKm = 10, filters = {}) {
    try {
      const db = getFirestore();
      const hubsRef = collection(db, 'disposalHubs');

      // Build query with filters
      let q = query(hubsRef);

      // Filter by verified status (default to only verified)
      if (filters.verified !== false) {
        q = query(hubsRef, where('verified', '==', true));
      }

      // Filter by status (default to Active)
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      } else {
        q = query(q, where('status', '==', 'Active'));
      }

      // Filter by type (MRF or Junk Shop)
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }

      const snapshot = await getDocs(q);
      const allHubs = snapshot.docs.map(doc => new DisposalHub(doc.data()));

      // Calculate distance for each hub and filter by radius
      const nearbyHubs = allHubs
        .map(hub => {
          if (!hub.coordinates || !hub.coordinates.lat || !hub.coordinates.lng) {
            return null;
          }

          const distance = DisposalHub.calculateDistance(
            lat,
            lng,
            hub.coordinates.lat,
            hub.coordinates.lng
          );

          // Filter by material if specified
          if (filters.material && hub.acceptedMaterials.length > 0) {
            const acceptsMaterial = hub.acceptedMaterials.some(
              material => material.toLowerCase() === filters.material.toLowerCase()
            );
            if (!acceptsMaterial) return null;
          }

          return {
            ...hub,
            distance: distance,
            distanceFormatted: distance < 1
              ? `${Math.round(distance * 1000)} m`
              : `${distance.toFixed(1)} km`
          };
        })
        .filter(hub => hub !== null && hub.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

      return nearbyHubs;
    } catch (error) {
      console.error('Error finding nearby disposal hubs:', error);
      throw error;
    }
  }

  // Find hubs by city
  static async findByCity(cityName) {
    try {
      const db = getFirestore();
      const hubsRef = collection(db, 'disposalHubs');
      const q = query(hubsRef, where('address.city', '==', cityName));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => new DisposalHub(doc.data()));
    } catch (error) {
      console.error('Error finding hubs by city:', error);
      throw error;
    }
  }

  // Find unverified hubs (for admin review)
  static async findUnverified() {
    try {
      const db = getFirestore();
      const hubsRef = collection(db, 'disposalHubs');
      const q = query(hubsRef, where('verified', '==', false));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => new DisposalHub(doc.data()));
    } catch (error) {
      console.error('Error finding unverified hubs:', error);
      throw error;
    }
  }

  // Update disposal hub
  static async update(hubID, updates) {
    try {
      const db = getFirestore();
      const hubRef = doc(db, 'disposalHubs', hubID);

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(hubRef, updateData);
      console.log(`Disposal hub updated: ${hubID}`);

      return await DisposalHub.findById(hubID);
    } catch (error) {
      console.error('Error updating disposal hub:', error);
      throw error;
    }
  }

  // Verify a disposal hub (admin only)
  static async verify(hubID, adminUserID) {
    try {
      return await DisposalHub.update(hubID, {
        verified: true,
        verifiedBy: adminUserID,
        verifiedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error verifying disposal hub:', error);
      throw error;
    }
  }

  // Update hub status
  static async updateStatus(hubID, status) {
    try {
      if (!['Active', 'Temporarily Closed', 'Permanently Closed'].includes(status)) {
        throw new Error('Invalid status');
      }

      return await DisposalHub.update(hubID, { status });
    } catch (error) {
      console.error('Error updating hub status:', error);
      throw error;
    }
  }

  // Add rating to disposal hub
  static async addRating(hubID, rating) {
    try {
      const hub = await DisposalHub.findById(hubID);
      if (!hub) {
        throw new Error('Hub not found');
      }

      const newCount = hub.ratings.count + 1;
      const newAverage = ((hub.ratings.average * hub.ratings.count) + rating) / newCount;

      return await DisposalHub.update(hubID, {
        ratings: {
          average: Math.round(newAverage * 10) / 10,
          count: newCount
        }
      });
    } catch (error) {
      console.error('Error adding rating:', error);
      throw error;
    }
  }
}

module.exports = DisposalHub;
