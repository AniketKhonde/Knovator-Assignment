const xmlFeedService = require('./xmlFeedService');
const socketService = require('./socketService');
const queueService = require('./queueService');
const logger = require('../utils/logger');

class ImportService {
  constructor() {
    this.isRunning = false;
    this.currentImportId = null;
  }

  // Initialize the import service
  async initialize() {
    try {
      // Initialize queue service
      await queueService.initialize();
      
      // Create job-import queue
      const queue = queueService.getQueue('job-import');
      
      // Create worker for processing jobs
      const worker = queueService.createWorker('job-import', async (job) => {
        logger.info(`Processing job ${job.id}: ${job.data.feedName}`);
        
        try {
          // Process the job data
          const { jobData, feedName, feedUrl, importLogId } = job.data;
          
          // Import Job model
          const Job = require('../models/Job');
          
          let processed = 0;
          let newJobs = 0;
          let updatedJobs = 0;
          let failedJobs = [];
          
          // Process individual jobs
          for (const jobItem of jobData) {
            try {
              // Check if job already exists
              const existingJob = await Job.findOne({ 
                originalGuid: jobItem.guid,
                sourceFeed: feedUrl 
              });
              
              if (existingJob) {
                // Update existing job
                existingJob.title = jobItem.title || existingJob.title;
                existingJob.company = jobItem.company || existingJob.company;
                existingJob.location = jobItem.location || existingJob.location;
                existingJob.description = jobItem.description || existingJob.description;
                existingJob.salary = jobItem.salary || existingJob.salary;
                existingJob.requirements = jobItem.requirements || existingJob.requirements;
                existingJob.type = jobItem.type || existingJob.type;
                existingJob.category = jobItem.category || existingJob.category;
                existingJob.industry = jobItem.industry || existingJob.industry;
                existingJob.remote = jobItem.remote || existingJob.remote;
                existingJob.applicationUrl = jobItem.applicationUrl || existingJob.applicationUrl;
                existingJob.applicationEmail = jobItem.applicationEmail || existingJob.applicationEmail;
                existingJob.publishedDate = jobItem.publishedDate || existingJob.publishedDate;
                existingJob.rawData = jobItem;
                existingJob.updatedAt = new Date();
                
                await existingJob.save();
                updatedJobs++;
                processed++; // Only increment after successful save
              } else {
                // Create new job
                const newJob = new Job({
                  title: jobItem.title,
                  company: jobItem.company,
                  location: jobItem.location,
                  description: jobItem.description,
                  salary: jobItem.salary,
                  requirements: jobItem.requirements,
                  type: jobItem.type,
                  category: jobItem.category,
                  industry: jobItem.industry,
                  remote: jobItem.remote,
                  applicationUrl: jobItem.applicationUrl,
                  applicationEmail: jobItem.applicationEmail,
                  sourceFeed: feedUrl,
                  sourceName: feedName,
                  originalGuid: jobItem.guid,
                  publishedDate: jobItem.publishedDate,
                  status: 'active',
                  rawData: jobItem
                });
                
                await newJob.save();
                newJobs++;
                processed++; // Only increment after successful save
              }
            } catch (jobError) {
              logger.error(`Error processing individual job:`, jobError);
              logger.error(`Failed job details:`, {
                guid: jobItem.guid,
                title: jobItem.title,
                company: jobItem.company,
                error: jobError.message
              });
              failedJobs.push({
                guid: jobItem.guid,
                title: jobItem.title,
                reason: 'Processing error',
                error: jobError.message
              });
            }
          }
          
          // Update import log with processing results
          if (importLogId) {
            const ImportLog = require('../models/ImportLog');
            const importLog = await ImportLog.findById(importLogId);
            if (importLog) {
              importLog.totalImported = processed;
              importLog.newJobs = newJobs;
              importLog.updatedJobs = updatedJobs;
              importLog.failedJobs = failedJobs;
              importLog.status = 'completed';
              await importLog.save();
            }
          }
          
          logger.info(`Processed ${processed} jobs from ${feedName} (${newJobs} new, ${updatedJobs} updated, ${failedJobs.length} failed)`);
          
          return { success: true, processed, newJobs, updatedJobs, failedJobs: failedJobs.length };
        } catch (error) {
          logger.error(`Error processing job ${job.id}:`, error);
          throw error;
        }
      }, {
        concurrency: parseInt(process.env.CONCURRENCY) || 5
      });
      
      logger.info('Import service initialized with BullMQ queue system');
    } catch (error) {
      logger.error('Failed to initialize import service:', error);
      throw error;
    }
  }

  // Start the import process
  async startImport() {
    if (this.isRunning) {
      throw new Error('Import is already running');
    }

    this.isRunning = true;
    this.currentImportId = Date.now().toString();
    logger.info(`Starting import process (ID: ${this.currentImportId})`);
    
    // Emit import started event
    socketService.emitImportStarted({
      importId: this.currentImportId,
      message: 'Import process started',
      timestamp: new Date().toISOString()
    });
    
    try {
      logger.info('Fetching feed sources...');
      const feedSources = xmlFeedService.getFeedSources();
      logger.info(`Found ${feedSources.length} feed sources`);
      const results = [];

      // Process each feed source
      for (let i = 0; i < feedSources.length; i++) {
        const feed = feedSources[i];
        try {
          logger.info(`Processing feed: ${feed.name}`);
          
          // Emit progress update
          socketService.emitImportProgress({
            importId: this.currentImportId,
            currentFeed: i + 1,
            totalFeeds: feedSources.length,
            feedName: feed.name,
            message: `Processing feed ${i + 1}/${feedSources.length}: ${feed.name}`
          });
          
          const result = await this.processFeed(feed);
          logger.info(`Processed feed: ${feed.name}`);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to process feed ${feed.name}:`, error);
          results.push({
            feed: feed.name,
            success: false,
            error: error.message
          });
        }
      }

      logger.info(`Import process completed (ID: ${this.currentImportId})`);
      
      const finalResult = {
        importId: this.currentImportId,
        totalFeeds: feedSources.length,
        results
      };
      
      // Emit import completed event
      socketService.emitImportCompleted(finalResult);
      
      return finalResult;

    } catch (error) {
      logger.error(`Import process failed (ID: ${this.currentImportId}):`, error);
      
      // Emit import error event
      socketService.emitImportError({
        importId: this.currentImportId,
        message: 'Import process failed',
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    } finally {
      this.isRunning = false;
      this.currentImportId = null;
    }
  }

  // Process a single feed
  async processFeed(feed) {
    logger.info(`Processing feed: ${feed.name}`);
    
    try {
      // Fetch jobs from the feed
      logger.info(`Fetching feed: ${feed.name} (${feed.url})`);
      const feedResult = await xmlFeedService.fetchFeed(feed.url, feed.name);
      logger.info(`Feed fetch completed for ${feed.name}`);
      
      if (!feedResult.success) {
        throw new Error(feedResult.error);
      }

      // Create import log entry
      const ImportLog = require('../models/ImportLog');
      const importLog = new ImportLog({
        sourceFeed: feed.url,
        sourceName: feed.name,
        totalFetched: feedResult.totalFetched,
        status: 'running'
      });
      await importLog.save();
      
      // Add jobs to BullMQ queue for processing
      logger.info(`Adding ${feedResult.jobs.length} jobs to BullMQ queue for ${feed.name}`);
      
      try {
        const job = await queueService.addJob('job-import', {
          jobData: feedResult.jobs,
          feedName: feed.name,
          feedUrl: feed.url,
          importLogId: importLog._id
        }, {
          name: `import-${feed.name}`,
          priority: 1
        });
        
        logger.info(`Job ${job.id} added to queue for ${feed.name}`);
        
        // Update import log with queue job ID
        importLog.queueJobId = job.id;
        await importLog.save();
        
        logger.info(`Jobs queued for ${feed.name}: ${feedResult.jobs.length} jobs added to BullMQ queue`);
        
        return {
          feed: feed.name,
          success: true,
          jobsFetched: feedResult.jobs.length,
          jobsQueued: feedResult.jobs.length,
          duration: feedResult.duration,
          queueJobId: job.id
        };
        
      } catch (error) {
        logger.error(`Error adding jobs to queue for ${feed.name}:`, error);
        
        // Update import log with error
        importLog.status = 'failed';
        importLog.error = error.message;
        await importLog.save();
        
        throw error;
      }

    } catch (error) {
      logger.error(`Error processing feed ${feed.name}:`, error);
      throw error;
    }
  }



  // Get import status
  getImportStatus() {
    return {
      isRunning: this.isRunning,
      currentImportId: this.currentImportId,
      timestamp: this.isRunning ? new Date() : null
    };
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      // Get real queue statistics from BullMQ
      const stats = await queueService.getQueueStats('job-import');
      return stats;
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      
      // Check if it's a timeout or connection issue
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        logger.warn('Queue stats failed due to timeout/connection issue. Using fallback values.');
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

  // Get processing statistics
  async getProcessingStats() {
    try {
      // Get queue stats to calculate processing stats
      const queueStats = await this.getQueueStats();
      return {
        totalJobs: queueStats.waiting + queueStats.active + queueStats.completed + queueStats.failed,
        processedJobs: queueStats.completed,
        failedJobs: queueStats.failed
      };
    } catch (error) {
      logger.error('Error getting processing stats:', error);
      throw error;
    }
  }



  // Clean up completed jobs
  async cleanupQueue() {
    try {
      await queueService.cleanQueue('job-import');
      logger.info('Queue cleanup completed successfully');
    } catch (error) {
      logger.error('Error cleaning queue:', error);
      throw error;
    }
  }



  // Stop the import service
  async stop() {
    try {
      this.isRunning = false;
      this.currentImportId = null;
      logger.info('Import service stopped');
    } catch (error) {
      logger.error('Error stopping import service:', error);
      throw error;
    }
  }
}

module.exports = new ImportService(); 