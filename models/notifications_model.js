const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  notificationID: { 
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
  type: { 
    type: String, 
    required: true,
    enum: ['Pickup', 'Application', 'Message', 'Comment', 'Badge', 'Alert']
  },
  title: { 
    type: String, 
    required: true
  },
  message: { 
    type: String, 
    required: true
  },
  referenceID: { 
    type: String
  },
  isRead: { 
    type: Boolean, 
    required: true,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  }
});

const Notification = mongoose.model('notifications', NotificationSchema);
module.exports = Notification;