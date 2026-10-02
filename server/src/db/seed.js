import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { loadConfig } from '../config/env.js';
import { createDatabasePool } from './pool.js';

if (process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Set ALLOW_DEMO_SEED=true to create the three local demo accounts.');
}

const requiredVariables = [
  'DEMO_STUDENT_PASSWORD',
  'DEMO_PROFESSOR_PASSWORD',
  'DEMO_ADMIN_PASSWORD',
];

for (const variable of requiredVariables) {
  if (!process.env[variable] || process.env[variable].length < 10) {
    throw new Error(`${variable} must contain at least 10 characters.`);
  }
}

const config = loadConfig();
const pool = createDatabasePool(config.database);
const connection = await pool.getConnection();

const accounts = [
  {
    name: 'Demo Student',
    email: (process.env.DEMO_STUDENT_EMAIL || 'student@tua.edu').trim().toLowerCase(),
    password: process.env.DEMO_STUDENT_PASSWORD,
    role: 'student',
  },
  {
    name: 'Demo Professor',
    email: (process.env.DEMO_PROFESSOR_EMAIL || 'professor@tua.edu').trim().toLowerCase(),
    password: process.env.DEMO_PROFESSOR_PASSWORD,
    role: 'professor',
  },
  {
    name: 'Demo Admin',
    email: (process.env.DEMO_ADMIN_EMAIL || 'admin@tua.edu').trim().toLowerCase(),
    password: process.env.DEMO_ADMIN_PASSWORD,
    role: 'admin',
  },
];

try {
  await connection.beginTransaction();
  for (const account of accounts) {
    const password = await bcrypt.hash(account.password, 12);
    await connection.execute(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password = VALUES(password),
         role = VALUES(role)`,
      [account.name, account.email, password, account.role],
    );
  }
  await connection.commit();
  console.log('Demo student, professor, and admin accounts are ready.');
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
