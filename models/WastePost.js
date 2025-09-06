// WastePost.js - Firestore WastePost Model (Inherits from Post)
const Post = require('./Posts');

class WastePost extends Post {
  constructor(data = {}) {
    super(data);
    
    // Ensure this is a Waste post
    this.postType = 'Waste';
    
    // Waste-specific fields
    this.items = data.items || []; // Array of {itemName, materialID, sellingPrice, kg}
    
    // Store waste-specific data in typeSpecificData
    this.typeSpecificData = {
      items: this.items
    };
  }

  // Override validation to include waste-specific validation
  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];
    
    if (!this.items || this.items.length === 0) {
      errors.push('At least one item is required for waste posts');
    }
    
    // Validate each item
    this.items.forEach((item, index) => {
      if (!item.itemName) errors.push(`Item ${index + 1}: Item name is required`);
      if (!item.materialID) errors.push(`Item ${index + 1}: Material ID is required`);
      if (typeof item.sellingPrice !== 'number' || item.sellingPrice < 0) {
        errors.push(`Item ${index + 1}: Valid selling price is required`);
      }
      if (typeof item.kg !== 'number' || item.kg <= 0) {
        errors.push(`Item ${index + 1}: Valid weight in kg is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Override toFirestore to include waste-specific data
  toFirestore() {
    const baseData = super.toFirestore();
    return {
      ...baseData,
      items: this.items
    };
  }

  // Static methods for WastePost-specific operations
  static async create(wastePostData) {
    const wastePost = new WastePost(wastePostData);
    
    const validation = wastePost.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    return await Post.create(wastePost.toFirestore());
  }

  static async findByMaterialType(materialID) {
    try {
      const allWastePosts = await Post.findByType('Waste');
      return allWastePosts.filter(post => 
        post.items && post.items.some(item => item.materialID === materialID)
      );
    } catch (error) {
      throw new Error(`Failed to find waste posts by material type: ${error.message}`);
    }
  }

  static async findByPriceRange(minPrice, maxPrice) {
    try {
      const allWastePosts = await Post.findByType('Waste');
      return allWastePosts.filter(post => 
        post.items && post.items.some(item => 
          item.sellingPrice >= minPrice && item.sellingPrice <= maxPrice
        )
      );
    } catch (error) {
      throw new Error(`Failed to find waste posts by price range: ${error.message}`);
    }
  }

  // Instance methods for waste-specific operations
  
  // Add item to waste post
  async addItem(item) {
    if (!item.itemName || !item.materialID || typeof item.sellingPrice !== 'number' || typeof item.kg !== 'number') {
      throw new Error('Invalid item data');
    }
    
    this.items.push(item);
    await this.update({ items: this.items });
  }

  // Calculate total weight of all items
  getTotalWeight() {
    return this.items.reduce((total, item) => total + (item.kg || 0), 0);
  }

  // Calculate total estimated value
  getTotalValue() {
    return this.items.reduce((total, item) => total + ((item.sellingPrice || 0) * (item.kg || 0)), 0);
  }

  // Get unique material types in this post
  getMaterialTypes() {
    return [...new Set(this.items.map(item => item.materialID))];
  }

  // Check if post contains specific material
  hasMaterial(materialID) {
    return this.items.some(item => item.materialID === materialID);
  }
}

module.exports = WastePost;