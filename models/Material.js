// Material.js - Firestore Material Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Material {
  constructor(data = {}) {
    this.materialID = data.materialID || uuidv4();
    this.category = data.category || 'Recyclable';
    this.type = data.type || '';
    this.displayName = data.displayName || data.type || '';
    this.averagePricePerKg = data.averagePricePerKg || 0;
    this.standardMarketPrice = data.standardMarketPrice || 0; // Standard market price (1/4-1/5 of junk shop)
    this.maxPricePerKg = data.maxPricePerKg || 0; // Price cap per material (factory price)
    this.pricingHistory = data.pricingHistory || []; // Array of {price, date}
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation
  validate() {
    const validTypes = [
      'cartons_corrugated', 'white_paper_used', 'newspaper', 'mixed_paper',
      'pet_bottles', 'plastic_hdpe', 'plastic_ldpe',
      'glass_bottles', 'glass_cullets',
      'aluminum_cans', 'copper_wire_a', 'copper_wire_b', 'copper_wire_c',
      'gi_sheet', 'stainless_steel', 'steel', 'tin_can',
      'electronic_waste'
    ];
    
    const errors = [];
    if (!this.type || !validTypes.includes(this.type)) {
      errors.push('Valid material type is required');
    }
    if (typeof this.averagePricePerKg !== 'number' || this.averagePricePerKg < 0) {
      errors.push('Valid average price per kg is required');
    }
    if (typeof this.maxPricePerKg !== 'number' || this.maxPricePerKg < 0) {
      errors.push('Valid max price per kg is required');
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
      displayName: this.displayName,
      averagePricePerKg: this.averagePricePerKg,
      standardMarketPrice: this.standardMarketPrice,
      maxPricePerKg: this.maxPricePerKg,
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
  // Enforces maxPricePerKg cap if set
  async updatePrice(newPrice) {
    // Enforce price cap if maxPricePerKg is set
    if (this.maxPricePerKg > 0 && newPrice > this.maxPricePerKg) {
      throw new Error(
        `Price ₱${newPrice}/kg exceeds the cap of ₱${this.maxPricePerKg}/kg for ${this.displayName || this.type}`
      );
    }

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
      maxPricePerKg: this.maxPricePerKg,
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

  // Helper: convert a Firestore Timestamp or date-like value to a JS Date
  static _toDate(val) {
    if (!val) return null;
    // Firestore Timestamp object (has toDate method)
    if (typeof val.toDate === 'function') return val.toDate();
    // Firestore Timestamp with _seconds (serialized)
    if (val._seconds != null) return new Date(val._seconds * 1000);
    // Already a Date
    if (val instanceof Date) return val;
    // ISO string or epoch number
    return new Date(val);
  }

  // Get quantity-weighted market average from community transaction data
  // Excludes 0-price entries; weights by quantity so larger transactions count more
  getMarketAverage(days = 180) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentEntries = this.pricingHistory.filter(entry => {
      if (!entry.price || entry.price <= 0) return false;
      const entryDate = Material._toDate(entry.date);
      return entryDate && entryDate >= cutoffDate;
    });

    if (recentEntries.length === 0) return null; // No market data available

    let totalWeightedPrice = 0;
    let totalQuantity = 0;

    for (const entry of recentEntries) {
      const qty = parseFloat(entry.quantity) || 1; // Default to 1 if no quantity
      totalWeightedPrice += entry.price * qty;
      totalQuantity += qty;
    }

    if (totalQuantity === 0) return null;

    return totalWeightedPrice / totalQuantity;
  }

  // Get the display price shown to users
  // Formula: (base value × 70%) + (market average × 30%)
  // base = standardMarketPrice (falls back to averagePricePerKg if not set)
  // market = quantity-weighted community average from transactions
  // If no market data, falls back to base value only
  getDisplayPrice(days = 180) {
    const BASE_WEIGHT = 0.7;
    const MARKET_WEIGHT = 0.3;

    // Use standardMarketPrice as base; fall back to averagePricePerKg
    const basePrice = this.standardMarketPrice > 0
      ? this.standardMarketPrice
      : this.averagePricePerKg;
    const marketAvg = this.getMarketAverage(days);

    // No market data — just use the base value
    if (marketAvg === null) return basePrice;

    return (basePrice * BASE_WEIGHT) + (marketAvg * MARKET_WEIGHT);
  }

  // Get average price over time period (kept for backward compatibility)
  // Now uses the weighted display price formula
  getAveragePriceInPeriod(days = 180) {
    return this.getDisplayPrice(days);
  }

  // Get price change percentage
  getPriceChangePercentage(days = 180) {
    const displayPrice = this.getDisplayPrice(days);
    const basePrice = this.standardMarketPrice > 0
      ? this.standardMarketPrice
      : this.averagePricePerKg;
    
    if (basePrice === 0) return 0;
    return ((displayPrice - basePrice) / basePrice) * 100;
  }

  // Get computed pricing info (useful for API responses)
  getPricingInfo() {
    const marketAvg = this.getMarketAverage(180);
    return {
      averagePricePerKg: this.averagePricePerKg,
      standardMarketPrice: this.standardMarketPrice,
      maxPricePerKg: this.maxPricePerKg,
      displayPrice: parseFloat(this.getDisplayPrice(180).toFixed(2)),
      marketAverage: marketAvg !== null ? parseFloat(marketAvg.toFixed(2)) : null,
      trend: this.getPriceTrend(),
      changePercent: parseFloat(this.getPriceChangePercentage(180).toFixed(2))
    };
  }
}

module.exports = Material;