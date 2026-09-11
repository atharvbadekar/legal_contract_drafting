import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { agentPlanner } from '../services/agent/agent_planner.js';
import { validationEngine } from '../services/validation/validation_engine.js';
import { patchService } from '../services/validation/patch_service.js';
import { exportService } from '../services/documents/export_service.js';
import { parseDocumentStructure } from '../services/documents/document_structure.js';

export class DocumentsController {
  async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const documents = await prisma.document.findMany({
        where: isAdmin ? {} : { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { versions: true } }
        }
      });

      return res.json({ documents });
    } catch (err: any) {
      console.error('List documents error:', err);
      return res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { title, documentType, structuredFacts, content, generationMode } = req.body;

      if (!documentType) {
        return res.status(400).json({ error: 'Document type is required (NDA or LEGAL_NOTICE)' });
      }

      const doc = await prisma.document.create({
        data: {
          userId,
          title: title || `New ${documentType}`,
          documentType,
          generationMode: generationMode || 'MIRA',
          structuredFacts: structuredFacts || {},
          content: content || '',
          status: 'DRAFT'
        }
      });

      // Create initial version
      await prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          structuredFacts: doc.structuredFacts as any,
          content: doc.content,
          createdById: userId
        }
      });

      return res.status(201).json({ document: doc });
    } catch (err: any) {
      console.error('Create document error:', err);
      return res.status(500).json({ error: 'Failed to create document' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: { createdBy: { select: { name: true } } }
          },
          agentRuns: {
            orderBy: { startedAt: 'desc' },
            take: 3,
            include: { steps: { orderBy: { stepNumber: 'asc' } } }
          },
          validationResults: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (!isAdmin && document.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json({ document });
    } catch (err: any) {
      console.error('Get document error:', err);
      return res.status(500).json({ error: 'Failed to retrieve document' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const { title, content, structuredFacts, saveAsVersion } = req.body;

      const existing = await prisma.document.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Document not found' });
      }
      if (!isAdmin && existing.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          title: title ?? existing.title,
          content: content ?? existing.content,
          structuredFacts: structuredFacts ?? existing.structuredFacts
        }
      });

      if (saveAsVersion && content) {
        const latestVersion = await prisma.documentVersion.findFirst({
          where: { documentId: id },
          orderBy: { versionNumber: 'desc' }
        });
        const nextNum = (latestVersion?.versionNumber || 0) + 1;

        await prisma.documentVersion.create({
          data: {
            documentId: id,
            versionNumber: nextNum,
            content: updated.content,
            structuredFacts: updated.structuredFacts as any,
            validationResult: updated.validationSummary as any,
            createdById: userId
          }
        });
      }

      return res.json({ document: updated });
    } catch (err: any) {
      console.error('Update document error:', err);
      return res.status(500).json({ error: 'Failed to update document' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const existing = await prisma.document.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Document not found' });
      }
      if (!isAdmin && existing.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.document.delete({ where: { id } });
      return res.json({ message: 'Document deleted successfully' });
    } catch (err: any) {
      console.error('Delete document error:', err);
      return res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  async generate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { rawInput, documentType, structuredFacts, generationMode } = req.body;

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const docType = documentType || doc.documentType;
      const mode = generationMode || doc.generationMode || 'MIRA';

      const result = await agentPlanner.executeMiraPipeline(
        id,
        rawInput || '',
        docType,
        structuredFacts || (doc.structuredFacts as any),
        mode
      );

      const refreshed = await prisma.document.findUnique({
        where: { id },
        include: {
          agentRuns: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            include: { steps: { orderBy: { stepNumber: 'asc' } } }
          }
        }
      });

      return res.json({
        result,
        document: refreshed
      });
    } catch (err: any) {
      console.error('Generation pipeline error:', err);
      return res.status(500).json({ error: `Generation failed: ${err.message}` });
    }
  }

  async validate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content, structuredFacts } = req.body;

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const docContent = content || doc.content;
      const facts = structuredFacts || (doc.structuredFacts as any) || {};

      // Parse sections using unified document structure parser
      const parsed = parseDocumentStructure(docContent);
      const sectionBlocks = parsed.sections.map(s => ({
        sectionType: s.sectionType,
        title: s.title,
        content: s.content
      }));

      // Retrieve approved clauses for comparison
      const approvedClauses = await prisma.clause.findMany({
        where: { documentType: doc.documentType, status: 'APPROVED' }
      });

      const validationResult = await validationEngine.validate(
        doc.documentType,
        sectionBlocks,
        facts,
        approvedClauses.map(c => ({ clauseType: c.clauseType, title: c.title, content: c.content })),
        docContent
      );

      // Record result
      await prisma.validationResult.create({
        data: {
          documentId: id,
          layer: 'DETERMINISTIC',
          status: validationResult.status,
          score: validationResult.overallScore,
          issues: validationResult.allIssues as any
        }
      });

      // Update doc validation summary
      const updated = await prisma.document.update({
        where: { id },
        data: {
          content: docContent,
          validationScore: validationResult.overallScore,
          status: validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW',
          validationSummary: {
            status: validationResult.status,
            score: validationResult.overallScore,
            layerScores: validationResult.layerScores,
            issues: validationResult.allIssues,
            summaryCounts: validationResult.summaryCounts,
            disclaimer: validationResult.disclaimer
          } as any
        }
      });

      return res.json({ validationResult, document: updated });
    } catch (err: any) {
      console.error('Validation error:', err);
      return res.status(500).json({ error: `Validation failed: ${err.message}` });
    }
  }

  async getVersions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const versions = await prisma.documentVersion.findMany({
        where: { documentId: id },
        orderBy: { versionNumber: 'desc' },
        include: { createdBy: { select: { name: true, email: true } } }
      });
      return res.json({ versions });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve versions' });
    }
  }

  async restoreVersion(req: AuthRequest, res: Response) {
    try {
      const { id, versionId } = req.params;
      const version = await prisma.documentVersion.findUnique({
        where: { id: versionId }
      });

      if (!version || version.documentId !== id) {
        return res.status(404).json({ error: 'Version not found' });
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          content: version.content,
          structuredFacts: version.structuredFacts as any,
          validationSummary: version.validationResult as any
        }
      });

      return res.json({ message: `Restored to version ${version.versionNumber}`, document: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to restore version' });
    }
  }

  async exportDocx(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const buffer = await exportService.generateDocx(doc.title, doc.content);
      const filename = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err: any) {
      console.error('Docx export error:', err);
      return res.status(500).json({ error: 'Failed to export DOCX' });
    }
  }

  async exportPdf(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const buffer = await exportService.generatePdf(doc.title, doc.content);
      const filename = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err: any) {
      console.error('PDF export error:', err);
      return res.status(500).json({ error: 'Failed to export PDF' });
    }
  }

  async getIssuePatch(req: AuthRequest, res: Response) {
    try {
      const { id, issueId } = req.params;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const summary = (doc.validationSummary as any) || {};
      const issue = (summary.issues || []).find((i: any) => i.id === issueId || i.issueId === issueId) || req.body.issue;
      if (!issue) return res.status(404).json({ error: 'Issue not found' });

      const patch = await patchService.generatePatchForIssue({
        documentType: doc.documentType,
        content: doc.content,
        issue,
        structuredFacts: (doc.structuredFacts as any) || {}
      });

      return res.json({ patch });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async applyIssuePatch(req: AuthRequest, res: Response) {
    try {
      const { id, issueId } = req.params;
      const { patch } = req.body;
      const userId = req.user?.id || 'system';

      let targetPatch = patch;
      if (!targetPatch) {
        const doc = await prisma.document.findUnique({ where: { id } });
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        const summary = (doc.validationSummary as any) || {};
        const issue = (summary.issues || []).find((i: any) => i.id === issueId || i.issueId === issueId);
        targetPatch = await patchService.generatePatchForIssue({
          documentType: doc.documentType,
          content: doc.content,
          issue: issue || { id: issueId },
          structuredFacts: (doc.structuredFacts as any) || {}
        });
      }

      if (targetPatch && !targetPatch.canAutoFix && targetPatch.mode === 'MANUAL') {
        return res.status(400).json({
          error: targetPatch.reason || 'This issue requires a manual business decision. ATHARV does not invent missing terms.'
        });
      }

      const result = await patchService.verifyAndApplyPatch({
        documentId: id,
        patch: targetPatch,
        userId
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async fixAllSafe(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';

      const result = await patchService.batchApplySafePatches({
        documentId: id,
        userId
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async undoLastFix(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';

      const result = await patchService.undoLastFix({
        documentId: id,
        userId
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const documentsController = new DocumentsController();
