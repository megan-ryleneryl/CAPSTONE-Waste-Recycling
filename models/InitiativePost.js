const Post = require('./Posts');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class InitiativePost extends Post {
  constructor(data = {}) {
    super(data);

    // Ensure this is an Initiative post
    this.postType = 'Initiative';

    // Initiative-specific fields
    this.goal = data.goal || '';

    // Materials needed for initiative: [{materialID, targetQuantity, currentQuantity, materialName}, ...]
    this.materials = Array.isArray(data.materials) ? data.materials : [];

    // Calculate total amounts from materials array if present, otherwise use provided values
    // IMPORTANT: Always calculate from materials array if it exists (don't use stored targetAmount)
    if (Array.isArray(data.materials) && data.materials.length > 0) {
      this.targetAmount = data.materials.reduce((sum, m) => sum + (parseFloat(m.targetQuantity) || 0), 0);
      this.currentAmount = data.materials.reduce((sum, m) => sum + (parseFloat(m.currentQuantity) || 0), 0);
    } else {
      // Fallback for backward compatibility with old data format
      this.targetAmount = data.targetAmount || 0;
      this.currentAmount = data.currentAmount || 0;
    }

    this.endDate = data.endDate || null;

    // IMPORTANT: Explicitly set support tracking fields
    this.supporters = data.supporters || [];
    this.supportCount = data.supportCount || 0;
  }

  // Override validation
  validate() {
    const errors = [];

    // Base validation
    if (!this.userID) errors.push('User ID is required');
    if (!this.title) errors.push('Title is required');
    if (!this.description) errors.push('Description is required');
    if (!this.location) errors.push('Location is required');

    // Initiative-specific validation
    if (!this.goal) errors.push('Initiative goal is required');

    // Check materials array (new format)
    if (this.materials && Array.isArray(this.materials) && this.materials.length > 0) {
      // Validate each material has required fields
      for (let i = 0; i < this.materials.length; i++) {
        const material = this.materials[i];
        if (!material.materialID) {
          errors.push(`Material ${i + 1} is missing materialID`);
        }
        if (!material.targetQuantity || material.targetQuantity <= 0) {
          errors.push(`Material ${i + 1} has invalid target quantity`);
        }
        // materialName is optional but recommended
        // currentQuantity defaults to 0
      }
    } else {
      // Backward compatibility: If no materials array, must have targetAmount
      if (this.targetAmount <= 0) {
        errors.push('Either materials array or target amount must be greater than 0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Override toFirestore - MUST INCLUDE ALL FIELDS
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
      // Initiative-specific fields
      goal: this.goal,
      materials: this.materials, // New: Array of materials with target/current quantities
      targetAmount: this.targetAmount,
      currentAmount: this.currentAmount,
      endDate: this.endDate,
      // CRITICAL: Include support tracking fields
      supporters: this.supporters,
      supportCount: this.supportCount,
      // User flags
      isCollector: this.isCollector,
      isAdmin: this.isAdmin,
      isOrganization: this.isOrganization
    };
  }

  // Static method to create an InitiativePost
  static async create(initiativePostData) {
    const db = getFirestore();
    const initiativePost = new InitiativePost(initiativePostData);

    const validation = initiativePost.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const postRef = doc(db, 'posts', initiativePost.postID);
      await setDoc(postRef, initiativePost.toFirestore());
      console.log('InitiativePost created successfully:', initiativePost.postID);
      return initiativePost;
    } catch (error) {
      console.error('Firestore error:', error);
      throw new Error(`Failed to create initiative post: ${error.message}`);
    }
  }

  // Update progress when support is received
  async updateProgress(newAmount) {
    const { updateDoc } = require('firebase/firestore');
    const db = getFirestore();
    const postRef = doc(db, 'posts', this.postID);

    this.currentAmount = newAmount;
    this.updatedAt = new Date();

    // Check if target is reached
    if (this.currentAmount >= this.targetAmount && this.status === 'Active') {
      this.status = 'Completed';
    }

    await updateDoc(postRef, {
      currentAmount: this.currentAmount,
      supportCount: this.supportCount,
      supporters: this.supporters,
      status: this.status,
      updatedAt: this.updatedAt
    });

    return this;
  }

  // Update progress for a specific material
  async updateMaterialProgress(materialID, quantityToAdd) {
    const { updateDoc } = require('firebase/firestore');
    const db = getFirestore();
    const postRef = doc(db, 'posts', this.postID);

    // Find the material in the array
    const materialIndex = this.materials.findIndex(m => m.materialID === materialID);

    if (materialIndex === -1) {
      throw new Error(`Material ${materialID} not found in initiative`);
    }

    // Update the material's current quantity
    this.materials[materialIndex].currentQuantity =
      (this.materials[materialIndex].currentQuantity || 0) + quantityToAdd;

    // Recalculate total current amount from all materials
    this.currentAmount = this.materials.reduce(
      (sum, m) => sum + (parseFloat(m.currentQuantity) || 0),
      0
    );

    this.updatedAt = new Date();

    // Check if target is reached
    console.log(`📊 Checking initiative completion: currentAmount=${this.currentAmount}, targetAmount=${this.targetAmount}, status=${this.status}`);
    if (this.currentAmount >= this.targetAmount && this.status === 'Active') {
      this.status = 'Completed';
      console.log('✅ Initiative target reached! Setting status to Completed');
    } else {
      console.log(`⏳ Initiative not complete yet. Still need ${this.targetAmount - this.currentAmount} kg more`);
    }

    await updateDoc(postRef, {
      materials: this.materials,
      currentAmount: this.currentAmount,
      status: this.status,
      updatedAt: this.updatedAt
    });

    return this;
  }

  // Add supporter to the initiative
  async addSupporter(supporterID, supportData) {
    const { updateDoc } = require('firebase/firestore');
    const db = getFirestore();
    const postRef = doc(db, 'posts', this.postID);

    // Add to supporters array if not already present
    if (!this.supporters.includes(supporterID)) {
      this.supporters.push(supporterID);
      this.supportCount = this.supporters.length;
    }

    await updateDoc(postRef, {
      supporters: this.supporters,
      supportCount: this.supportCount,
      updatedAt: new Date()
    });

    return this;
  }
}

module.exports = InitiativePost;