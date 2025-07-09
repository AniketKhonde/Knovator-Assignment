const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const connectDB = require('../src/config/database');
const { connectRedis } = require('../src/config/redis');
const { errorHandler } = require('../src/middleware/errorHandler');
const logger = require('../src/utils/logger');

// Import routes
const importRoutes = require('../src/routes/import');
const importLogsRoutes = require('../src/routes/importLogs');
const jobsRoutes = require('../src/routes/jobs');

const app = express();

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

// API routes
app.use('/api/import', importRoutes);
app.use('/api/import-logs', importLogsRoutes);
app.use('/api/jobs', jobsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Initialize connections on cold start
let isInitialized = false;

const initializeConnections = async () => {
  if (isInitialized) return;
  
  try {
    logger.info('Initializing connections for Vercel deployment...');
    
    // Connect to MongoDB
    try {
      await connectDB();
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection failed:', error.message);
    }
    
    // Connect to Redis
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error.message);
    }
    
    isInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize connections:', error);
  }
};

// Initialize on module load
initializeConnections();

module.exports = app; 