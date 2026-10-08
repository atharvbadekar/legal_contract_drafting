import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Auto-load .env if DATABASE_URL is not already populated in the process environment
if (!process.env.DATABASE_URL) {
  dotenv.config();
  if (!process.env.DATABASE_URL) {
    const parentEnv = path.resolve(process.cwd(), '..', '.env');
    if (fs.existsSync(parentEnv)) {
      dotenv.config({ path: parentEnv });
    }
  }
}

// Ensure Prisma never crashes with "Environment variable not found: DATABASE_URL"
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:root@localhost:5432/mira_db?schema=public';
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['warn'] : []
});

export default prisma;
