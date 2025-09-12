const mongoose = require('mongoose');

/**
 * MongoDB Connection Configuration for Mongoose 6+
 * Optimized for cloud deployment with proper error handling and timeouts
 */

// Global Mongoose Configuration
mongoose.set('bufferCommands', false); // Disable command buffering
mongoose.set('bufferTimeoutMS', 0); // Disable buffering timeout
mongoose.set('strictQuery', true); // Enable strict query mode

// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

/**
 * Connect to MongoDB with proper async/await and error handling
 * Compatible with Mongoose 6+ and Node.js
 * @returns {Promise<boolean>} Connection success status
 */
async function connectDB() {
  try {
    // Validate environment variables
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable is not set');
    }

    console.log('🔄 Attempting MongoDB connection...');
    console.log(`📍 MongoDB URI: ${mongoURI.substring(0, 20)}...`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Mongoose version: ${mongoose.version}`);

    // Mongoose 6+ optimized connection options (modern approach)
    const connectionOptions = {
      // Connection pooling (Mongoose 6+ defaults)
      maxPoolSize: 10,
      minPoolSize: 2,

      // Timeouts optimized for cloud deployment
      serverSelectionTimeoutMS: 30000, // 30 seconds for server selection
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxIdleTimeMS: 30000,

      // Retry and reliability
      retryWrites: true,
      retryReads: true,

      // Buffer management (removed deprecated bufferMaxEntries)
      bufferCommands: false,

  // Modern options for Mongoose 6+ (defaults cover parsing and topology)
  // Removed deprecated driver-specific options: useNewUrlParser and useUnifiedTopology

      // Heartbeat and monitoring
      heartbeatFrequencyMS: 10000,
      maxStalenessSeconds: 90,

      // Additional cloud deployment options
      family: 4, // Use IPv4, skip trying IPv6
    };

    console.log('⚙️ Connection options:', {
      maxPoolSize: connectionOptions.maxPoolSize,
      serverSelectionTimeoutMS: connectionOptions.serverSelectionTimeoutMS,
      useNewUrlParser: connectionOptions.useNewUrlParser,
      useUnifiedTopology: connectionOptions.useUnifiedTopology
    });

    // Attempt connection
      await mongoose.connect(mongoURI, connectionOptions);

    isConnected = true;
    connectionAttempts = 0;

    console.log('✅ MongoDB connected successfully!');
    console.log(`🔗 Connection state: ${mongoose.connection.readyState}`);
    console.log(`📊 Connection pool size: ${connectionOptions.maxPoolSize}`);
    console.log(`🏠 Database name: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

    // Set up connection event handlers
    setupConnectionEventHandlers();

    return true;

  } catch (error) {
    isConnected = false;
    connectionAttempts++;

    console.error('❌ MongoDB connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Attempt: ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
    console.error(`   Error name: ${error.name}`);

    // Log additional error details in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('   Full error:', error);
      if (error.reason) {
        console.error('   Reason:', error.reason);
      }
    }

    // Retry logic for production
    if (process.env.NODE_ENV === 'production' && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      const retryDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Exponential backoff
      console.log(`🔄 Retrying connection in ${retryDelay / 1000} seconds...`);

      setTimeout(async () => {
        try {
          await connectDB();
        } catch (retryError) {
          console.error('❌ Retry connection failed:', retryError.message);
        }
      }, retryDelay);

      return false;
    }

    // If max attempts reached or in development, throw error
    throw error;
  }
}

/**
 * Set up MongoDB connection event handlers
 */
function setupConnectionEventHandlers() {
  mongoose.connection.on('connected', () => {
    console.log('📡 MongoDB connected event fired');
    isConnected = true;
  });

  mongoose.connection.on('error', (err) => {
    console.error('🚨 MongoDB connection error:', err.message);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected! Connection lost.');
    isConnected = false;

    // Auto-reconnect in production
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Attempting automatic reconnection...');
      setTimeout(async () => {
        try {
          await connectDB();
        } catch (error) {
          console.error('❌ Auto-reconnection failed:', error.message);
        }
      }, 5000);
    }
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully');
    isConnected = true;
  });

  mongoose.connection.on('reconnectFailed', () => {
    console.error('❌ MongoDB reconnection failed after multiple attempts');
    isConnected = false;
  });

  // Additional event handlers for better monitoring
  mongoose.connection.on('connecting', () => {
    console.log('🔄 MongoDB connecting...');
  });

  mongoose.connection.on('disconnecting', () => {
    console.log('🔌 MongoDB disconnecting...');
  });

  mongoose.connection.on('close', () => {
    console.log('🔒 MongoDB connection closed');
    isConnected = false;
  });
}

/**
 * Check if MongoDB is connected
 * @returns {boolean} Connection status
 */
function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get current connection state
 * @returns {string} Human-readable connection state
 */
function getConnectionState() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

/**
 * Get connection information
 * @returns {object} Connection details
 */
function getConnectionInfo() {
  return {
    readyState: mongoose.connection.readyState,
    state: getConnectionState(),
    name: mongoose.connection.name,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    isConnected: isConnected,
    mongooseVersion: mongoose.version
  };
}

/**
 * Gracefully close MongoDB connection
 * @returns {Promise<void>}
 */
async function closeDB() {
  try {
    console.log('🔌 Closing MongoDB connection...');
    await mongoose.connection.close();
    isConnected = false;
    console.log('✅ MongoDB connection closed successfully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
    throw error;
  }
}

// Export functions
module.exports = {
  connectDB,
  isDBConnected,
  getConnectionState,
  getConnectionInfo,
  closeDB,
  mongoose
};