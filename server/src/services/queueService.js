const { Queue, Worker } = require('bullmq');
const Redis = require('redis');
const logger = require('../utils/logger');

class QueueService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.schedulers = new Map();
    this.isInitialized = false;
    this.redisAvailable = false;
    this.redisClient = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Check if Redis URL is available
      if (!process.env.REDIS_URL) {
        logger.warn('REDIS_URL environment variable is not set - Queue service will be disabled');
        this.redisAvailable = false;
        this.isInitialized = true;
        return;
      }

      // Create our own Redis client for testing
      logger.info('Testing Redis connection for queue service...');
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 10000,
          commandTimeout: 5000,
          keepAlive: 30000,
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              logger.error('Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 1000, 5000);
          }
        }
      });

      // Test Redis connection with timeout
      const pingPromise = this.redisClient.ping();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis initialization timeout')), 10000);
      });
      
      await Promise.race([pingPromise, timeoutPromise]);
      
      this.redisAvailable = true;
      this.isInitialized = true;
      logger.info('Queue service initialized successfully with Redis');
    } catch (error) {
      logger.warn('Failed to initialize queue service (Redis not available):', error.message);
      this.redisAvailable = false;
      this.isInitialized = true;
      // Don't throw error - allow service to continue without Redis
    }
  }

  // Check if Redis is available
  isRedisAvailable() {
    return this.redisAvailable;
  }

  // Create or get a queue
  getQueue(name) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot create queue '${name}' - Redis not available`);
      return null;
    }

    if (!this.queues.has(name)) {
      // Ensure REDIS_URL is available
      if (!process.env.REDIS_URL) {
        logger.error('REDIS_URL environment variable is not set');
        return null;
      }

      const queue = new Queue(name, {
        connection: process.env.REDIS_URL,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50,      // Keep last 50 failed jobs
          attempts: 3,           // Retry failed jobs 3 times
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.queues.set(name, queue);
      logger.info(`Queue '${name}' created with Redis URL`);
    }

    return this.queues.get(name);
  }

  // Create a worker for processing jobs
  createWorker(queueName, processor, options = {}) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot create worker for queue '${queueName}' - Redis not available`);
      return null;
    }

    if (this.workers.has(queueName)) {
      logger.warn(`Worker for queue '${queueName}' already exists`);
      return this.workers.get(queueName);
    }

    // Ensure REDIS_URL is available
    if (!process.env.REDIS_URL) {
      logger.error('REDIS_URL environment variable is not set');
      return null;
    }

    const worker = new Worker(queueName, processor, {
      connection: process.env.REDIS_URL,
      concurrency: options.concurrency || parseInt(process.env.CONCURRENCY) || 5,
      ...options
    });

    // Worker event handlers
    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error:`, err);
      // Don't let worker errors crash the server
      // The worker will automatically retry or fail gracefully
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });

    // Add additional error handling for BullMQ v4
    worker.on('closed', () => {
      logger.info(`Worker for queue '${queueName}' closed`);
    });

    this.workers.set(queueName, worker);
    logger.info(`Worker created for queue '${queueName}' with concurrency ${options.concurrency || 5}`);

    return worker;
  }

  // Create a scheduler for delayed jobs (commented out for BullMQ v5 compatibility)
  createScheduler(queueName) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot create scheduler for queue '${queueName}' - Redis not available`);
      return null;
    }

    logger.warn('QueueScheduler is not available in BullMQ v5, skipping scheduler creation');
    return null;
    
    // if (this.schedulers.has(queueName)) {
    //   return this.schedulers.get(queueName);
    // }

    // const scheduler = new QueueScheduler(queueName, {
    //   connection: getRedisClient()
    // });

    // scheduler.on('failed', (job, err) => {
    //   logger.error(`Scheduler failed for job ${job.id}:`, err);
    // });

    // this.schedulers.set(queueName, scheduler);
    // logger.info(`Scheduler created for queue '${queueName}'`);

    // return scheduler;
  }

  // Add a job to the queue
  async addJob(queueName, jobData, options = {}) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot add job to queue '${queueName}' - Redis not available`);
      return null;
    }

    logger.info(`addJob: Starting to add job to queue '${queueName}'`);
    const queue = this.getQueue(queueName);
    if (!queue) {
      logger.error(`Queue '${queueName}' not available`);
      return null;
    }
    
    logger.info(`addJob: Got queue instance for '${queueName}'`);
    
    logger.info(`addJob: Adding job with data size: ${JSON.stringify(jobData).length} characters`);
    
    // Add timeout to prevent hanging - increased from 10 to 20 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Queue add operation timed out after 20 seconds')), 20000);
    });
    
    const addJobPromise = queue.add(
      options.name || 'default',
      jobData,
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      }
    );
    
    const job = await Promise.race([addJobPromise, timeoutPromise]);
    logger.info(`addJob: Job ${job.id} added to queue '${queueName}'`);

    logger.info(`Job ${job.id} added to queue '${queueName}'`);
    return job;
  }

  // Add multiple jobs to the queue
  async addJobs(queueName, jobsData, options = {}) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot add jobs to queue '${queueName}' - Redis not available`);
      return [];
    }

    const queue = this.getQueue(queueName);
    if (!queue) {
      logger.error(`Queue '${queueName}' not available`);
      return [];
    }
    
    const jobs = await queue.addBulk(
      jobsData.map((data, index) => ({
        name: options.name || 'default',
        data,
        opts: {
          priority: options.priority || 0,
          delay: options.delay || 0,
          ...options
        }
      }))
    );

    logger.info(`${jobs.length} jobs added to queue '${queueName}'`);
    return jobs;
  }

  // Get job by ID
  async getJob(queueName, jobId) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot get job from queue '${queueName}' - Redis not available`);
      return null;
    }

    const queue = this.getQueue(queueName);
    if (!queue) {
      return null;
    }
    return await queue.getJob(jobId);
  }

  // Get queue statistics
  async getQueueStats(queueName) {
    if (!this.redisAvailable) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
        redisAvailable: false
      };
    }

    try {
      const queue = this.getQueue(queueName);
      
      // Add timeout to prevent hanging - increased from 5 to 15 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Queue stats operation timed out after 15 seconds')), 15000);
      });
      
      // Add individual timeouts for each operation to prevent hanging
      const getStatsWithTimeout = async (operation, timeout = 3000) => {
        const operationPromise = operation();
        const operationTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
        });
        return Promise.race([operationPromise, operationTimeout]);
      };
      
      const statsPromise = Promise.all([
        getStatsWithTimeout(() => queue.getWaiting()),
        getStatsWithTimeout(() => queue.getActive()),
        getStatsWithTimeout(() => queue.getCompleted()),
        getStatsWithTimeout(() => queue.getFailed()),
        getStatsWithTimeout(() => queue.getDelayed())
      ]);
      
      const [waiting, active, completed, failed, delayed] = await Promise.race([statsPromise, timeoutPromise]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      };
    } catch (error) {
      logger.error(`Error getting queue stats for ${queueName}:`, error);
      
      // Check if it's a Redis connection issue
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        logger.warn(`Redis connection issue detected for queue stats. Returning fallback values.`);
      }
      
      // Return empty stats as fallback
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      };
    }
  }

  // Pause a queue
  async pauseQueue(queueName) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot pause queue '${queueName}' - Redis not available`);
      return;
    }

    const queue = this.getQueue(queueName);
    if (!queue) {
      logger.error(`Queue '${queueName}' not available`);
      return;
    }
    await queue.pause();
    logger.info(`Queue '${queueName}' paused`);
  }

  // Resume a queue
  async resumeQueue(queueName) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot resume queue '${queueName}' - Redis not available`);
      return;
    }

    const queue = this.getQueue(queueName);
    if (!queue) {
      logger.error(`Queue '${queueName}' not available`);
      return;
    }
    await queue.resume();
    logger.info(`Queue '${queueName}' resumed`);
  }

  // Clean completed jobs
  async cleanQueue(queueName, grace = 1000 * 60 * 60 * 24) { // 24 hours
    if (!this.redisAvailable) {
      logger.warn(`Cannot clean queue '${queueName}' - Redis not available`);
      return;
    }

    const queue = this.getQueue(queueName);
    if (!queue) {
      logger.error(`Queue '${queueName}' not available`);
      return;
    }
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    logger.info(`Queue '${queueName}' cleaned`);
  }

  // Close all queues and workers
  async close() {
    logger.info('Closing queue service...');

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info(`Worker '${name}' closed`);
    }

    // Close all schedulers
    for (const [name, scheduler] of this.schedulers) {
      await scheduler.close();
      logger.info(`Scheduler '${name}' closed`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue '${name}' closed`);
    }

    this.workers.clear();
    this.schedulers.clear();
    this.queues.clear();
    this.isInitialized = false;

    logger.info('Queue service closed');
  }

  // Get all queue names
  getQueueNames() {
    return Array.from(this.queues.keys());
  }

  // Check if a queue exists
  hasQueue(name) {
    return this.queues.has(name);
  }

  // Get queue instance
  getQueueInstance(name) {
    return this.queues.get(name);
  }

  // Health check for queue service
  async healthCheck() {
    try {
      // Test Redis connection directly
      const Redis = require('redis');
      const testClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      });
      
      await testClient.connect();
      await testClient.ping();
      await testClient.disconnect();
      
      // Test queue operations if queues exist
      if (this.queues.size > 0) {
        const queueNames = Array.from(this.queues.keys());
        const testQueue = this.queues.get(queueNames[0]);
        
        if (testQueue) {
          // Test basic queue operation with timeout
          const testPromise = testQueue.getWaiting();
          const testTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Queue operation timeout')), 5000);
          });
          
          await Promise.race([testPromise, testTimeoutPromise]);
        }
      }
      
      return {
        status: 'healthy',
        redis: this.redisAvailable ? 'connected' : 'disconnected',
        queues: this.queues.size,
        workers: this.workers.size,
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          db: process.env.REDIS_DB || 0
        }
      };
    } catch (error) {
      logger.error('Queue service health check failed:', error);
      return {
        status: 'unhealthy',
        redis: this.redisAvailable ? 'connected' : 'disconnected',
        error: error.message,
        queues: this.queues.size,
        workers: this.workers.size,
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          db: process.env.REDIS_DB || 0
        }
      };
    }
  }
}

module.exports = new QueueService(); 