import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'atharv_legal_ai_jwt_secret_key_2026_secure';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['USER', 'ADMIN']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      }

      const { email, password, name, role } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: role || 'USER'
        }
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Please provide email and password' });
      }

      const { email, password } = parsed.data;
      let user = await prisma.user.findUnique({ where: { email } });

      // If user not found, auto-provision demo credentials so demo access never fails on fresh/unseeded databases
      if (!user) {
        const isDemoUser = (email === 'user@atharv.legal' || email === 'user@mira.legal') && password === 'user123';
        const isDemoAdmin = (email === 'admin@atharv.legal' || email === 'admin@mira.legal') && password === 'admin123';

        if (isDemoUser || isDemoAdmin) {
          const role = isDemoAdmin ? 'ADMIN' : 'USER';
          const name = isDemoAdmin ? 'Atharv Legal Admin (Legal Lead)' : 'Atharv Researcher';
          const passwordHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: { email, passwordHash, name, role }
          });
        } else {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
      } else {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          // If demo user password mismatch, auto-sync to default demo password
          if ((email === 'user@atharv.legal' && password === 'user123') || (email === 'admin@atharv.legal' && password === 'admin123')) {
            const newHash = await bcrypt.hash(password, 10);
            user = await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: newHash }
            });
          } else {
            return res.status(401).json({ error: 'Invalid email or password' });
          }
        }
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  async me(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  }
}

export const authController = new AuthController();
