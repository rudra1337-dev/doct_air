import dns from 'dns';
import mongoose from 'mongoose';
import { MONGO_URI, NODE_ENV } from './env.js';

// Prioritize IPv4 resolution to prevent ENETUNREACH errors on MongoDB Atlas SRV / dual-stack clusters
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if not supported in runtime
}

let memoryServerInstance = null;

const connectDB = async () => {
  // 1. If explicit MONGO_URI is provided, attempt connection with a short initial timeout
  if (MONGO_URI) {
    try {
      const conn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // 5s fast-fail if local daemon or remote cluster is inactive
      });
      console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn(`[MongoDB] Connection to ${MONGO_URI} failed (${err.message}).`);
      // Cleanly teardown failed connection before in-memory fallback
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
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
