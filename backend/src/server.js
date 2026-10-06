import app from './app.js';
import connectDB, { closeDB } from './config/db.js';
import { seedDevUsers } from './utils/seedDevUsers.js';
import { PORT, NODE_ENV } from './config/env.js';

let serverInstance = null;

export const startServer = async () => {
  try {
    // 1. Connect to MongoDB first
    await connectDB();

    // 2. Seed development demonstration accounts
    await seedDevUsers();

    // 3. Start server only after DB connection succeeds
    serverInstance = app.listen(PORT, () => {
      console.log(`DoctAir API server running on port ${PORT} [${NODE_ENV}]`);
    });

    return serverInstance;
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (serverInstance) {
    serverInstance.close(async () => {
      console.log('HTTP server closed.');
      await closeDB();
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start application
startServer();

export default app;
