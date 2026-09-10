import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import aiRoutes from './routes/ai.routes.js';
import clausesRoutes from './routes/clauses.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import templatesRoutes from './routes/templates.routes.js';
import researchRoutes from './routes/research.routes.js';
import { legalNLPClient } from './services/nlp/legal_nlp_client.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Health Check
app.get('/health', async (req, res) => {
  const nlpHealth = await legalNLPClient.healthCheck();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Atharv Legal AI Document Generation & Validation Backend',
    nlpService: nlpHealth
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/clauses', clausesRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/research', researchRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Atharv Legal AI API Server running on port ${PORT}`);
  console.log(`📡 Connected to PostgreSQL (pgvector) & Legal NLP Service`);
});

export default app;
