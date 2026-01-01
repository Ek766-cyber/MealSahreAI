import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mealshare';
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB Connected Successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
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
