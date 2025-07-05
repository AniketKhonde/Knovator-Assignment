const { Server } = require('socket.io');
const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Set();
  }

  // Initialize Socket.IO with Express server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('Socket.IO service initialized');
  }

  // Setup Socket.IO event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Handle import updates room joining
      socket.on('join-import-updates', () => {
        socket.join('import-updates');
        logger.info(`Client ${socket.id} joined import-updates room`);
      });

      // Handle import updates room leaving
      socket.on('leave-import-updates', () => {
        socket.leave('import-updates');
        logger.info(`Client ${socket.id} left import-updates room`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  // Emit import started event
  emitImportStarted(data) {
    if (this.io) {
      this.io.to('import-updates').emit('import-started', {
        ...data,
        timestamp: new Date().toISOString()
      });
      logger.info('Emitted import-started event');
    }
  }

  // Emit import completed event
  emitImportCompleted(data) {
    if (this.io) {
      this.io.to('import-updates').emit('import-completed', {
        ...data,
        timestamp: new Date().toISOString()
      });
      logger.info('Emitted import-completed event');
    }
  }

  // Emit import error event
  emitImportError(data) {
    if (this.io) {
      this.io.to('import-updates').emit('import-error', {
        ...data,
        timestamp: new Date().toISOString()
      });
      logger.info('Emitted import-error event');
    }
  }

  // Emit cron status update
  emitCronStatus(data) {
    if (this.io) {
      this.io.to('import-updates').emit('cron-status', {
        ...data,
        timestamp: new Date().toISOString()
      });
      logger.info('Emitted cron-status event');
    }
  }

  // Emit real-time import progress
  emitImportProgress(data) {
    if (this.io) {
      this.io.to('import-updates').emit('import-progress', {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  // Get all connected client IDs
  getConnectedClients() {
    return Array.from(this.connectedClients);
  }

  // Broadcast to all clients
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Broadcast to specific room
  broadcastToRoom(room, event, data) {
    if (this.io) {
      this.io.to(room).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new SocketService(); 