const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
  pointID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  userID: { 
    type: String, 
    required: true,
    ref: 'users'
  },
  pointsEarned: { 
    type: Number, 
    required: true
  },
  transaction: { 
    type: String, 
    required: true,
    enum: ['Post_Creation', 'Post_Interaction', 'Pickup_Completion', 'Initiative_Support']
  },
  receivedAt: { 
    type: Date, 
    default: Date.now
  }
});

const Point = mongoose.model('points', PointSchema);
module.exports = Point;