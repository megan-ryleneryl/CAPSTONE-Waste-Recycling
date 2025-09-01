// Metric.js - Firestore Metric Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Metric {
  constructor(data = {}) {
    this.metricID = data.metricID || uuidv4();
    this.type = data.type || ''; // Daily_Recycling_Total, Weekly_Location_Activity, Monthly_Material_Trends
    this.location = data.location || null;
    this.materialType = data.materialType || null;
    this.value = data.value || 0;
    this.periodStart = data.periodStart || null;
    this.periodEnd = data.periodEnd || null;
    this.createdAt = data.createdAt || new Date();
    this.metadata = data.metadata || {}; // Additional metric-specific data
  }

  // Validation
  validate() {
    const validTypes = ['Daily_Recycling_Total', 'Weekly_Location_Activity', 'Monthly_Material_Trends'];
    const errors = [];
    
    if (!this.type || !validTypes.includes(this.type)) {
      errors.push('Valid metric type is required');
    }
    if (typeof this.value !== 'number') {
      errors.push('Metric value must be a number');
    }
    if (!this.periodStart) {
      errors.push('Period start date is required');
    }
    if (!this.periodEnd) {
      errors.push('Period end date is required');
    }
    if (this.periodStart >= this.periodEnd) {
      errors.push('Period start must be before period end');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      metricID: this.metricID,
      type: this.type,
      location: this.location,
      materialType: this.materialType,
      value: this.value,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      createdAt: this.createdAt,
      metadata: this.metadata
    };
  }

  // Static methods for database operations
  static async create(metricData) {
    const db = getFirestore();
    const metric = new Metric(metricData);
    
    const validation = metric.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const metricRef = doc(db, 'metrics', metric.metricID);
      await setDoc(metricRef, metric.toFirestore());
      return metric;
    } catch (error) {
      throw new Error(`Failed to create metric: ${error.message}`);
    }
  }

  static async findById(metricID) {
    const db = getFirestore();
    try {
      const metricRef = doc(db, 'metrics', metricID);
      const metricSnap = await getDoc(metricRef);
      
      if (metricSnap.exists()) {
        return new Metric(metricSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find metric: ${error.message}`);
    }
  }

  static async findByType(type) {
    const db = getFirestore();
    try {
      const metricsRef = collection(db, 'metrics');
      const q = query(metricsRef, where('type', '==', type), orderBy('periodStart', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const metrics = [];
      querySnapshot.forEach((doc) => {
        metrics.push(new Metric(doc.data()));
      });
      
      return metrics;
    } catch (error) {
      throw new Error(`Failed to find metrics by type: ${error.message}`);
    }
  }

  static async findByLocation(location) {
    const db = getFirestore();
    try {
      const metricsRef = collection(db, 'metrics');
      const q = query(metricsRef, where('location', '==', location), orderBy('periodStart', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const metrics = [];
      querySnapshot.forEach((doc) => {
        metrics.push(new Metric(doc.data()));
      });
      
      return metrics;
    } catch (error) {
      throw new Error(`Failed to find metrics by location: ${error.message}`);
    }
  }

  static async findByMaterialType(materialType) {
    const db = getFirestore();
    try {
      const metricsRef = collection(db, 'metrics');
      const q = query(metricsRef, where('materialType', '==', materialType), orderBy('periodStart', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const metrics = [];
      querySnapshot.forEach((doc) => {
        metrics.push(new Metric(doc.data()));
      });
      
      return metrics;
    } catch (error) {
      throw new Error(`Failed to find metrics by material type: ${error.message}`);
    }
  }

  static async findByPeriod(startDate, endDate) {
    const db = getFirestore();
    try {
      const metricsRef = collection(db, 'metrics');
      const q = query(metricsRef, 
        where('periodStart', '>=', startDate),
        where('periodEnd', '<=', endDate),
        orderBy('periodStart', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const metrics = [];
      querySnapshot.forEach((doc) => {
        metrics.push(new Metric(doc.data()));
      });
      
      return metrics;
    } catch (error) {
      throw new Error(`Failed to find metrics by period: ${error.message}`);
    }
  }

  static async update(metricID, updateData) {
    const db = getFirestore();
    try {
      const metricRef = doc(db, 'metrics', metricID);
      await updateDoc(metricRef, updateData);
      
      return await Metric.findById(metricID);
    } catch (error) {
      throw new Error(`Failed to update metric: ${error.message}`);
    }
  }

  static async delete(metricID) {
    const db = getFirestore();
    try {
      const metricRef = doc(db, 'metrics', metricID);
      await deleteDoc(metricRef);
      return { success: true, message: 'Metric deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete metric: ${error.message}`);
    }
  }

  // Generate daily recycling metrics
  static async generateDailyRecyclingTotal(date, location = null) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get completed pickups for the day
      const Pickup = require('./Pickup');
      const db = getFirestore();
      const pickupsRef = collection(db, 'pickups');
      
      let q = query(pickupsRef,
        where('status', '==', 'Completed'),
        where('completedAt', '>=', startOfDay),
        where('completedAt', '<=', endOfDay)
      );

      if (location) {
        q = query(q, where('pickupLocation', '==', location));
      }

      const querySnapshot = await getDocs(q);
      
      let totalWeight = 0;
      let totalValue = 0;
      let pickupCount = 0;

      querySnapshot.forEach((doc) => {
        const pickup = doc.data();
        pickupCount++;
        
        if (pickup.finalWaste) {
          totalWeight += pickup.finalWaste.kg || 0;
          totalValue += pickup.finalWaste.price || 0;
        }
      });

      const metric = await Metric.create({
        type: 'Daily_Recycling_Total',
        location: location,
        value: totalWeight,
        periodStart: startOfDay,
        periodEnd: endOfDay,
        metadata: {
          totalValue: totalValue,
          pickupCount: pickupCount,
          averageValuePerKg: totalWeight > 0 ? totalValue / totalWeight : 0
        }
      });

      return metric;
    } catch (error) {
      throw new Error(`Failed to generate daily recycling total: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Metric.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Metric.update(this.metricID, updateData);
  }

  async delete() {
    return await Metric.delete(this.metricID);
  }

  // Get period duration in days
  getPeriodDuration() {
    if (!this.periodStart || !this.periodEnd) return 0;
    const diffTime = this.periodEnd - this.periodStart;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Get average value per day for this period
  getAveragePerDay() {
    const duration = this.getPeriodDuration();
    return duration > 0 ? this.value / duration : 0;
  }

  // Check if metric is recent (within last 7 days)
  isRecent() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.createdAt > sevenDaysAgo;
  }

  // Get period description
  getPeriodDescription() {
    const start = this.periodStart.toLocaleDateString();
    const end = this.periodEnd.toLocaleDateString();
    
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  }

  // Get metric type in human readable format
  getTypeDescription() {
    const descriptions = {
      'Daily_Recycling_Total': 'Daily Recycling Total',
      'Weekly_Location_Activity': 'Weekly Location Activity',
      'Monthly_Material_Trends': 'Monthly Material Trends'
    };
    
    return descriptions[this.type] || this.type;
  }

  // Format value based on metric type
  getFormattedValue() {
    switch (this.type) {
      case 'Daily_Recycling_Total':
      case 'Monthly_Material_Trends':
        return `${this.value.toFixed(2)} kg`;
      case 'Weekly_Location_Activity':
        return `${this.value} activities`;
      default:
        return this.value.toString();
    }
  }
}

module.exports = Metric;