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
    
    // Waste-specific fields - STORE DIRECTLY, not in typeSpecificData
    this.materials = data.materials || [];
    this.quantity = data.quantity || 0;
    this.unit = data.unit || 'kg';
    this.price = data.price || 0;
    this.condition = data.condition || 'Good';
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
    
    // FIXED: Check materials properly
    if (!this.materials || (Array.isArray(this.materials) && this.materials.length === 0)) {
      errors.push('At least one material must be specified');
    }
    
    // FIXED: More flexible quantity validation
    if (this.quantity === undefined || this.quantity === null || this.quantity <= 0) {
      this.quantity = 1; // Set default if not provided
    }
    
    // Set defaults for optional fields
    if (!this.unit) this.unit = 'kg';
    if (!this.condition) this.condition = 'Good';
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
      // Waste-specific fields
      materials: this.materials,
      quantity: this.quantity,
      unit: this.unit,
      price: this.price,
      condition: this.condition,
      pickupDate: this.pickupDate,
      pickupTime: this.pickupTime,
      claimedBy: this.claimedBy,
      claimedAt: this.claimedAt,
      // ADD THESE THREE LINES:
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