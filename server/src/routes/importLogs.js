const express = require('express');
const router = express.Router();
const ImportLog = require('../models/ImportLog');
const logger = require('../utils/logger');

// @route   GET /api/import-logs
// @desc    Get import logs with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      logger.error('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
      return res.status(503).json({
        success: false,
        error: 'Database connection not available'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.sourceFeed) {
      filter.sourceFeed = req.query.sourceFeed;
    }
    
    if (req.query.sourceName) {
      filter.sourceName = { $regex: req.query.sourceName, $options: 'i' };
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.timestamp = { $lte: new Date(req.query.endDate) };
    }

    // Build sort object
    const sort = {};
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sort[req.query.sortBy] = sortOrder;
    } else {
      sort.timestamp = -1; // Default sort by timestamp descending
    }

    // Execute query
    const [importLogs, total] = await Promise.all([
      ImportLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('timestamp sourceName totalFetched totalImported newJobs updatedJobs failedJobs status duration')
        .lean(),
      ImportLog.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        importLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    });
  } catch (error) {
    logger.error('Error getting import logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import logs'
    });
  }
});



// @route   GET /api/import-logs/stats/overview
// @desc    Get import statistics overview
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      logger.error('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
      return res.status(503).json({
        success: false,
        error: 'Database connection not available'
      });
    }

    const days = parseInt(req.query.days) || 30;
    const stats = await ImportLog.getStats(days);
    
    res.json({
      success: true,
      data: {
        ...stats,
        period: `${days} days`
      }
    });
  } catch (error) {
    logger.error('Error getting import stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import statistics'
    });
  }
});









// @route   GET /api/import-logs/test
// @desc    Test database connection
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const connectionState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
      success: true,
      data: {
        mongodb: states[connectionState] || 'unknown',
        readyState: connectionState,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error testing database connection:', error);
    res.status(500).json({
      success: false,
      error: 'Database test failed'
    });
  }
});

module.exports = router; 