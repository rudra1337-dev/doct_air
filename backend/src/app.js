import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { errorHandler } from './middleware/errorMiddleware.js';
import routes from './routes/index.js';
import { CLIENT_URL, NODE_ENV } from './config/env.js';

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

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: NODE_ENV });
});

// Central error handler (must be registered last)
app.use(errorHandler);

export { app };
export default app;
