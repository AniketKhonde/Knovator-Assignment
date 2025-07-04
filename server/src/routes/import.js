const express = require('express');
const router = express.Router();
const importService = require('../services/importService');
const cronService = require('../services/cronService');
const socketService = require('../services/socketService');
const ImportLog = require('../models/ImportLog');
const logger = require('../utils/logger');

// @route   GET /api/import/status
// @desc    Get current import status
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const status = importService.getImportStatus();
    const cronStatus = cronService.getStatus();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Status request timed out after 10 seconds')), 10000);
    });
    
    const statsPromise = Promise.all([
      importService.getQueueStats(),
      importService.getProcessingStats()
    ]);
    
    const [queueStats, processingStats] = await Promise.race([statsPromise, timeoutPromise]);
    
    res.json({
      success: true,
      data: {
        import: status,
        cron: cronStatus,
        queue: queueStats,
        processing: processingStats
      }
    });
  } catch (error) {
    logger.error('Error getting import status:', error);
    
    // Return basic status without queue stats if there's an error
    const status = importService.getImportStatus();
    const cronStatus = cronService.getStatus();
    
    res.json({
      success: true,
      data: {
        import: status,
        cron: cronStatus,
        queue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0
        },
        processing: {
          totalJobs: 0,
          processedJobs: 0,
          failedJobs: 0
        }
      }
    });
  }
});



// @route   GET /api/import/cron/status
// @desc    Get cron service status
// @access  Public
router.get('/cron/status', (req, res) => {
  try {
    const cronStatus = cronService.getStatus();
    
    res.json({
      success: true,
      data: cronStatus
    });
  } catch (error) {
    logger.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cron status'
    });
  }
});

// @route   POST /api/import/cron/restart
// @desc    Restart cron service
// @access  Public
router.post('/cron/restart', (req, res) => {
  try {
    cronService.restart();
    
    res.json({
      success: true,
      message: 'Cron service restarted successfully'
    });
  } catch (error) {
    logger.error('Error restarting cron service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart cron service'
    });
  }
});

// @route   GET /api/import/socket/status
// @desc    Get Socket.IO connection status
// @access  Public
router.get('/socket/status', (req, res) => {
  try {
    const status = {
      connectedClients: socketService.getConnectedClientsCount(),
      clientIds: socketService.getConnectedClients(),
      isActive: socketService.io !== null
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting socket status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get socket status'
    });
  }
});

// @route   POST /api/import/socket/test
// @desc    Test Socket.IO by sending a test event
// @access  Public
router.post('/socket/test', (req, res) => {
  try {
    const testData = {
      message: 'Test event from server',
      timestamp: new Date().toISOString(),
      testId: Date.now()
    };
    
    socketService.broadcast('test-event', testData);
    
    res.json({
      success: true,
      message: 'Test event sent successfully',
      data: testData
    });
  } catch (error) {
    logger.error('Error sending test event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test event'
    });
  }
});

module.exports = router; 