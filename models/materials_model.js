const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  materialID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  category: { 
    type: String, 
    required: true,
    enum: ['Recyclable'],
    default: 'Recyclable'
  },
  type: { 
    type: String, 
    required: true,
    unique: true,
    enum: [
      'pet_bottles', 
      'plastic_bottle_caps', 
      'hdpe_containers', 
      'plastic_bags_sachets', 
      'courier_bags', 
      'plastic_cups', 
      'microwavable_containers', 
      'used_beverage_cartons', 
      'aluminum_cans', 
      'boxes_cartons', 
      'paper'
    ]
  },
  averagePricePerKg: { 
    type: Number, 
    required: true,
    min: 0
  },
  pricingHistory: [{ 
    price: { type: Number, required: true },
    date: { type: Date, required: true }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  updatedAt: { 
    type: Date, 
    default: Date.now
  }
});

const Material = mongoose.model('materials', MaterialSchema);
module.exports = Material;