const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI || process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set — check your .env file');
  }
  // Default Mongoose timeout is 30s before giving up — too slow for local
  // dev/demo iteration, where a wrong URI should fail fast and obviously.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected');
}

module.exports = { connectDB };
