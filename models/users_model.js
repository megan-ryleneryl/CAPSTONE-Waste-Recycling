const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  firstName: { 
    type: String, 
    required: true,
    maxlength: 100
  },
  lastName: { 
    type: String, 
    required: true,
    maxlength: 100
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  phone: { 
    type: String, 
    maxlength: 20
  },
  passwordHash: { 
    type: String, 
    required: true
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending'
  },
  userType: { 
    type: String, 
    required: true,
    enum: ['Giver', 'Collector', 'Admin']
  },
  isOrganization: { 
    type: Boolean, 
    required: true,
    default: false
  },
  organizationName: { 
    type: String
  },
  preferredTimes: [{ 
    type: mongoose.Schema.Types.Mixed
  }],
  preferredLocations: [{ 
    type: mongoose.Schema.Types.Mixed
  }],
  points: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0
  },
  badges: [{ 
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, required: true }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now
  }
});

const User = mongoose.model('users', UserSchema);
module.exports = User;