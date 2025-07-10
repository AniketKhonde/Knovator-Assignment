const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const importRoutes = require('./routes/import');
const importLogsRoutes = require('./routes/importLogs');
const jobsRoutes = require('./routes/jobs');
const importService = require('./services/importService');
const cronService = require('./services/cronService');
const socketService = require('./services/socketService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://knovator-assignment.vercel.app',
      'https://knovator-assignment-frontend.vercel.app'
    ].filter(Boolean); // Remove undefined values
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API health check endpoint (for Render)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Keep-alive endpoint to prevent server sleep
app.get('/keep-alive', (req, res) => {
  res.json({ 
    status: 'awake', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint for basic connectivity test
app.get('/', (req, res) => {
  res.json({ 
    message: 'Knovator Job Importer API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Connection status endpoint
app.get('/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { getRedisStatus } = require('./config/redis');
    
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
app.get('/test-mongodb', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({
        error: 'MONGODB_URI environment variable is not set',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log connection details (without credentials)
    const uri = process.env.MONGODB_URI;
    const uriParts = uri.split('@');
    const hostPart = uriParts.length > 1 ? uriParts[1] : 'Invalid URI format';
    
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

// Start server
const startServer = async () => {
  try {
    logger.info('Starting server initialization...');
    
    // Connect to database with timeout and retry logic
    logger.info('Connecting to MongoDB...');
    try {
      const dbPromise = connectDB();
      const dbTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 30000) // Increased to 30 seconds
      );
      await Promise.race([dbPromise, dbTimeout]);
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection failed:', error.message);
      logger.warn('Server will start without MongoDB connection. Some features may not work.');
      // Don't exit, continue with server startup
    }
    
    // Connect to Redis with timeout and retry logic
    logger.info('Connecting to Redis...');
    try {
      const redisPromise = connectRedis();
      const redisTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 20000) // Increased to 20 seconds
      );
      await Promise.race([redisPromise, redisTimeout]);
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error.message);
      logger.warn('Server will start without Redis connection. Queue features may not work.');
      // Don't exit, continue with server startup
    }
    
    // Initialize import service
    logger.info('Initializing import service...');
    try {
      await importService.initialize();
    } catch (error) {
      logger.error('Failed to initialize import service:', error);
      // Don't let import service failure crash the server
      // The server can still function without import service
    }
    
    // Initialize cron service
    logger.info('Initializing cron service...');
    try {
      cronService.initialize();
    } catch (error) {
      logger.error('Failed to initialize cron service:', error);
      // Don't let cron service failure crash the server
      // The server can still function without cron
    }
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize Socket.IO
    logger.info('Initializing Socket.IO...');
    socketService.initialize(server);
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Only exit for critical errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    logger.error('Critical error, shutting down:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 