import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Resolve directory of current file and load .env from backend root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Central environment-variable access — never hard-code secrets
export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET || 'doctair_dev_jwt_secret_key_safe_for_local_only';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const COOKIE_NAME = 'doctair_token';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Gemini AI Configuration
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const GEMINI_TEMPERATURE = process.env.GEMINI_TEMPERATURE
  ? parseFloat(process.env.GEMINI_TEMPERATURE)
  : 0.3;
export const GEMINI_MAX_OUTPUT_TOKENS = process.env.GEMINI_MAX_OUTPUT_TOKENS
  ? parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS, 10)
  : 1024;

// Conversation & Context Configuration
export const CONVERSATION_HISTORY_LIMIT = process.env.CONVERSATION_HISTORY_LIMIT
  ? parseInt(process.env.CONVERSATION_HISTORY_LIMIT, 10)
  : 20;

// Document Upload Configuration
export const MAX_DOCUMENT_FILE_SIZE_MB = process.env.MAX_DOCUMENT_FILE_SIZE_MB
  ? parseInt(process.env.MAX_DOCUMENT_FILE_SIZE_MB, 10)
  : 10;
export const MAX_DOCUMENT_FILE_SIZE_BYTES = MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024;
export const DOCUMENT_UPLOAD_DIR = process.env.DOCUMENT_UPLOAD_DIR || 'uploads/documents';


