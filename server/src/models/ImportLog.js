const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
  // Import start timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Source feed URL
  sourceFeed: {
    type: String,
    required: true,
    index: true
  },
  
  // Source feed name
  sourceName: {
    type: String,
    required: true
  },
  
  // Total jobs fetched from the feed
  totalFetched: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Total jobs successfully processed
  totalImported: {
    type: Number,
    required: true,
    default: 0
  },
  
  // New jobs inserted
  newJobs: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Existing jobs updated
  updatedJobs: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Failed jobs with reasons
  failedJobs: [{
    guid: String,
    title: String,
    reason: String,
    error: String
  }],
  
  // Import duration in milliseconds
  duration: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Import status
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'partial'],
    default: 'running',
    index: true
  },
  
  // Error message if import failed
  error: {
    type: String
  },
  
  // Queue job ID
  queueJobId: {
    type: String
  },
  
  // Worker process ID
  workerId: {
    type: String
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
importLogSchema.index({ timestamp: -1 });
importLogSchema.index({ sourceFeed: 1, timestamp: -1 });
importLogSchema.index({ status: 1, timestamp: -1 });

// Virtual for success rate
importLogSchema.virtual('successRate').get(function() {
  if (this.totalFetched === 0) return 0;
  return Math.round((this.totalImported / this.totalFetched) * 100);
});

// Virtual for failure count
importLogSchema.virtual('failedCount').get(function() {
  return this.failedJobs ? this.failedJobs.length : 0;
});

// Virtual for formatted duration
importLogSchema.virtual('formattedDuration').get(function() {
  if (this.duration < 1000) return `${this.duration}ms`;
  if (this.duration < 60000) return `${(this.duration / 1000).toFixed(2)}s`;
  return `${(this.duration / 60000).toFixed(2)}m`;
});

// Static method to get import statistics
importLogSchema.statics.getStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalImports: { $sum: 1 },
        totalJobsFetched: { $sum: '$totalFetched' },
        totalJobsImported: { $sum: '$totalImported' },
        totalNewJobs: { $sum: '$newJobs' },
        totalUpdatedJobs: { $sum: '$updatedJobs' },
        totalFailedJobs: { $sum: { $size: '$failedJobs' } },
        avgDuration: { $avg: '$duration' },
        successfulImports: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedImports: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalImports: 0,
    totalJobsFetched: 0,
    totalJobsImported: 0,
    totalNewJobs: 0,
    totalUpdatedJobs: 0,
    totalFailedJobs: 0,
    avgDuration: 0,
    successfulImports: 0,
    failedImports: 0
  };
};



module.exports = mongoose.model('ImportLog', importLogSchema); 