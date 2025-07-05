const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`MongoDB connection attempt ${attempt}/${maxRetries}`);
      
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000, // Increased to 15 seconds
        socketTimeoutMS: 45000, // 45 second timeout
        connectTimeoutMS: 15000, // 15 second connection timeout
        maxPoolSize: 10, // Connection pool size
        minPoolSize: 2, // Minimum connections in pool
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        retryWrites: true,
        retryReads: true,
        bufferCommands: true,
        bufferMaxEntries: 0
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      });

      return conn; // Success, exit retry loop
      
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        logger.error('MongoDB connection failed after all retries');
        throw error; // Don't exit process, let the caller handle it
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
};

module.exports = connectDB; 