import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { agentPlanner } from '../services/agent/agent_planner.js';
import { validationEngine } from '../services/validation/validation_engine.js';
import { patchService } from '../services/validation/patch_service.js';
import { exportService } from '../services/documents/export_service.js';
import { parseDocumentStructure } from '../services/documents/document_structure.js';
import { contractAnalyzer } from '../services/analyzer/contract_analyzer.js';
import { diffService } from '../utils/diff_service.js';

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

      let validationResult: any = null;
      let newValidationScore = existing.validationScore;
      let newStatus = existing.status;
      let newValidationSummary = existing.validationSummary;

      const newContent = content ?? existing.content;
      const newFacts = structuredFacts ?? (existing.structuredFacts as any) ?? {};

      // Re-run validation whenever content or structured facts are updated
      if (content !== undefined || structuredFacts !== undefined) {
        const parsed = parseDocumentStructure(newContent);
        const sectionBlocks = parsed.sections.map(s => ({
          sectionType: s.sectionType,
          title: s.title,
          content: s.content
        }));

        const approvedClauses = await prisma.clause.findMany({
          where: { documentType: existing.documentType, status: 'APPROVED' }
        });

        validationResult = await validationEngine.validate(
          existing.documentType,
          sectionBlocks,
          newFacts,
          approvedClauses.map(c => ({ clauseType: c.clauseType, title: c.title, content: c.content })),
          newContent
        );

        newValidationScore = validationResult.overallScore;
        newStatus = validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW';
        newValidationSummary = {
          status: validationResult.status,
          score: validationResult.overallScore,
          layerScores: validationResult.layerScores,
          issues: validationResult.allIssues,
          summaryCounts: validationResult.summaryCounts,
          semanticStatus: validationResult.semanticStatus,
          disclaimer: validationResult.disclaimer
        };

        // Record validation result in database
        try {
          await prisma.validationResult.create({
            data: {
              documentId: id,
              layer: 'DETERMINISTIC',
              status: validationResult.status,
              score: validationResult.overallScore,
              issues: validationResult.allIssues as any
            }
          });
        } catch (dbErr) {
          console.warn('Failed to persist validation result record:', dbErr);
        }
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          title: title ?? existing.title,
          content: newContent,
          structuredFacts: newFacts as any,
          validationScore: newValidationScore,
          status: newStatus,
          validationSummary: newValidationSummary as any
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

      return res.json({ document: updated, validationResult });
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
            semanticStatus: validationResult.semanticStatus,
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
      const { patch, content: clientContent } = req.body;
      const userId = req.user?.id || 'system';

      let doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      // Sync database with current editor content if provided
      if (clientContent && clientContent !== doc.content) {
        doc = await prisma.document.update({
          where: { id },
          data: { content: clientContent }
        });
      }

      let targetPatch = patch;
      if (!targetPatch) {
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
        return res.status(200).json({
          success: false,
          applied: false,
          message: targetPatch.reason || 'This issue requires manual drafting. Please edit the text directly in the editor.',
          document: doc
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
      const { content: clientContent } = req.body;
      const userId = req.user?.id || 'system';

      if (clientContent) {
        await prisma.document.update({
          where: { id },
          data: { content: clientContent }
        });
      }

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

  async analyzeContract(req: AuthRequest, res: Response) {
    try {
      let text = '';
      let filename = req.body?.filename || 'Uploaded Contract';

      if (req.file) {
        filename = req.file.originalname || filename;
        text = await contractAnalyzer.extractTextFromBuffer(
          req.file.buffer,
          req.file.mimetype,
          filename
        );
      } else if (req.body?.text) {
        text = req.body.text;
      } else {
        return res.status(400).json({ error: 'No contract file or text provided for analysis.' });
      }

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'Extracted contract content is empty.' });
      }

      const result = await contractAnalyzer.analyzeContract(text, filename);
      return res.json({ result });
    } catch (err: any) {
      console.error('Contract analysis error:', err);
      return res.status(500).json({ error: `Contract analysis failed: ${err.message}` });
    }
  }

  async importAnalyzed(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { title, documentType, content, structuredFacts, health } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Document content is required to import.' });
      }

      const docType = documentType === 'LEGAL_NOTICE' ? 'LEGAL_NOTICE' : 'NDA';

      const doc = await prisma.document.create({
        data: {
          userId,
          title: title || `Analyzed ${docType}`,
          documentType: docType,
          generationMode: 'MIRA',
          structuredFacts: structuredFacts || {},
          content,
          status: 'NEEDS_REVIEW',
          validationScore: health?.score || 50,
          validationSummary: health ? {
            status: health.status === 'STRONG' ? 'PASSED' : 'NEEDS_REVIEW',
            score: health.score,
            layerScores: health.categoryScores,
            issues: [],
            disclaimer: health.disclaimer
          } : {}
        }
      });

      // Create initial version
      await prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          structuredFacts: doc.structuredFacts as any,
          content: doc.content,
          validationResult: doc.validationSummary as any,
          createdById: userId
        }
      });

      // Re-run validation to establish formal multi-tier audit record
      const parsed = parseDocumentStructure(content);
      const sectionBlocks = parsed.sections.map(s => ({
        sectionType: s.sectionType,
        title: s.title,
        content: s.content
      }));

      const approvedClauses = await prisma.clause.findMany({
        where: { documentType: docType, status: 'APPROVED' }
      });

      const validationResult = await validationEngine.validate(
        docType,
        sectionBlocks,
        structuredFacts || {},
        approvedClauses.map(c => ({ clauseType: c.clauseType, title: c.title, content: c.content })),
        content
      );

      const refreshed = await prisma.document.update({
        where: { id: doc.id },
        data: {
          validationScore: validationResult.overallScore,
          status: validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW',
          validationSummary: {
            status: validationResult.status,
            score: validationResult.overallScore,
            layerScores: validationResult.layerScores,
            issues: validationResult.allIssues,
            summaryCounts: validationResult.summaryCounts,
            semanticStatus: validationResult.semanticStatus,
            disclaimer: validationResult.disclaimer
          } as any
        }
      });

      return res.status(201).json({ document: refreshed });
    } catch (err: any) {
      console.error('Import analyzed contract error:', err);
      return res.status(500).json({ error: `Import failed: ${err.message}` });
    }
  }

  async reviewIssue(req: AuthRequest, res: Response) {
    try {
      const { id, issueId } = req.params;
      const { reviewStatus, note } = req.body;
      const userId = req.user!.id;

      if (!['ACCEPTED', 'DISMISSED', 'NEEDS_REVIEW'].includes(reviewStatus)) {
        return res.status(400).json({ error: 'Invalid review status. Must be ACCEPTED, DISMISSED, or NEEDS_REVIEW.' });
      }

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const summary = (doc.validationSummary as any) || {};
      const issues = (summary.issues || []).map((iss: any) => {
        if (iss.id === issueId || iss.issueId === issueId) {
          return {
            ...iss,
            reviewStatus,
            reviewedBy: userId,
            reviewedAt: new Date().toISOString(),
            reviewNote: note || undefined
          };
        }
        return iss;
      });

      const updatedSummary = {
        ...summary,
        issues
      };

      const updatedDoc = await prisma.document.update({
        where: { id },
        data: {
          validationSummary: updatedSummary as any
        }
      });

      // Record in AuditLog table
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action: `ISSUE_${reviewStatus}`,
            resourceType: 'DOCUMENT_ISSUE',
            resourceId: `${id}:${issueId}`,
            details: {
              documentId: id,
              issueId,
              reviewStatus,
              note: note || null,
              timestamp: new Date().toISOString()
            }
          }
        });
      } catch (auditErr) {
        console.warn('Failed to record audit log:', auditErr);
      }

      return res.json({ success: true, validationSummary: updatedSummary, document: updatedDoc });
    } catch (err: any) {
      console.error('Review issue error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async getDiff(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { versionA, versionB } = req.query;

      const doc = await prisma.document.findUnique({
        where: { id },
        include: { versions: { orderBy: { versionNumber: 'asc' } } }
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      let textA = '';
      let textB = doc.content;

      if (versionA) {
        const vA = doc.versions.find(v => v.versionNumber === Number(versionA) || v.id === versionA);
        if (vA) textA = vA.content;
      } else if (doc.versions.length > 1) {
        textA = doc.versions[0].content;
      }

      if (versionB) {
        const vB = doc.versions.find(v => v.versionNumber === Number(versionB) || v.id === versionB);
        if (vB) textB = vB.content;
      }

      const diff = diffService.computeDiff(textA, textB);
      return res.json({
        diff,
        docTitle: doc.title,
        comparedVersions: {
          original: versionA ? `Version ${versionA}` : 'Initial Version (v1)',
          modified: versionB ? `Version ${versionB}` : 'Current Draft'
        }
      });
    } catch (err: any) {
      console.error('Diff computation error:', err);
      return res.status(500).json({ error: `Failed to compute diff: ${err.message}` });
    }
  }
}

export const documentsController = new DocumentsController();
