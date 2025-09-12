const mongoose = require('mongoose');

/**
 * MongoDB Connection Configuration
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

    // Cloud deployment optimized connection options
    const connectionOptions = {
      // Connection pooling
      maxPoolSize: 10,
      minPoolSize: 2,

      // Timeouts optimized for cloud deployment
      serverSelectionTimeoutMS: 30000, // Increased from default 30000ms
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxIdleTimeMS: 30000,

      // Retry and reliability
      retryWrites: true,
      retryReads: true,

      // Buffer management
      bufferCommands: false,
      bufferMaxEntries: 0,

      // Legacy options for compatibility
      useNewUrlParser: true,
      useUnifiedTopology: true,

      // Heartbeat and monitoring
      heartbeatFrequencyMS: 10000,
      maxStalenessSeconds: 90,
    };

    // Attempt connection
    await mongoose.connect(mongoURI, connectionOptions);

    isConnected = true;
    connectionAttempts = 0;

    console.log('✅ MongoDB connected successfully!');
    console.log(`🔗 Connection state: ${mongoose.connection.readyState}`);
    console.log(`📊 Connection pool size: ${connectionOptions.maxPoolSize}`);

    // Set up connection event handlers
    setupConnectionEventHandlers();

    return true;

  } catch (error) {
    isConnected = false;
    connectionAttempts++;

    console.error('❌ MongoDB connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Attempt: ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);

    // Log additional error details in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('   Full error:', error);
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
  closeDB,
  mongoose
};