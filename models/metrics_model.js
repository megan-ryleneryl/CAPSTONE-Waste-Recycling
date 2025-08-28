const mongoose = require('mongoose');

const MetricSchema = new mongoose.Schema({
  metricID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  type: { 
    type: String, 
    required: true,
    enum: ['Daily_Recycling_Total', 'Weekly_Location_Activity', 'Monthly_Material_Trends']
  },
  location: { 
    type: String
  },
  materialType: { 
    type: String
  },
  value: { 
    type: Number, 
    required: true
  },
  periodStart: { 
    type: Date, 
    required: true
  },
  periodEnd: { 
    type: Date, 
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  }
});

const Metric = mongoose.model('metrics', MetricSchema);
module.exports = Metric;