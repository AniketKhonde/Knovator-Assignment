import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join import updates room
  joinImportUpdates() {
    if (this.socket) {
      this.socket.emit('join-import-updates');
    }
  }

  // Leave import updates room
  leaveImportUpdates() {
    if (this.socket) {
      this.socket.emit('leave-import-updates');
    }
  }

  // Listen for import events
  onImportEvent(event, callback) {
    if (this.socket) {
      // Remove existing listeners for this event to prevent duplicates
      this.socket.off(event);
      
      // Add new listener
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  // Remove import event listener
  offImportEvent(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  // Listen for import started
  onImportStarted(callback) {
    this.onImportEvent('import-started', callback);
  }

  // Listen for import completed
  onImportCompleted(callback) {
    this.onImportEvent('import-completed', callback);
  }

  // Listen for import error
  onImportError(callback) {
    this.onImportEvent('import-error', callback);
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
    };
  }

  // Cleanup all listeners
  cleanup() {
    if (this.socket) {
      // Remove all stored listeners
      for (const [event, listeners] of this.listeners) {
        listeners.forEach(callback => {
          this.socket.off(event, callback);
        });
      }
      this.listeners.clear();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService; 