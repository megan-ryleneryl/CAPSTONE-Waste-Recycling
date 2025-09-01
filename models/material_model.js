// Material.js - Firestore Material Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Material {
  constructor(data = {}) {
    this.materialID = data.materialID || uuidv4();
    this.category = data.category || 'Recyclable';
    this.type = data.type || '';
    this.averagePricePerKg = data.averagePricePerKg || 0;
    this.pricingHistory = data.pricingHistory || []; // Array of {price, date}
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation
  validate() {
    const validTypes = [
      'pet_bottles', 'plastic_bottle_caps', 'hdpe_containers', 
      'plastic_bags_sachets', 'courier_bags', 'plastic_cups', 
      'microwavable_containers', 'used_beverage_cartons', 
      'aluminum_cans', 'boxes_cartons', 'paper'
    ];
    
    const errors = [];
    if (!this.type || !validTypes.includes(this.type)) {
      errors.push('Valid material type is required');
    }
    if (typeof this.averagePricePerKg !== 'number' || this.averagePricePerKg < 0) {
      errors.push('Valid average price per kg is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      materialID: this.materialID,
      category: this.category,
      type: this.type,
      averagePricePerKg: this.averagePricePerKg,
      pricingHistory: this.pricingHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(materialData) {
    const db = getFirestore();
    const material = new Material(materialData);
    
    const validation = material.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const materialRef = doc(db, 'materials', material.materialID);
      await setDoc(materialRef, material.toFirestore());
      return material;
    } catch (error) {
      throw new Error(`Failed to create material: ${error.message}`);
    }
  }

  static async findById(materialID) {
    const db = getFirestore();
    try {
      const materialRef = doc(db, 'materials', materialID);
      const materialSnap = await getDoc(materialRef);
      
      if (materialSnap.exists()) {
        return new Material(materialSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find material: ${error.message}`);
    }
  }

  static async findByType(type) {
    const db = getFirestore();
    try {
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('type', '==', type));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const materialDoc = querySnapshot.docs[0];
        return new Material(materialDoc.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find material by type: ${error.message}`);
    }
  }

  static async findByCategory(category) {
    const db = getFirestore();
    try {
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('category', '==', category));
      const querySnapshot = await getDocs(q);
      
      const materials = [];
      querySnapshot.forEach((doc) => {
        materials.push(new Material(doc.data()));
      });
      
      return materials;
    } catch (error) {
      throw new Error(`Failed to find materials by category: ${error.message}`);
    }
  }

  static async getAllMaterials() {
    const db = getFirestore();
    try {
      const materialsRef = collection(db, 'materials');
      const querySnapshot = await getDocs(materialsRef);
      
      const materials = [];
      querySnapshot.forEach((doc) => {
        materials.push(new Material(doc.data()));
      });
      
      return materials;
    } catch (error) {
      throw new Error(`Failed to get all materials: ${error.message}`);
    }
  }

  static async update(materialID, updateData) {
    const db = getFirestore();
    try {
      updateData.updatedAt = new Date();
      const materialRef = doc(db, 'materials', materialID);
      await updateDoc(materialRef, updateData);
      
      return await Material.findById(materialID);
    } catch (error) {
      throw new Error(`Failed to update material: ${error.message}`);
    }
  }

  static async delete(materialID) {
    const db = getFirestore();
    try {
      const materialRef = doc(db, 'materials', materialID);
      await deleteDoc(materialRef);
      return { success: true, message: 'Material deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete material: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Material.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Material.update(this.materialID, updateData);
  }

  async delete() {
    return await Material.delete(this.materialID);
  }

  // Update material price and add to history
  async updatePrice(newPrice) {
    // Add current price to history before updating
    this.pricingHistory.push({
      price: this.averagePricePerKg,
      date: new Date()
    });
    
    // Update current price
    this.averagePricePerKg = newPrice;
    this.updatedAt = new Date();
    
    await this.update({
      averagePricePerKg: this.averagePricePerKg,
      pricingHistory: this.pricingHistory,
      updatedAt: this.updatedAt
    });
  }

  // Get price trend (increasing, decreasing, stable)
  getPriceTrend() {
    if (this.pricingHistory.length < 2) return 'insufficient_data';
    
    const lastTwo = this.pricingHistory.slice(-2);
    const oldPrice = lastTwo[0].price;
    const newPrice = lastTwo[1].price;
    
    if (newPrice > oldPrice) return 'increasing';
    if (newPrice < oldPrice) return 'decreasing';
    return 'stable';
  }

  // Get average price over time period
  getAveragePriceInPeriod(days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentPrices = this.pricingHistory.filter(entry => entry.date >= cutoffDate);
    
    if (recentPrices.length === 0) return this.averagePricePerKg;
    
    const sum = recentPrices.reduce((total, entry) => total + entry.price, 0);
    return sum / recentPrices.length;
  }

  // Get price change percentage
  getPriceChangePercentage(days = 30) {
    const oldAverage = this.getAveragePriceInPeriod(days);
    const currentPrice = this.averagePricePerKg;
    
    if (oldAverage === 0) return 0;
    return ((currentPrice - oldAverage) / oldAverage) * 100;
  }
}

module.exports = Material;