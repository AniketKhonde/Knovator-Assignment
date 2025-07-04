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
const importService = require('./services/importService');
const cronService = require('./services/cronService');
const socketService = require('./services/socketService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://knovator-assignment.vercel.app',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/import', importRoutes);
app.use('/api/import-logs', importLogsRoutes);

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
    
    // Connect to database with timeout
    logger.info('Connecting to MongoDB...');
    const dbPromise = connectDB();
    const dbTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MongoDB connection timeout')), 15000)
    );
    await Promise.race([dbPromise, dbTimeout]);
    
    // Connect to Redis with timeout
    logger.info('Connecting to Redis...');
    const redisPromise = connectRedis();
    const redisTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
    );
    await Promise.race([redisPromise, redisTimeout]);
    
    // Initialize import service
    logger.info('Initializing import service...');
    await importService.initialize();
    
    // Initialize cron service
    logger.info('Initializing cron service...');
    cronService.initialize();
    
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