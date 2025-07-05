const { spawn } = require('child_process');
const logger = require('./src/utils/logger');

async function waitForConnections() {
  console.log(' Waiting for external connections...');
  
  // Test MongoDB connection
  try {
    console.log(' Testing MongoDB connection...');
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000
    });
    
    console.log(' MongoDB connected successfully');
    await mongoose.connection.close();
    
  } catch (error) {
    console.log(' MongoDB connection test failed:', error.message);
    console.log(' Will retry during server startup...');
  }
  
  // Test Redis connection
  try {
    console.log(' Testing Redis connection...');
    const Redis = require('redis');
    const redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    });
    
    await redisClient.connect();
    await redisClient.ping();
    console.log(' Redis connected successfully');
    await redisClient.quit();
    
  } catch (error) {
    console.log(' Redis connection test failed:', error.message);
    console.log(' Will retry during server startup...');
  }
}

async function startServer() {
  try {
    console.log('🚀 Starting Knovator Job Importer...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', process.env.PORT || 5000);
    console.log('');
    
    // Wait for connections (optional)
    if (process.env.WAIT_FOR_CONNECTIONS === 'true') {
      await waitForConnections();
    }
    
    // Start the main server
    console.log('🎯 Starting main server process...');
    const server = spawn('node', ['src/index.js'], {
      stdio: 'inherit',
      env: process.env
    });
    
    server.on('error', (error) => {
      console.error(' Failed to start server:', error);
      process.exit(1);
    });
    
    server.on('exit', (code) => {
      console.log(` Server process exited with code ${code}`);
      process.exit(code);
    });
    
  } catch (error) {
    console.error(' Startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(console.error); 