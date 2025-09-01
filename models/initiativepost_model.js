// InitiativePost.js - Firestore InitiativePost Model (Inherits from Post)
const Post = require('./Post');

class InitiativePost extends Post {
  constructor(data = {}) {
    super(data);
    
    // Ensure this is an Initiative post
    this.postType = 'Initiative';
    
    // Initiative-specific fields
    this.materials = data.materials || []; // Array of {itemName, materialID, kg}
    this.projectDeadline = data.projectDeadline || null;
    
    // Store initiative-specific data in typeSpecificData
    this.typeSpecificData = {
      materials: this.materials,
      projectDeadline: this.projectDeadline
    };
  }

  // Override validation to include initiative-specific validation
  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];
    
    if (!this.materials || this.materials.length === 0) {
      errors.push('At least one material is required for initiative posts');
    }
    
    // Validate each material
    this.materials.forEach((material, index) => {
      if (!material.itemName) errors.push(`Material ${index + 1}: Item name is required`);
      if (!material.materialID) errors.push(`Material ${index + 1}: Material ID is required`);
      if (typeof material.kg !== 'number' || material.kg <= 0) {
        errors.push(`Material ${index + 1}: Valid weight in kg is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Override toFirestore to include initiative-specific data
  toFirestore() {
    const baseData = super.toFirestore();
    return {
      ...baseData,
      materials: this.materials,
      projectDeadline: this.projectDeadline
    };
  }

  // Static methods for InitiativePost-specific operations
  static async create(initiativePostData) {
    const initiativePost = new InitiativePost(initiativePostData);
    
    const validation = initiativePost.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    return await Post.create(initiativePost.toFirestore());
  }

  static async findByMaterialNeeded(materialID) {
    try {
      const allInitiativePosts = await Post.findByType('Initiative');
      return allInitiativePosts.filter(post => 
        post.materials && post.materials.some(material => material.materialID === materialID)
      );
    } catch (error) {
      throw new Error(`Failed to find initiative posts by material: ${error.message}`);
    }
  }

  static async findByDeadline(startDate, endDate) {
    try {
      const allInitiativePosts = await Post.findByType('Initiative');
      return allInitiativePosts.filter(post => 
        post.projectDeadline && 
        post.projectDeadline >= startDate && 
        post.projectDeadline <= endDate
      );
    } catch (error) {
      throw new Error(`Failed to find initiative posts by deadline: ${error.message}`);
    }
  }

  static async findExpiredProjects() {
    try {
      const allInitiativePosts = await Post.findByType('Initiative');
      const now = new Date();
      return allInitiativePosts.filter(post => 
        post.projectDeadline && post.projectDeadline < now
      );
    } catch (error) {
      throw new Error(`Failed to find expired initiative posts: ${error.message}`);
    }
  }

  // Instance methods for initiative-specific operations
  
  // Add material requirement to initiative post
  async addMaterial(material) {
    if (!material.itemName || !material.materialID || typeof material.kg !== 'number') {
      throw new Error('Invalid material data');
    }
    
    this.materials.push(material);
    await this.update({ materials: this.materials });
  }

  // Update material requirement
  async updateMaterial(materialIndex, updatedMaterial) {
    if (materialIndex >= 0 && materialIndex < this.materials.length) {
      this.materials[materialIndex] = { ...this.materials[materialIndex], ...updatedMaterial };
      await this.update({ materials: this.materials });
    } else {
      throw new Error('Invalid material index');
    }
  }

  // Remove material requirement
  async removeMaterial(materialIndex) {
    if (materialIndex >= 0 && materialIndex < this.materials.length) {
      this.materials.splice(materialIndex, 1);
      await this.update({ materials: this.materials });
    } else {
      throw new Error('Invalid material index');
    }
  }

  // Calculate total materials needed
  getTotalMaterialsNeeded() {
    return this.materials.reduce((total, material) => total + (material.kg || 0), 0);
  }

  // Get unique material types needed
  getMaterialTypesNeeded() {
    return [...new Set(this.materials.map(material => material.materialID))];
  }

  // Check if initiative needs specific material
  needsMaterial(materialID) {
    return this.materials.some(material => material.materialID === materialID);
  }

  // Get materials needed by type
  getMaterialsByType(materialID) {
    return this.materials.filter(material => material.materialID === materialID);
  }

  // Check if project is expired
  isExpired() {
    if (!this.projectDeadline) return false;
    return new Date() > this.projectDeadline;
  }

  // Get days until deadline
  getDaysUntilDeadline() {
    if (!this.projectDeadline) return null;
    const now = new Date();
    const diffTime = this.projectDeadline - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Update project deadline
  async updateDeadline(newDeadline) {
    this.projectDeadline = newDeadline;
    await this.update({ projectDeadline: this.projectDeadline });
  }

  // Mark project as completed
  async markAsCompleted() {
    await this.update({ status: 'Collected' });
  }
}

module.exports = InitiativePost;