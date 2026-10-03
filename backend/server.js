import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import connectDB from './src/config/db.js';
import { seedDevUsers } from './src/utils/seedDevUsers.js';
import { errorHandler } from './src/middleware/errorMiddleware.js';
import routes from './src/routes/index.js';
import { PORT, CLIENT_URL, NODE_ENV } from './src/config/env.js';

const app = express();

// Allowed origins for CORS with credentials
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// Core middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        (NODE_ENV !== 'production' && origin.startsWith('http://localhost:'))
      ) {
        return callback(null, origin);
      }

      return callback(new Error(`CORS origin ${origin} not permitted`));
    },
    credentials: true, // Allow httpOnly session cookies
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: NODE_ENV });
});

// Central error handler (must be last middleware)
app.use(errorHandler);

// Start application
const startServer = async () => {
  try {
    // 1. Connect to MongoDB first
    await connectDB();

    // 2. Seed development demonstration accounts
    await seedDevUsers();

    // 3. Start server only after DB connection succeeds
    app.listen(PORT, () => {
      console.log(`DoctAir API server running on port ${PORT} [${NODE_ENV}]`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();