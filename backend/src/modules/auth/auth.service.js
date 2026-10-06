import bcrypt from 'bcryptjs';
import User from '../../models/User.js';

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if an account already exists with this email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password with bcrypt cost factor of 12
  const passwordHash = await bcrypt.hash(password, 12);

  // Normal public signup is strictly enrolled as PATIENT
  // Professional or Admin roles cannot be self-assigned via registration payload
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'PATIENT',
    isActive: true,
  });

  return newUser;
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by normalized email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Verify password using constant-time bcrypt compare
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check account active state
  if (!user.isActive) {
    const error = new Error('This account has been deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();

  return user;
};

export const getUserById = async (id) => {
  const user = await User.findById(id).select('-passwordHash');
  return user;
};
