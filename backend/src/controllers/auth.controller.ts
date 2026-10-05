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
      const isDemoUser = (email === 'user@atharv.legal' || email === 'user@mira.legal') && password === 'user123';
      const isDemoAdmin = (email === 'admin@atharv.legal' || email === 'admin@mira.legal') && password === 'admin123';

      // Fast-path resilient demo authentication
      if (isDemoUser || isDemoAdmin) {
        const role = isDemoAdmin ? 'ADMIN' : 'USER';
        const name = isDemoAdmin ? 'Atharv Legal Admin (Legal Lead)' : 'Atharv Researcher';
        let user: any = null;

        try {
          user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            const passwordHash = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
              data: { email, passwordHash, name, role }
            });
          } else {
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) {
              const newHash = await bcrypt.hash(password, 10);
              user = await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newHash }
              });
            }
          }
        } catch (dbErr) {
          console.warn('Database offline or unreachable during demo login. Issuing resilient demo session:', dbErr);
          user = {
            id: isDemoAdmin ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
            email,
            name,
            role
          };
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
      }

      // Standard user authentication
      let user;
      try {
        user = await prisma.user.findUnique({ where: { email } });
      } catch (dbErr: any) {
        console.error('Database connection error during login:', dbErr);
        return res.status(503).json({ error: 'Database service is currently unreachable. Please check PostgreSQL connection.' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
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

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, role: true, createdAt: true }
      });

      if (user) {
        return res.json({ user });
      }
    } catch (err) {
      console.warn('Database query failed in me(), falling back to token identity:', err);
    }

    // Graceful fallback for demo or resilient sessions
    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        createdAt: new Date().toISOString()
      }
    });
  }
}

export const authController = new AuthController();
