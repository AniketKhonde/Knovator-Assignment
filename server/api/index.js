const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { createServer } = require('http');
require('dotenv').config();

const connectDB = require('../src/config/database');
const { connectRedis } = require('../src/config/redis');
const { errorHandler } = require('../src/middleware/errorHandler');
const logger = require('../src/utils/logger');
const socketService = require('../src/services/socketService');

// Import routes
const importRoutes = require('../src/routes/import');
const importLogsRoutes = require('../src/routes/importLogs');
const jobsRoutes = require('../src/routes/jobs');

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection check middleware
const checkDatabaseConnection = async (req, res, next) => {
  const mongoose = require('mongoose');
  
  // Skip database check for health and status endpoints
  if (req.path === '/api/health' || req.path === '/api/status' || req.path === '/api/test-mongodb') {
    return next();
  }
  
  if (mongoose.connection.readyState !== 1) {
    logger.warn(`Database not connected for ${req.path}. ReadyState: ${mongoose.connection.readyState}`);
    
    // Try to reconnect if not connected
    try {
      await connectDB();
      logger.info('Database reconnected successfully');
      return next();
    } catch (error) {
      logger.error('Failed to reconnect to database:', error.message);
      return res.status(503).json({
        success: false,
        error: 'Database connection not available',
        details: error.message
      });
    }
  }
  
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Keep-alive endpoint to prevent server sleep
app.get('/api/keep-alive', (req, res) => {
  res.json({ 
    status: 'awake', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint for basic connectivity test
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Knovator Job Importer API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Connection status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { getRedisStatus } = require('../src/config/redis');
    
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = getRedisStatus();
    
    res.json({
      status: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      connections: {
        mongodb: mongoStatus,
        redis: redisStatus.status
      },
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MongoDB test endpoint
app.get('/api/test-mongodb', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({
        error: 'MONGODB_URI environment variable is not set',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test connection
    const startTime = Date.now();
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 10000,
      maxPoolSize: 1,
      family: 4
    });
    const duration = Date.now() - startTime;
    
    // Test a simple query
    const collections = await conn.connection.db.listCollections().toArray();
    
    res.json({
      success: true,
      message: 'MongoDB connection successful',
      host: conn.connection.host,
      database: conn.connection.name,
      duration: `${duration}ms`,
      collections: collections.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      name: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

// Database connection status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    res.json({
      success: true,
      data: {
        readyState: mongoose.connection.readyState,
        readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
        host: mongoose.connection.host || 'not connected',
        name: mongoose.connection.name || 'not connected',
        port: mongoose.connection.port || 'not connected',
        hasMongoUri: !!process.env.MONGODB_URI,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Apply database connection check middleware to API routes
app.use('/api/import', checkDatabaseConnection, importRoutes);
app.use('/api/import-logs', checkDatabaseConnection, importLogsRoutes);
app.use('/api/jobs', checkDatabaseConnection, jobsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Initialize Socket.IO
socketService.initialize(server);

// Initialize connections on cold start
let isInitialized = false;
let mongoConnected = false;

const initializeConnections = async () => {
  if (isInitialized) return;
  
  try {
    logger.info('Initializing connections for Vercel deployment...');
    
    // Connect to MongoDB with retry logic
    let mongoRetries = 0;
    const maxMongoRetries = 3;
    
    while (!mongoConnected && mongoRetries < maxMongoRetries) {
      try {
        mongoRetries++;
        logger.info(`MongoDB connection attempt ${mongoRetries}/${maxMongoRetries}`);
        
        await connectDB();
        mongoConnected = true;
        logger.info('MongoDB connected successfully');
      } catch (error) {
        logger.error(`MongoDB connection attempt ${mongoRetries} failed:`, error.message);
        
        if (mongoRetries >= maxMongoRetries) {
          logger.error('MongoDB connection failed after all retries');
          // Don't throw error - allow service to continue
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000 * mongoRetries));
        }
      }
    }
    
    // Connect to Redis (optional for Vercel)
    if (process.env.REDIS_URL) {
      try {
        await connectRedis();
        logger.info('Redis connected successfully');
      } catch (error) {
        logger.warn('Redis connection failed (optional for Vercel):', error.message);
      }
    } else {
      logger.warn('REDIS_URL not set - Redis features will be disabled');
    }
    
    isInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize connections:', error);
  }
};

// Initialize on module load
initializeConnections();

module.exports = app; 