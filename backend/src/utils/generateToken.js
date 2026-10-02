import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

const generateToken = (id, expiresIn = '7d') =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn });

export default generateToken;
