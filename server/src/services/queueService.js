const { Queue, Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

class QueueService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.schedulers = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await getRedisClient(); // Ensure Redis is connected
      this.isInitialized = true;
      logger.info('Queue service initialized');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  // Create or get a queue
  getQueue(name) {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: getRedisClient(),
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
      logger.info(`Queue '${name}' created`);
    }

    return this.queues.get(name);
  }

  // Create a worker for processing jobs
  createWorker(queueName, processor, options = {}) {
    if (this.workers.has(queueName)) {
      logger.warn(`Worker for queue '${queueName}' already exists`);
      return this.workers.get(queueName);
    }

    const worker = new Worker(queueName, processor, {
      connection: getRedisClient(),
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
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });

    this.workers.set(queueName, worker);
    logger.info(`Worker created for queue '${queueName}' with concurrency ${options.concurrency || 5}`);

    return worker;
  }

  // Create a scheduler for delayed jobs (commented out for BullMQ v5 compatibility)
  createScheduler(queueName) {
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
    logger.info(`addJob: Starting to add job to queue '${queueName}'`);
    const queue = this.getQueue(queueName);
    logger.info(`addJob: Got queue instance for '${queueName}'`);
    
    logger.info(`addJob: Adding job with data size: ${JSON.stringify(jobData).length} characters`);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Queue add operation timed out after 10 seconds')), 10000);
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
    const queue = this.getQueue(queueName);
    
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
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }

  // Get queue statistics
  async getQueueStats(queueName) {
    try {
      const queue = this.getQueue(queueName);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Queue stats operation timed out after 5 seconds')), 5000);
      });
      
      const statsPromise = Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
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
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`Queue '${queueName}' paused`);
  }

  // Resume a queue
  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`Queue '${queueName}' resumed`);
  }

  // Clean completed jobs
  async cleanQueue(queueName, grace = 1000 * 60 * 60 * 24) { // 24 hours
    const queue = this.getQueue(queueName);
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
}

module.exports = new QueueService(); 