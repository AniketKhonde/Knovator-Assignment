const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Basic job information
  title: {
    type: String,
    required: true,
    index: true
  },
  
  company: {
    type: String,
    required: true,
    index: true
  },
  
  location: {
    type: String,
    index: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  // Job details
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  
  // Job requirements
  requirements: {
    experience: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
      index: true
    },
    education: String,
    skills: [String],
    certifications: [String]
  },
  
  // Job type and category
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    default: 'full-time',
    index: true
  },
  
  category: {
    type: String,
    index: true
  },
  
  industry: {
    type: String,
    index: true
  },
  
  // Remote work information
  remote: {
    type: String,
    enum: ['on-site', 'remote', 'hybrid'],
    default: 'on-site',
    index: true
  },
  
  // Application information
  applicationUrl: String,
  applicationEmail: String,
  
  // Source information
  sourceFeed: {
    type: String,
    required: true,
    index: true
  },
  
  sourceName: {
    type: String,
    required: true,
    index: true
  },
  
  originalGuid: {
    type: String,
    index: true
  },
  
  // Metadata
  publishedDate: {
    type: Date,
    index: true
  },
  
  expiryDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'filled', 'inactive'],
    default: 'active',
    index: true
  },
  
  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },
  
  applications: {
    type: Number,
    default: 0
  },
  
  // SEO and search
  keywords: [String],
  tags: [String],
  
  // Additional data from feed
  rawData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ publishedDate: -1 });
jobSchema.index({ location: 1, type: 1 });
jobSchema.index({ company: 1, createdAt: -1 });
jobSchema.index({ category: 1, industry: 1 });

// Virtual for salary range display
jobSchema.virtual('salaryRange').get(function() {
  if (!this.salary.min && !this.salary.max) return 'Not specified';
  
  const formatSalary = (amount) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };
  
  if (this.salary.min && this.salary.max) {
    return `${formatSalary(this.salary.min)} - ${formatSalary(this.salary.max)} ${this.salary.currency}/${this.salary.period}`;
  } else if (this.salary.min) {
    return `${formatSalary(this.salary.min)}+ ${this.salary.currency}/${this.salary.period}`;
  } else if (this.salary.max) {
    return `Up to ${formatSalary(this.salary.max)} ${this.salary.currency}/${this.salary.period}`;
  }
  
  return 'Not specified';
});

// Virtual for job age
jobSchema.virtual('age').get(function() {
  const now = new Date();
  const published = this.publishedDate || this.createdAt;
  const diffTime = Math.abs(now - published);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
});

// Virtual for isRemote
jobSchema.virtual('isRemote').get(function() {
  return this.remote === 'remote' || this.remote === 'hybrid';
});

// Static method to get job statistics
jobSchema.statics.getStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          activeJobs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          remoteJobs: { $sum: { $cond: [{ $in: ['$remote', ['remote', 'hybrid']] }, 1, 0] } },
          avgSalary: { $avg: '$salary.max' },
          companies: { $addToSet: '$company' },
          categories: { $addToSet: '$category' },
          locations: { $addToSet: '$location' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalJobs: 0,
      activeJobs: 0,
      remoteJobs: 0,
      avgSalary: 0,
      companies: [],
      categories: [],
      locations: []
    };
    
    return {
      ...result,
      uniqueCompanies: result.companies.length,
      uniqueCategories: result.categories.length,
      uniqueLocations: result.locations.length
    };
  } catch (error) {
    console.error('Error in getStats:', error);
    return {
      totalJobs: 0,
      activeJobs: 0,
      remoteJobs: 0,
      avgSalary: 0,
      uniqueCompanies: 0,
      uniqueCategories: 0,
      uniqueLocations: 0
    };
  }
};

// Static method to search jobs
jobSchema.statics.searchJobs = async function(query, filters = {}, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    // Build search query
    let searchQuery = { status: 'active' };
    
    // Text search
    if (query) {
      searchQuery.$text = { $search: query };
    }
    
    // Apply filters
    if (filters.location) {
      searchQuery.location = { $regex: filters.location, $options: 'i' };
    }
    
    if (filters.company) {
      searchQuery.company = { $regex: filters.company, $options: 'i' };
    }
    
    if (filters.type) {
      searchQuery.type = filters.type;
    }
    
    if (filters.remote) {
      searchQuery.remote = filters.remote;
    }
    
    if (filters.experience) {
      searchQuery['requirements.experience'] = filters.experience;
    }
    
    if (filters.category) {
      searchQuery.category = filters.category;
    }
    
    if (filters.minSalary) {
      searchQuery['salary.max'] = { $gte: parseInt(filters.minSalary) };
    }
    
    if (filters.maxSalary) {
      searchQuery['salary.min'] = { $lte: parseInt(filters.maxSalary) };
    }
    
    // Execute query
    const [jobs, total] = await Promise.all([
      this.find(searchQuery)
        .sort({ publishedDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments(searchQuery)
    ]);
    
    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error in searchJobs:', error);
    throw error;
  }
};

module.exports = mongoose.model('Job', jobSchema); 