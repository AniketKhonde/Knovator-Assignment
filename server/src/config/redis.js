const Redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 15000, // Increased to 15 seconds
        commandTimeout: 10000, // Increased to 10 seconds for commands
        keepAlive: 30000,      // Keep alive every 30 seconds
        reconnectStrategy: (retries) => {
          if (retries > 20) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 1000, 10000);
        }
      },
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server refused connection');
          return new Error('Redis server refused connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60 * 2) { // Increased to 2 hours
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 20) { // Increased max attempts
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 200, 5000); // Increased backoff
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis Client Disconnected');
    });

    await redisClient.connect();
    return redisClient;

  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
};

const isRedisConnected = () => {
  return redisClient && redisClient.isReady;
};

const getRedisStatus = () => {
  if (!redisClient) {
    return { status: 'not_initialized' };
  }
  
  return {
    status: redisClient.isReady ? 'connected' : 'disconnected',
    isReady: redisClient.isReady,
    isOpen: redisClient.isOpen
  };
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  isRedisConnected,
  getRedisStatus
}; 