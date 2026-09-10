import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { ragService } from '../services/rag/rag_service.js';

export class KnowledgeController {
  async list(req: AuthRequest, res: Response) {
    try {
      const documents = await prisma.knowledgeDocument.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { name: true, email: true } },
          _count: { select: { chunks: true } }
        }
      });
      return res.json({ documents });
    } catch (err: any) {
      console.error('List knowledge error:', err);
      return res.status(500).json({ error: 'Failed to retrieve knowledge documents' });
    }
  }

  async getChunks(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const doc = await prisma.knowledgeDocument.findUnique({
        where: { id },
        include: {
          chunks: { orderBy: { chunkIndex: 'asc' } }
        }
      });
      if (!doc) {
        return res.status(404).json({ error: 'Knowledge document not found' });
      }
      return res.json({ document: doc });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve chunks' });
    }
  }

  async upload(req: AuthRequest, res: Response) {
    try {
      const { title, source, documentType, rawText, jurisdiction, effectiveDate } = req.body;
      if (!title || !rawText) {
        return res.status(400).json({ error: 'Title and rawText are required' });
      }

      const docId = await ragService.ingestKnowledgeDocument(
        title,
        source || 'Institutional Legal Repository',
        documentType || 'GENERAL',
        rawText,
        req.user!.id,
        jurisdiction || 'India',
        effectiveDate
      );

      const created = await prisma.knowledgeDocument.findUnique({
        where: { id: docId },
        include: { _count: { select: { chunks: true } } }
      });

      return res.status(201).json({ message: 'Knowledge document ingested successfully', document: created });
    } catch (err: any) {
      console.error('Upload knowledge error:', err);
      return res.status(500).json({ error: `Failed to ingest knowledge: ${err.message}` });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.knowledgeDocument.delete({ where: { id } });
      return res.json({ message: 'Knowledge document deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete knowledge document' });
    }
  }
}

export const knowledgeController = new KnowledgeController();
