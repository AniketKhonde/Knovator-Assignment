const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const logger = require('../utils/logger');

// @route   GET /api/jobs
// @desc    Get all jobs with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      location,
      company,
      type,
      remote,
      experience,
      category,
      minSalary,
      maxSalary,
      sortBy = 'publishedDate',
      sortOrder = 'desc'
    } = req.query;

    // Build search query
    let searchQuery = { status: 'active' };
    
    // Text search
    if (search) {
      searchQuery.$text = { $search: search };
    }
    
    // Apply filters
    if (location) {
      searchQuery.location = { $regex: location, $options: 'i' };
    }
    
    if (company) {
      searchQuery.company = { $regex: company, $options: 'i' };
    }
    
    if (type) {
      searchQuery.type = type;
    }
    
    if (remote) {
      searchQuery.remote = remote;
    }
    
    if (experience) {
      searchQuery['requirements.experience'] = experience;
    }
    
    if (category) {
      searchQuery.category = { $regex: category, $options: 'i' };
    }
    
    if (minSalary) {
      searchQuery['salary.max'] = { $gte: parseInt(minSalary) };
    }
    
    if (maxSalary) {
      searchQuery['salary.min'] = { $lte: parseInt(maxSalary) };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(searchQuery)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments(searchQuery)
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

// @route   GET /api/jobs/stats
// @desc    Get job statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await Job.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching job stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job statistics'
    });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get a specific job by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Increment view count
    job.views += 1;
    await job.save();
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    logger.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job'
    });
  }
});

// @route   GET /api/jobs/company/:company
// @desc    Get jobs by company
// @access  Public
router.get('/company/:company', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [jobs, total] = await Promise.all([
      Job.find({ 
        company: { $regex: req.params.company, $options: 'i' },
        status: 'active'
      })
        .sort({ publishedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments({ 
        company: { $regex: req.params.company, $options: 'i' },
        status: 'active'
      })
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching company jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company jobs'
    });
  }
});

// @route   GET /api/jobs/location/:location
// @desc    Get jobs by location
// @access  Public
router.get('/location/:location', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [jobs, total] = await Promise.all([
      Job.find({ 
        location: { $regex: req.params.location, $options: 'i' },
        status: 'active'
      })
        .sort({ publishedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments({ 
        location: { $regex: req.params.location, $options: 'i' },
        status: 'active'
      })
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching location jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch location jobs'
    });
  }
});

// @route   GET /api/jobs/category/:category
// @desc    Get jobs by category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [jobs, total] = await Promise.all([
      Job.find({ 
        category: { $regex: req.params.category, $options: 'i' },
        status: 'active'
      })
        .sort({ publishedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments({ 
        category: { $regex: req.params.category, $options: 'i' },
        status: 'active'
      })
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching category jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category jobs'
    });
  }
});

// @route   GET /api/jobs/remote/all
// @desc    Get all remote jobs
// @access  Public
router.get('/remote/all', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [jobs, total] = await Promise.all([
      Job.find({ 
        remote: { $in: ['remote', 'hybrid'] },
        status: 'active'
      })
        .sort({ publishedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments({ 
        remote: { $in: ['remote', 'hybrid'] },
        status: 'active'
      })
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching remote jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch remote jobs'
    });
  }
});

// @route   GET /api/jobs/filters/options
// @desc    Get filter options (companies, locations, categories)
// @access  Public
router.get('/filters/options', async (req, res) => {
  try {
    const [companies, locations, categories] = await Promise.all([
      Job.distinct('company', { status: 'active' }),
      Job.distinct('location', { status: 'active' }),
      Job.distinct('category', { status: 'active' })
    ]);

    res.json({
      success: true,
      data: {
        companies: companies.filter(Boolean).sort(),
        locations: locations.filter(Boolean).sort(),
        categories: categories.filter(Boolean).sort()
      }
    });
  } catch (error) {
    logger.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options'
    });
  }
});

// @route   POST /api/jobs/:id/apply
// @desc    Track job application (increment application count)
// @access  Public
router.post('/:id/apply', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    job.applications += 1;
    await job.save();
    
    res.json({
      success: true,
      message: 'Application tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track application'
    });
  }
});

module.exports = router; 