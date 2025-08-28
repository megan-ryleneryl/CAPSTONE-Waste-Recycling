const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  applicationID: { 
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
  applicationType: { 
    type: String, 
    required: true,
    enum: ['Account_Verification', 'Org_Verification', 'Collector_Privilege']
  },
  justification: { 
    type: String
  },
  documents: [{ 
    type: String
  }],
  status: { 
    type: String, 
    required: true,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  reviewedBy: { 
    type: String,
    ref: 'users'
  },
  submittedAt: { 
    type: Date, 
    default: Date.now
  },
  reviewedAt: { 
    type: Date
  }
});

const Application = mongoose.model('applications', ApplicationSchema);
module.exports = Application;