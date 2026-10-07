import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { legalNLPClient } from '../services/nlp/legal_nlp_client.js';
import { vectorStore } from '../services/rag/vector_store.js';
import { clauseSelector } from '../services/clauses/clause_selector.js';

export class ClausesController {
  async list(req: AuthRequest, res: Response) {
    try {
      const { documentType, status, clauseType, variant, riskLevel, search } = req.query;

      const where: any = {};
      if (documentType && documentType !== 'ALL') {
        const normDocType = String(documentType).toUpperCase().trim();
        where.OR = [
          { documentType: normDocType },
          { documentType: normDocType.replace(/_AGREEMENT$/, '') },
          { contractType: normDocType }
        ];
      }
      if (status && status !== 'ALL') where.status = String(status);
      if (clauseType) where.clauseType = String(clauseType);
      if (variant && variant !== 'ALL') where.variant = String(variant);
      if (riskLevel && riskLevel !== 'ALL') where.riskLevel = String(riskLevel);

      let clauses: any[] = [];
      try {
        clauses = await prisma.clause.findMany({
          where,
          include: { variants: true },
          orderBy: [{ documentType: 'asc' }, { clauseType: 'asc' }, { version: 'desc' }]
        });
      } catch (dbErr: any) {
        console.warn('Prisma list clauses failed, returning empty list in demo/offline mode:', dbErr.message);
        clauses = [];
      }

      // Keyword search filter (in-memory if search query provided)
      if (search && typeof search === 'string' && search.trim()) {
        const q = search.toLowerCase().trim();
        clauses = clauses.filter(
          c =>
            (c.title && c.title.toLowerCase().includes(q)) ||
            (c.content && c.content.toLowerCase().includes(q)) ||
            (c.clauseType && c.clauseType.toLowerCase().includes(q)) ||
            (c.variant && c.variant.toLowerCase().includes(q))
        );
      }

      return res.json({ clauses });
    } catch (err: any) {
      console.error('List clauses error:', err);
      return res.status(500).json({ error: 'Failed to retrieve clauses' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clause = await prisma.clause.findUnique({
        where: { id },
        include: { variants: true }
      });
      if (!clause) {
        return res.status(404).json({ error: 'Clause not found' });
      }
      return res.json({ clause });
    } catch (err: any) {
      console.error('Get clause error:', err);
      return res.status(500).json({ error: 'Failed to retrieve clause' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const {
        title,
        documentType,
        contractType,
        clauseType,
        content,
        text,
        variant = 'standard',
        requiredStatus = 'RECOMMENDED',
        conditions = {},
        riskLevel = 'LOW',
        jurisdiction = 'India',
        source,
        sourceUrl,
        status = 'DRAFT'
      } = req.body;

      const effectiveDocType = (documentType || contractType || '').toUpperCase().trim();
      const effectiveContent = (content || text || '').trim();

      if (!title || !effectiveDocType || !clauseType || !effectiveContent) {
        return res.status(400).json({
          error: 'title, documentType, clauseType, and content/text are required'
        });
      }

      const clause = await (prisma.clause as any).create({
        data: {
          title,
          documentType: effectiveDocType,
          contractType: effectiveDocType,
          clauseType: clauseType.toLowerCase().trim(),
          content: effectiveContent,
          text: effectiveContent,
          variant,
          requiredStatus,
          requiredLevel: requiredStatus,
          conditions: typeof conditions === 'object' ? conditions : {},
          riskLevel,
          jurisdiction: jurisdiction || 'India',
          source,
          sourceUrl,
          status: status || 'DRAFT'
        }
      });

      // Compute embedding via Legal-BERT
      try {
        const embs = await legalNLPClient.getEmbeddings([effectiveContent]);
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
      const {
        title,
        clauseType,
        content,
        text,
        variant,
        requiredStatus,
        conditions,
        riskLevel,
        jurisdiction,
        source,
        sourceUrl,
        status
      } = req.body;

      const effectiveContent = content || text;

      const updated = await (prisma.clause as any).update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(clauseType ? { clauseType: clauseType.toLowerCase().trim() } : {}),
          ...(effectiveContent ? { content: effectiveContent, text: effectiveContent } : {}),
          ...(variant ? { variant } : {}),
          ...(requiredStatus ? { requiredStatus, requiredLevel: requiredStatus } : {}),
          ...(conditions !== undefined ? { conditions } : {}),
          ...(riskLevel ? { riskLevel } : {}),
          ...(jurisdiction ? { jurisdiction } : {}),
          ...(source !== undefined ? { source } : {}),
          ...(sourceUrl !== undefined ? { sourceUrl } : {}),
          ...(status ? { status } : {}),
          version: { increment: 1 }
        }
      });

      if (effectiveContent) {
        try {
          const embs = await legalNLPClient.getEmbeddings([effectiveContent]);
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

  async createVersion(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, content, variant, riskLevel, notes } = req.body;

      const parentClause: any = await prisma.clause.findUnique({ where: { id } });
      if (!parentClause) {
        return res.status(404).json({ error: 'Parent clause not found' });
      }

      // Increment version on parent and create a recorded variant
      const newVersion = parentClause.version + 1;
      const effectiveContent = content || parentClause.content;

      const [updatedClause, variantRecord] = await prisma.$transaction([
        (prisma.clause as any).update({
          where: { id },
          data: {
            title: title || parentClause.title,
            content: effectiveContent,
            text: effectiveContent,
            variant: variant || parentClause.variant,
            riskLevel: riskLevel || parentClause.riskLevel,
            version: newVersion,
            status: 'APPROVED'
          }
        }),
        (prisma.clauseVariant as any).create({
          data: {
            clauseId: id,
            variantKey: variant || parentClause.variant || `v${newVersion}`,
            name: `${parentClause.title} (v${newVersion}${notes ? ` - ${notes}` : ''})`,
            content: effectiveContent,
            riskLevel: riskLevel || parentClause.riskLevel || 'LOW'
          }
        })
      ]);

      // Re-embed new content
      try {
        const embs = await legalNLPClient.getEmbeddings([effectiveContent]);
        if (embs && embs[0]) {
          await vectorStore.updateClauseEmbedding(id, embs[0]);
        }
      } catch (err) {
        console.warn('Embedding update warning on version creation');
      }

      return res.status(201).json({
        message: `Version ${newVersion} created successfully`,
        clause: updatedClause,
        variant: variantRecord
      });
    } catch (err: any) {
      console.error('Create clause version error:', err);
      return res.status(500).json({ error: 'Failed to create clause version' });
    }
  }

  async select(req: AuthRequest, res: Response) {
    try {
      const { contractType, clauseType, facts, targetContextText, preferredVariant, preferredJurisdiction, limit } = req.body;

      if (!contractType) {
        return res.status(400).json({ error: 'contractType is required for clause selection' });
      }

      const selected = await clauseSelector.selectApprovedClauses({
        contractType,
        clauseType,
        facts,
        targetContextText,
        preferredVariant,
        preferredJurisdiction,
        limit: limit ? Number(limit) : 5
      });

      return res.json({ clauses: selected });
    } catch (err: any) {
      console.error('Clause selection error:', err);
      return res.status(500).json({ error: 'Failed to select approved clauses' });
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
