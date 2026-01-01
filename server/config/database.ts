import mongoose from 'mongoose';

// Cache the database connection for serverless
let cachedConnection: typeof mongoose | null = null;

export const connectDB = async () => {
  // Return cached connection if available
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('✅ Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mealshare';
    
    if (!mongoURI || mongoURI === 'mongodb://localhost:27017/mealshare') {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('📡 Connecting to MongoDB...');
    
    // Configure mongoose for serverless with optimized settings
    mongoose.set('strictQuery', false);
    
    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Maintain up to 10 connections
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      w: 'majority'
    });
    
    cachedConnection = connection;
    console.log('✅ MongoDB Connected Successfully');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    cachedConnection = null;
    // Don't exit in serverless environment - just throw the error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});
