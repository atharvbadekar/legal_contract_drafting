import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { legalNLPClient } from '../services/nlp/legal_nlp_client.js';
import { vectorStore } from '../services/rag/vector_store.js';

export class ClausesController {
  async list(req: AuthRequest, res: Response) {
    try {
      const { documentType, status, clauseType } = req.query;

      const where: any = {};
      if (documentType) where.documentType = String(documentType);
      if (status) where.status = String(status);
      if (clauseType) where.clauseType = String(clauseType);

      const clauses = await prisma.clause.findMany({
        where,
        orderBy: [{ documentType: 'asc' }, { clauseType: 'asc' }]
      });

      return res.json({ clauses });
    } catch (err: any) {
      console.error('List clauses error:', err);
      return res.status(500).json({ error: 'Failed to retrieve clauses' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { title, documentType, clauseType, content, jurisdiction, status } = req.body;
      if (!title || !documentType || !clauseType || !content) {
        return res.status(400).json({ error: 'title, documentType, clauseType, and content are required' });
      }

      const clause = await prisma.clause.create({
        data: {
          title,
          documentType,
          clauseType,
          content,
          jurisdiction: jurisdiction || 'India',
          status: status || 'DRAFT'
        }
      });

      // Compute embedding via Legal-BERT
      try {
        const embs = await legalNLPClient.getEmbeddings([content]);
        if (embs && embs[0]) {
          await vectorStore.updateClauseEmbedding(clause.id, embs[0]);
        }
      } catch (err) {
        console.warn('Embedding computation warning on clause creation');
      }

      return res.status(201).json({ clause });
    } catch (err: any) {
      console.error('Create clause error:', err);
      return res.status(500).json({ error: 'Failed to create clause' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, clauseType, content, jurisdiction, status } = req.body;

      const updated = await prisma.clause.update({
        where: { id },
        data: {
          title,
          clauseType,
          content,
          jurisdiction,
          status,
          version: { increment: 1 }
        }
      });

      if (content) {
        try {
          const embs = await legalNLPClient.getEmbeddings([content]);
          if (embs && embs[0]) {
            await vectorStore.updateClauseEmbedding(id, embs[0]);
          }
        } catch (err) {
          console.warn('Embedding update warning on clause update');
        }
      }

      return res.json({ clause: updated });
    } catch (err: any) {
      console.error('Update clause error:', err);
      return res.status(500).json({ error: 'Failed to update clause' });
    }
  }

  async approve(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.clause.update({
        where: { id },
        data: { status: 'APPROVED' }
      });
      return res.json({ message: 'Clause approved successfully', clause: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to approve clause' });
    }
  }

  async archive(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.clause.update({
        where: { id },
        data: { status: 'ARCHIVED' }
      });
      return res.json({ message: 'Clause archived successfully', clause: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to archive clause' });
    }
  }
}

export const clausesController = new ClausesController();
