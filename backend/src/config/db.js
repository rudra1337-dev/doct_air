import mongoose from 'mongoose';
import { MONGO_URI, NODE_ENV } from './env.js';

let memoryServerInstance = null;

const connectDB = async () => {
  // 1. If explicit MONGO_URI is provided, attempt connection with a short initial timeout
  if (MONGO_URI) {
    try {
      const conn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 3000, // 3s fast-fail if local daemon is inactive
      });
      console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn(`[MongoDB] Connection to ${MONGO_URI} failed (${err.message}).`);
    }
  }

  // 2. In non-production, fallback to MongoMemoryServer for standalone zero-config dev/test
  if (NODE_ENV !== 'production') {
    try {
      console.log('[MongoDB] Starting in-memory Mongo database for development...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const memoryUri = memoryServerInstance.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[MongoDB] Connected to in-memory instance: ${memoryUri}`);
      return conn;
    } catch (memErr) {
      console.error('[MongoDB] Failed to start in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }

  console.error('[MongoDB] Cannot start without a valid MONGO_URI in production.');
  process.exit(1);
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
  }
};

export default connectDB;
