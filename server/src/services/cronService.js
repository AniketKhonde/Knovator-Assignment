const cron = require('node-cron');
const importService = require('./importService');
const socketService = require('./socketService');
const logger = require('../utils/logger');

class CronService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  // Initialize the cron service
  initialize() {
    try {
      const cronSchedule = process.env.CRON_SCHEDULE || '0 * * * *'; // Default: every hour
      
      logger.info(`Initializing cron service with schedule: ${cronSchedule}`);
      
      // Validate cron schedule
      if (!cron.validate(cronSchedule)) {
        throw new Error(`Invalid cron schedule: ${cronSchedule}`);
      }

      // Create cron job
      this.cronJob = cron.schedule(cronSchedule, async () => {
        await this.executeScheduledImport();
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC'
      });

      // Start the cron job
      this.cronJob.start();
      this.isRunning = true;
      
      logger.info('Cron service initialized and started successfully');
      
      // Log next run time (node-cron doesn't have nextDate method)
      logger.info(`Cron service initialized with schedule: ${cronSchedule}`);
      
    } catch (error) {
      logger.error('Failed to initialize cron service:', error);
      throw error;
    }
  }

  // Execute the scheduled import
  async executeScheduledImport() {
    try {
      logger.info('Executing scheduled import...');
      
      // Emit cron status update
      socketService.emitCronStatus({
        type: 'cron-triggered',
        message: 'Cron job triggered import process',
        schedule: process.env.CRON_SCHEDULE || '0 * * * *'
      });
      
      // Check if import is already running
      if (importService.isRunning) {
        logger.warn('Import is already running, skipping scheduled import');
        socketService.emitCronStatus({
          type: 'cron-skipped',
          message: 'Import already running, cron skipped',
          reason: 'import_already_running'
        });
        return;
      }

      // Emit import started event
      socketService.emitImportStarted({
        type: 'cron-import',
        message: 'Scheduled import started by cron',
        timestamp: new Date().toISOString()
      });

      // Trigger the import
      const result = await importService.startImport();
      
      logger.info('Scheduled import completed successfully', {
        importId: result.importId,
        totalFeeds: result.totalFeeds,
        results: result.results
      });

      // Emit import completed event
      socketService.emitImportCompleted({
        type: 'cron-import',
        message: 'Scheduled import completed successfully',
        importId: result.importId,
        totalFeeds: result.totalFeeds,
        results: result.results
      });

    } catch (error) {
      logger.error('Scheduled import failed:', error);
      
      // Emit import error event
      socketService.emitImportError({
        type: 'cron-import',
        message: 'Scheduled import failed',
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Get cron service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      schedule: process.env.CRON_SCHEDULE || '0 * * * *',
      nextRun: 'Calculating...' // node-cron doesn't provide next run time easily
    };
  }

  // Stop the cron service
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      logger.info('Cron service stopped');
    }
  }

  // Restart the cron service
  restart() {
    this.stop();
    this.initialize();
  }
}

module.exports = new CronService(); 