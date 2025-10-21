// models/WastePost.js
// Updated WastePost model to include claimedBy and claimedAt fields

const Post = require('./Posts');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class WastePost extends Post {
  constructor(data = {}) {
    super(data);
    
    // Ensure this is a Waste post
    this.postType = 'Waste';

    // Store materials as array of objects: [{materialID, quantity, materialName}, ...]
    // materialName is optional but recommended for efficient display
    this.materials = Array.isArray(data.materials) ? data.materials : [];

    // Calculate total quantity from materials array
    this.quantity = data.quantity || (Array.isArray(data.materials)
      ? data.materials.reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0)
      : 0);

    this.price = data.price || 0;
    this.pickupDate = data.pickupDate || null;
    this.pickupTime = data.pickupTime || null;

    // ADD THESE FIELDS FOR CLAIM TRACKING
    this.claimedBy = data.claimedBy || null;
    this.claimedAt = data.claimedAt || null;
    
  }

  // Override validation
  validate() {
    const errors = [];

    // Base validation
    if (!this.userID) errors.push('User ID is required');
    if (!this.title) errors.push('Title is required');
    if (!this.description) errors.push('Description is required');
    if (!this.location) errors.push('Location is required');

    // Check materials array
    if (!this.materials || (Array.isArray(this.materials) && this.materials.length === 0)) {
      errors.push('At least one material must be specified');
    }

    // Validate each material has required fields
    if (Array.isArray(this.materials)) {
      for (let i = 0; i < this.materials.length; i++) {
        const material = this.materials[i];
        if (!material.materialID) {
          errors.push(`Material ${i + 1} is missing materialID`);
        }
        if (!material.quantity || material.quantity <= 0) {
          errors.push(`Material ${i + 1} has invalid quantity`);
        }
        // materialName is optional but recommended
      }
    }

    // Set defaults for optional fields
    if (!this.status) this.status = 'Available';

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Override toFirestore - IMPORTANT: Return flat structure INCLUDING claimedBy fields
  toFirestore() {
    return {
      postID: this.postID,
      userID: this.userID,
      postType: this.postType,
      title: this.title,
      description: this.description,
      location: this.location,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      images: this.images || [],
      // Waste-specific fields
      materials: this.materials,
      quantity: this.quantity,
      price: this.price,
      pickupDate: this.pickupDate,
      pickupTime: this.pickupTime,
      claimedBy: this.claimedBy,
      claimedAt: this.claimedAt,
      // User flags
      isCollector: this.isCollector,
      isAdmin: this.isAdmin,
      isOrganization: this.isOrganization
    };
  }

  // Static method to create a WastePost
  static async create(wastePostData) {
    const db = getFirestore();
    const wastePost = new WastePost(wastePostData);
    
    const validation = wastePost.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const postRef = doc(db, 'posts', wastePost.postID);
      await setDoc(postRef, wastePost.toFirestore());
      console.log('WastePost created successfully:', wastePost.postID);
      return wastePost;
    } catch (error) {
      console.error('Firestore error:', error);
      throw new Error(`Failed to create waste post: ${error.message}`);
    }
  }
}

module.exports = WastePost;