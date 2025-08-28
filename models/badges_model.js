const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  badgeID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  badgeName: { 
    type: String, 
    required: true,
    unique: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true
  },
  icon: { 
    type: String, 
    required: true
  },
  requirements: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true
  },
  isActive: { 
    type: Boolean, 
    required: true,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  updatedAt: { 
    type: Date, 
    default: Date.now
  }
});

const Badge = mongoose.model('badges', BadgeSchema);
module.exports = Badge;