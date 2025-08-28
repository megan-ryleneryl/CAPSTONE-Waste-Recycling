const mongoose = require('mongoose');

const PickupSchema = new mongoose.Schema({
  pickupID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  postID: { 
    type: String, 
    required: true,
    ref: 'posts'
  },
  giverID: { 
    type: String, 
    required: true,
    ref: 'users'
  },
  collectorID: { 
    type: String, 
    required: true,
    ref: 'users'
  },
  pickupTime: { 
    type: Date, 
    required: true
  },
  pickupLocation: { 
    type: String, 
    required: true,
    maxlength: 255
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Proposed', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Proposed'
  },
  finalWaste: { 
    itemName: { type: String },
    materialIDs: [{ type: String }],
    price: { type: Number },
    kg: { type: Number }
  },
  proofOfPickup: { 
    type: String
  },
  proposedAt: { 
    type: Date, 
    default: Date.now
  },
  confirmedAt: { 
    type: Date
  },
  completedAt: { 
    type: Date
  },
  cancelledAt: { 
    type: Date
  }
});

const Pickup = mongoose.model('pickups', PickupSchema);
module.exports = Pickup;