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
          logger.warn(`Socket.IO CORS blocked origin: ${origin}`);
          return callback(new Error('Not allowed by CORS'));
        },
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