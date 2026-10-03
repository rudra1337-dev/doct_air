import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { NODE_ENV } from '../config/env.js';

/**
 * Automatically seeds standard demonstration accounts in non-production environments
 * to facilitate local testing of role-based portals (PATIENT, PROFESSIONAL, ADMIN).
 */
export const seedDevUsers = async () => {
  if (NODE_ENV === 'production') return;

  try {
    const demoAccounts = [
      {
        name: 'Jane Doe',
        email: 'patient@doctair.org',
        password: 'Patient123!',
        role: 'PATIENT',
      },
      {
        name: 'Dr. Sarah Chen, MD',
        email: 'dr.chen@doctair.org',
        password: 'Doctor123!',
        role: 'PROFESSIONAL',
      },
      {
        name: 'System Administrator',
        email: 'admin@doctair.org',
        password: 'Admin123!',
        role: 'ADMIN',
      },
    ];

    for (const account of demoAccounts) {
      const exists = await User.findOne({ email: account.email });
      if (!exists) {
        const passwordHash = await bcrypt.hash(account.password, 12);
        await User.create({
          name: account.name,
          email: account.email,
          passwordHash,
          role: account.role,
          isActive: true,
        });
        console.log(`[Seed] Created dev demo user: ${account.email} (${account.role})`);
      }
    }
  } catch (error) {
    console.warn('[Seed] Dev user seeding skipped:', error.message);
  }
};
