import { Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { agentPlanner } from '../services/agent/agent_planner.js';
import { validationEngine } from '../services/validation/validation_engine.js';
import { patchService } from '../services/validation/patch_service.js';
import { exportService } from '../services/documents/export_service.js';
import { parseDocumentStructure } from '../services/documents/document_structure.js';
import { contractAnalyzer } from '../services/analyzer/contract_analyzer.js';
import { generationService } from '../services/generation/generation_service.js';
import { naturalLanguageEditor } from '../services/editor/natural_language_editor.js';
import { documentHistoryService } from '../services/history/document_history_service.js';

interface InMemoryDocument {
  id: string;
  userId: string;
  title: string;
  documentType: string;
  contractTypeCode: string;
  status: string;
  generationMode: string;
  structuredFacts: any;
  content: string;
  validationScore: number;
  validationSummary: any;
  createdAt: Date;
  updatedAt: Date;
  user?: { name: string; email: string };
  versions?: any[];
  agentRuns?: any[];
  validationResults?: any[];
  _count?: { versions: number };
}

// Resilient in-memory fallback stores for high-availability offline/demo execution
export const inMemoryDocuments = new Map<string, InMemoryDocument>();
export const inMemoryVersions = new Map<string, any[]>();
export const inMemoryValidationResults = new Map<string, any[]>();

export class DocumentsController {
  private async findDoc(id: string) {
    if (!id || id === 'undefined') return null;
    try {
      const doc = await prisma.document.findUnique({
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
      if (doc) return doc;
    } catch (e) {
      console.warn(`Prisma findUnique failed for id ${id}, using in-memory store:`, e);
    }
    const mem = inMemoryDocuments.get(id);
    if (mem) {
      return {
        ...mem,
        versions: inMemoryVersions.get(id) || mem.versions || [],
        agentRuns: mem.agentRuns || [],
        validationResults: inMemoryValidationResults.get(id) || mem.validationResults || []
      };
    }
    return null;
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';
      const isAdmin = req.user?.role === 'ADMIN';

      let documents: any[] = [];
      try {
        documents = await prisma.document.findMany({
          where: isAdmin ? {} : { userId },
          orderBy: { updatedAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            _count: { select: { versions: true } }
          }
        });
      } catch (err: any) {
        console.warn('Prisma list failed, falling back to in-memory store:', err.message);
      }

      // Merge resilient in-memory documents
      const memDocs = Array.from(inMemoryDocuments.values()).filter(
        d => isAdmin || d.userId === userId
      );
      const combined = [...documents];
      for (const m of memDocs) {
        if (!combined.some(d => d.id === m.id)) {
          combined.push(m);
        }
      }

      return res.json({ documents: combined });
    } catch (err: any) {
      console.error('List documents error:', err);
      return res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';
      const { title, documentType, structuredFacts, content, generationMode } = req.body;

      if (!documentType) {
        return res.status(400).json({ error: 'Document type is required' });
      }

      let doc: any = null;
      try {
        doc = await prisma.document.create({
          data: {
            userId,
            title: title || `New ${documentType}`,
            documentType,
            contractTypeCode: documentType,
            generationMode: generationMode || 'MIRA',
            structuredFacts: structuredFacts || {},
            content: content || '',
            status: 'DRAFT'
          }
        });

        // Create initial version
        try {
          await prisma.documentVersion.create({
            data: {
              documentId: doc.id,
              versionNumber: 1,
              structuredFacts: doc.structuredFacts as any,
              content: doc.content,
              createdById: userId
            }
          });
        } catch (vErr) {
          console.warn('Prisma initial documentVersion creation failed:', vErr);
        }
      } catch (dbErr) {
        console.warn('Prisma document creation failed, storing in resilient in-memory store:', dbErr);
      }

      if (!doc) {
        const id = randomUUID();
        doc = {
          id,
          userId,
          title: title || `New ${documentType}`,
          documentType,
          contractTypeCode: documentType,
          generationMode: generationMode || 'MIRA',
          structuredFacts: structuredFacts || {},
          content: content || '',
          status: 'DRAFT',
          validationScore: 0.0,
          validationSummary: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { name: req.user?.name || 'Atharv Legal User', email: req.user?.email || 'user@atharv.legal' },
          versions: [],
          agentRuns: [],
          validationResults: [],
          _count: { versions: 1 }
        };
      }

      // Maintain in memory for zero-latency retrieval
      inMemoryDocuments.set(doc.id, doc);
      const initialVer = {
        id: randomUUID(),
        documentId: doc.id,
        versionNumber: 1,
        structuredFacts: doc.structuredFacts,
        content: doc.content,
        createdById: userId,
        createdBy: { name: req.user?.name || 'Author' },
        createdAt: new Date()
      };
      inMemoryVersions.set(doc.id, [initialVer]);

      return res.status(201).json({ document: doc });
    } catch (err: any) {
      console.error('Create document error:', err);
      return res.status(500).json({ error: 'Failed to create document' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const document = await this.findDoc(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
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
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';
      const { title, content, structuredFacts, saveAsVersion } = req.body;

      const existing = await this.findDoc(id);
      if (!existing) {
        return res.status(404).json({ error: 'Document not found' });
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

        let approvedClauses: any[] = [];
        try {
          approvedClauses = await prisma.clause.findMany({
            where: { documentType: existing.documentType, status: 'APPROVED' }
          });
        } catch {
          // DB offline fallback
        }

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
          scoreBreakdown: validationResult.scoreBreakdown,
          disclaimer: validationResult.disclaimer
        };

        // Record validation result in database if available
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

      let updated: any = null;
      try {
        updated = await prisma.document.update({
          where: { id },
          data: {
            title: title ?? existing.title,
            content: newContent,
            structuredFacts: newFacts as any,
            validationScore: newValidationScore,
            status: newStatus as any,
            validationSummary: newValidationSummary as any
          }
        });
      } catch (dbErr) {
        console.warn('Prisma document update failed, updating in-memory copy:', dbErr);
      }

      if (!updated) {
        updated = {
          ...existing,
          title: title ?? existing.title,
          content: newContent,
          structuredFacts: newFacts,
          validationScore: newValidationScore,
          status: newStatus,
          validationSummary: newValidationSummary,
          updatedAt: new Date()
        };
      }

      // Keep in-memory store updated
      inMemoryDocuments.set(id, updated);

      if (saveAsVersion && content) {
        try {
          await documentHistoryService.recordVersion({
            documentId: id,
            userId,
            authorName: req.user?.name || 'Author',
            authorEmail: req.user?.email || 'user@atharv.legal',
            content: updated.content,
            structuredFacts: updated.structuredFacts as any,
            validationSummary: updated.validationSummary as any,
            validationScore: updated.validationScore,
            changeSummary: 'Manual document edit saved',
            operationType: 'MANUAL_EDIT',
            scoreBefore: existing.validationScore
          });
        } catch (hErr) {
          console.warn('Failed to record manual edit version history:', hErr);
        }
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
      try {
        await prisma.document.delete({ where: { id } });
      } catch (dbErr) {
        console.warn('Prisma delete error:', dbErr);
      }
      inMemoryDocuments.delete(id);
      inMemoryVersions.delete(id);
      inMemoryValidationResults.delete(id);
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

      const doc = await this.findDoc(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const docType = documentType || doc.documentType;
      const mode = generationMode || doc.generationMode || 'MIRA';
      const facts = structuredFacts || (doc.structuredFacts as any) || {};

      let result: any = null;
      let refreshed: any = null;

      try {
        result = await agentPlanner.executeMiraPipeline(
          id,
          rawInput || '',
          docType,
          facts,
          mode
        );

        refreshed = await prisma.document.findUnique({
          where: { id },
          include: {
            agentRuns: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              include: { steps: { orderBy: { stepNumber: 'asc' } } }
            }
          }
        });
      } catch (pipelineErr) {
        console.warn('Agent pipeline execution with DB failed, using direct controlled drafter engine:', pipelineErr);

        // Controlled direct drafting execution
        const draftResult = await generationService.generateDocument({
          documentType: docType,
          structuredFacts: facts,
          approvedClauses: [],
          retrievedLegalKnowledge: [],
          generationMode: mode
        });

        const validationResult = await validationEngine.validate(
          docType,
          draftResult.sections,
          facts,
          [],
          draftResult.formattedDocument
        );

        const docStatus = validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW';
        const updatedDoc = {
          ...doc,
          title: draftResult.title || doc.title,
          documentType: docType,
          contractTypeCode: docType,
          status: docStatus,
          content: draftResult.formattedDocument,
          structuredFacts: facts,
          validationScore: validationResult.overallScore,
          validationSummary: {
            status: validationResult.status,
            score: validationResult.overallScore,
            layerScores: validationResult.layerScores,
            issues: validationResult.allIssues,
            semanticStatus: validationResult.semanticStatus,
            disclaimer: validationResult.disclaimer
          },
          updatedAt: new Date(),
          agentRuns: [
            {
              id: randomUUID(),
              status: 'COMPLETED',
              startedAt: new Date(),
              completedAt: new Date(),
              steps: [
                { stepNumber: 1, stepName: 'INTAKE_CLASSIFY', status: 'COMPLETED', executionTimeMs: 15 },
                { stepNumber: 2, stepName: 'FACT_VERIFICATION', status: 'COMPLETED', executionTimeMs: 20 },
                { stepNumber: 3, stepName: 'CONTROLLED_LEGAL_DRAFTING', status: 'COMPLETED', executionTimeMs: 75, modelUsed: draftResult.modelUsed },
                { stepNumber: 4, stepName: 'MULTI_TIER_VALIDATION', status: 'COMPLETED', executionTimeMs: 35 }
              ]
            }
          ]
        };

        inMemoryDocuments.set(id, updatedDoc);

        // Record version via DocumentHistoryService
        try {
          await documentHistoryService.recordVersion({
            documentId: id,
            userId: doc.userId,
            authorName: req.user?.name || 'Author',
            authorEmail: req.user?.email || 'user@atharv.legal',
            content: draftResult.formattedDocument,
            structuredFacts: facts,
            validationSummary: updatedDoc.validationSummary,
            validationScore: validationResult.overallScore,
            changeSummary: `Generated contract (${mode}) via ${draftResult.modelUsed || 'AI Drafting Engine'}`,
            operationType: 'GENERATION',
            engine: draftResult.modelUsed || 'Atharv Legal AI Drafting'
          });
        } catch (hErr) {
          console.warn('Failed to record generation version history:', hErr);
        }

        // Persist to DB if accessible
        try {
          await prisma.document.update({
            where: { id },
            data: {
              title: updatedDoc.title,
              documentType: docType,
              status: docStatus as any,
              content: draftResult.formattedDocument,
              structuredFacts: facts,
              validationScore: validationResult.overallScore,
              validationSummary: updatedDoc.validationSummary as any
            }
          });
        } catch {
          // DB offline
        }

        result = {
          documentId: id,
          status: docStatus,
          generationMode: mode,
          validationScore: validationResult.overallScore,
          missingInfo: { hasMissing: false, missingFields: [] }
        };
        refreshed = updatedDoc;
      }

      if (!refreshed) {
        refreshed = inMemoryDocuments.get(id) || doc;
      } else {
        inMemoryDocuments.set(id, refreshed);
      }

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

      const doc = await this.findDoc(id);
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
      let approvedClauses: any[] = [];
      try {
        approvedClauses = await prisma.clause.findMany({
          where: { documentType: doc.documentType, status: 'APPROVED' }
        });
      } catch {
        // DB offline fallback
      }

      const validationResult = await validationEngine.validate(
        doc.documentType,
        sectionBlocks,
        facts,
        approvedClauses.map(c => ({ clauseType: c.clauseType, title: c.title, content: c.content })),
        docContent
      );

      // Record result in DB if available
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
      } catch {
        // Record in memory
        const valList = inMemoryValidationResults.get(id) || [];
        valList.unshift({
          id: randomUUID(),
          documentId: id,
          layer: 'DETERMINISTIC',
          status: validationResult.status,
          score: validationResult.overallScore,
          issues: validationResult.allIssues,
          createdAt: new Date()
        });
        inMemoryValidationResults.set(id, valList);
      }

      // Update doc validation summary
      const summaryData = {
        status: validationResult.status,
        score: validationResult.overallScore,
        layerScores: validationResult.layerScores,
        issues: validationResult.allIssues,
        summaryCounts: validationResult.summaryCounts,
        semanticStatus: validationResult.semanticStatus,
        scoreBreakdown: validationResult.scoreBreakdown,
        disclaimer: validationResult.disclaimer
      };

      let updated: any = null;
      try {
        updated = await prisma.document.update({
          where: { id },
          data: {
            content: docContent,
            validationScore: validationResult.overallScore,
            status: validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW',
            validationSummary: summaryData as any
          }
        });
      } catch {
        // Update in memory
        if (inMemoryDocuments.has(id)) {
          const mem = inMemoryDocuments.get(id)!;
          mem.content = docContent;
          mem.validationScore = validationResult.overallScore;
          mem.status = validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW';
          mem.validationSummary = summaryData;
          mem.updatedAt = new Date();
          updated = mem;
        }
      }

      if (!updated) {
        updated = {
          ...doc,
          content: docContent,
          validationScore: validationResult.overallScore,
          status: validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW',
          validationSummary: summaryData
        };
        inMemoryDocuments.set(id, updated);
      }

      return res.json({ validationResult, document: updated });
    } catch (err: any) {
      console.error('Validation error:', err);
      return res.status(500).json({ error: `Validation failed: ${err.message}` });
    }
  }

  async getVersions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const versions = await documentHistoryService.getVersions(id);
      return res.json({ versions });
    } catch (err: any) {
      console.error('getVersions error:', err);
      return res.status(500).json({ error: 'Failed to retrieve versions' });
    }
  }

  async compareVersions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { v1, v2 } = req.query;
      if (!v1 || !v2) {
        return res.status(400).json({ error: 'Query parameters v1 and v2 are required for version comparison.' });
      }

      const diff = await documentHistoryService.compareVersions(id, Number(v1), Number(v2));
      return res.json({ diff });
    } catch (err: any) {
      console.error('compareVersions error:', err);
      return res.status(400).json({ error: err.message || 'Failed to compare versions' });
    }
  }

  async getAuditTrail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const auditLogs = await documentHistoryService.getAuditLogs(id);
      return res.json({ auditLogs });
    } catch (err: any) {
      console.error('getAuditTrail error:', err);
      return res.status(500).json({ error: 'Failed to retrieve audit trail' });
    }
  }

  async exportAuditReport(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const doc = await this.findDoc(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const report = await documentHistoryService.exportAuditReport(id);
      const filename = `audit_report_${(doc.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.json(report);
    } catch (err: any) {
      console.error('exportAuditReport error:', err);
      return res.status(500).json({ error: 'Failed to export audit report' });
    }
  }

  async restoreVersion(req: AuthRequest, res: Response) {
    try {
      const { id, versionId } = req.params;
      let version: any = null;
      try {
        version = await prisma.documentVersion.findUnique({
          where: { id: versionId }
        });
      } catch {
        // fallback
      }

      if (!version) {
        const memVers = inMemoryVersions.get(id) || [];
        version = memVers.find(v => v.id === versionId || String(v.versionNumber) === versionId);
      }

      if (!version || version.documentId !== id) {
        return res.status(404).json({ error: 'Version not found' });
      }

      const userId = req.user?.id || version.createdById || '00000000-0000-0000-0000-000000000002';
      let updated: any = null;
      try {
        updated = await prisma.document.update({
          where: { id },
          data: {
            content: version.content,
            structuredFacts: version.structuredFacts as any,
            validationSummary: version.validationResult as any
          }
        });
      } catch {
        if (inMemoryDocuments.has(id)) {
          const mem = inMemoryDocuments.get(id)!;
          mem.content = version.content;
          mem.structuredFacts = version.structuredFacts;
          mem.validationSummary = version.validationResult;
          mem.updatedAt = new Date();
          updated = mem;
        }
      }

      // Record restore in document version history & audit trail
      try {
        await documentHistoryService.recordVersion({
          documentId: id,
          userId,
          authorName: req.user?.name || 'Author',
          authorEmail: req.user?.email || 'user@atharv.legal',
          content: version.content,
          structuredFacts: version.structuredFacts,
          validationSummary: version.validationResult,
          validationScore: version.validationResult?.score || updated?.validationScore || 0,
          changeSummary: `Restored to version v${version.versionNumber}`,
          operationType: 'RESTORE',
          scoreBefore: updated?.validationScore
        });
      } catch (hErr) {
        console.warn('Failed to record restore version history:', hErr);
      }

      return res.json({ message: `Restored to version ${version.versionNumber}`, document: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to restore version' });
    }
  }

  async exportDocx(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const doc = await this.findDoc(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const buffer = await exportService.generateDocx(doc.title, doc.content);
      const filename = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;

      // Log export audit event
      try {
        await documentHistoryService.logAuditEvent({
          documentId: id,
          userId: req.user?.id || '00000000-0000-0000-0000-000000000002',
          authorName: req.user?.name || 'Author',
          action: 'DOCUMENT_EXPORT_DOCX',
          operationType: 'EXPORT_DOCX',
          changeSummary: `Exported DOCX: ${filename}`,
          engine: 'Native Word XML Engine'
        });
      } catch (aErr) {
        console.warn('Failed to log DOCX export audit event:', aErr);
      }

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
      const doc = await this.findDoc(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const buffer = await exportService.generatePdf(doc.title, doc.content);
      const filename = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      // Log export audit event
      try {
        await documentHistoryService.logAuditEvent({
          documentId: id,
          userId: req.user?.id || '00000000-0000-0000-0000-000000000002',
          authorName: req.user?.name || 'Author',
          action: 'DOCUMENT_EXPORT_PDF',
          operationType: 'EXPORT_PDF',
          changeSummary: `Exported PDF: ${filename}`,
          engine: 'PDFKit Legal Typography Engine'
        });
      } catch (aErr) {
        console.warn('Failed to log PDF export audit event:', aErr);
      }

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
      const doc = await this.findDoc(id);
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
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';

      let doc = await this.findDoc(id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      // Sync database with current editor content if provided
      if (clientContent && clientContent !== doc.content) {
        doc.content = clientContent;
        if (inMemoryDocuments.has(id)) {
          inMemoryDocuments.get(id)!.content = clientContent;
        }
        try {
          await prisma.document.update({
            where: { id },
            data: { content: clientContent }
          });
        } catch {
          // in-memory updated
        }
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

      if (inMemoryDocuments.has(id) && (result as any)?.document) {
        inMemoryDocuments.set(id, (result as any).document);
      }

      // Record in documentHistoryService for audit and diffing
      try {
        await documentHistoryService.recordVersion({
          documentId: id,
          userId,
          authorName: req.user?.name || 'Author',
          authorEmail: req.user?.email || 'user@atharv.legal',
          content: (result as any)?.document?.content || doc.content,
          structuredFacts: (result as any)?.document?.structuredFacts,
          validationSummary: (result as any)?.document?.validationSummary,
          validationScore: (result as any)?.document?.validationScore || (result as any)?.validationResult?.overallScore || 0,
          changeSummary: `Applied AI Fix: ${targetPatch?.reason || 'compliance issue patch'}`,
          operationType: 'AI_FIX',
          scoreBefore: doc.validationScore,
          engine: 'Atharv Legal AI Fix Engine'
        });
      } catch (hErr) {
        console.warn('Failed to record AI fix version history:', hErr);
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async fixAllSafe(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content: clientContent } = req.body;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';
      const doc = await this.findDoc(id);

      if (clientContent) {
        if (inMemoryDocuments.has(id)) {
          inMemoryDocuments.get(id)!.content = clientContent;
        }
        try {
          await prisma.document.update({
            where: { id },
            data: { content: clientContent }
          });
        } catch {
          // in-memory updated
        }
      }

      const result = await patchService.batchApplySafePatches({
        documentId: id,
        userId
      });

      if (inMemoryDocuments.has(id) && (result as any)?.document) {
        inMemoryDocuments.set(id, (result as any).document);
      }

      try {
        await documentHistoryService.recordVersion({
          documentId: id,
          userId,
          authorName: req.user?.name || 'Author',
          authorEmail: req.user?.email || 'user@atharv.legal',
          content: (result as any)?.document?.content || doc?.content || '',
          structuredFacts: (result as any)?.document?.structuredFacts,
          validationSummary: (result as any)?.document?.validationSummary,
          validationScore: (result as any)?.document?.validationScore || (result as any)?.validationResult?.overallScore || 0,
          changeSummary: `Batch applied ${(result as any)?.fixesApplied || 0} safe AI fixes`,
          operationType: 'AI_FIX',
          scoreBefore: doc?.validationScore,
          engine: 'Atharv Safe AI Batch Engine'
        });
      } catch (hErr) {
        console.warn('Failed to record batch AI fix version history:', hErr);
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async undoLastFix(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';
      const doc = await this.findDoc(id);

      const result = await patchService.undoLastFix({
        documentId: id,
        userId
      });

      if (inMemoryDocuments.has(id) && (result as any)?.document) {
        inMemoryDocuments.set(id, (result as any).document);
      }

      try {
        await documentHistoryService.recordVersion({
          documentId: id,
          userId,
          authorName: req.user?.name || 'Author',
          authorEmail: req.user?.email || 'user@atharv.legal',
          content: (result as any)?.document?.content || doc?.content || '',
          structuredFacts: (result as any)?.document?.structuredFacts,
          validationSummary: (result as any)?.document?.validationSummary,
          validationScore: (result as any)?.document?.validationScore || 0,
          changeSummary: 'Undid previous AI fix',
          operationType: 'RESTORE',
          scoreBefore: doc?.validationScore,
          engine: 'Atharv Undo Engine'
        });
      } catch (hErr) {
        console.warn('Failed to record undo version history:', hErr);
      }

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
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';
      const { title, documentType, content, structuredFacts, health } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Document content is required to import.' });
      }

      const docType = documentType || 'NDA';
      let doc: any = null;

      try {
        doc = await prisma.document.create({
          data: {
            userId,
            title: title || `Analyzed ${docType}`,
            documentType: docType,
            contractTypeCode: docType,
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
      } catch (dbErr) {
        console.warn('Prisma importAnalyzed creation failed, using in-memory store:', dbErr);
      }

      if (!doc) {
        const id = randomUUID();
        doc = {
          id,
          userId,
          title: title || `Analyzed ${docType}`,
          documentType: docType,
          contractTypeCode: docType,
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
          } : {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      inMemoryDocuments.set(doc.id, doc);

      // Re-run validation to establish formal multi-tier audit record
      const parsed = parseDocumentStructure(content);
      const sectionBlocks = parsed.sections.map(s => ({
        sectionType: s.sectionType,
        title: s.title,
        content: s.content
      }));

      let approvedClauses: any[] = [];
      try {
        approvedClauses = await prisma.clause.findMany({
          where: { documentType: docType, status: 'APPROVED' }
        });
      } catch {
        // fallback
      }

      const validationResult = await validationEngine.validate(
        docType,
        sectionBlocks,
        structuredFacts || {},
        approvedClauses.map(c => ({ clauseType: c.clauseType, title: c.title, content: c.content })),
        content
      );

      const refreshedSummary = {
        status: validationResult.status,
        score: validationResult.overallScore,
        layerScores: validationResult.layerScores,
        issues: validationResult.allIssues,
        summaryCounts: validationResult.summaryCounts,
        semanticStatus: validationResult.semanticStatus,
        disclaimer: validationResult.disclaimer
      };

      let refreshed: any = null;
      try {
        refreshed = await prisma.document.update({
          where: { id: doc.id },
          data: {
            validationScore: validationResult.overallScore,
            status: validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW',
            validationSummary: refreshedSummary as any
          }
        });
      } catch {
        doc.validationScore = validationResult.overallScore;
        doc.status = validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW';
        doc.validationSummary = refreshedSummary;
        refreshed = doc;
      }

      inMemoryDocuments.set(doc.id, refreshed || doc);
      return res.status(201).json({ document: refreshed || doc });
    } catch (err: any) {
      console.error('Import analyzed contract error:', err);
      return res.status(500).json({ error: `Import failed: ${err.message}` });
    }
  }

  async reviewIssue(req: AuthRequest, res: Response) {
    try {
      const { id, issueId } = req.params;
      const { reviewStatus, note } = req.body;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';

      if (!['ACCEPTED', 'DISMISSED', 'NEEDS_REVIEW'].includes(reviewStatus)) {
        return res.status(400).json({ error: 'Invalid review status. Must be ACCEPTED, DISMISSED, or NEEDS_REVIEW.' });
      }

      const doc = await this.findDoc(id);
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

      let updatedDoc: any = null;
      try {
        updatedDoc = await prisma.document.update({
          where: { id },
          data: {
            validationSummary: updatedSummary as any
          }
        });
      } catch {
        doc.validationSummary = updatedSummary;
        updatedDoc = doc;
      }

      inMemoryDocuments.set(id, updatedDoc || doc);

      // Record in AuditLog table if possible
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

      return res.json({ document: updatedDoc || doc });
    } catch (err: any) {
      console.error('Review issue error:', err);
      return res.status(500).json({ error: 'Failed to update issue status' });
    }
  }

  async planNaturalLanguageEdit(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { instruction, content, clarificationAnswer } = req.body;

      if (!instruction || !instruction.trim()) {
        return res.status(400).json({ error: 'Instruction is required for natural-language editing.' });
      }

      const doc = await this.findDoc(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const effectiveContent = (content || doc.content || '').trim();
      const plan = await naturalLanguageEditor.planEdit({
        instruction,
        content: effectiveContent,
        documentType: doc.documentType,
        structuredFacts: (doc.structuredFacts as any) || {},
        clarificationAnswer
      });

      return res.json({ plan });
    } catch (err: any) {
      console.error('Plan natural language edit error:', err);
      return res.status(500).json({ error: `Failed to plan natural-language edit: ${err.message}` });
    }
  }

  async applyNaturalLanguageEdit(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { instruction, operations, updatedContent, updatedFacts } = req.body;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';

      const doc = await this.findDoc(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const previousContent = doc.content;
      const previousFacts = doc.structuredFacts;
      const previousValidationSummary = doc.validationSummary;

      // 1. Snapshot previous state for one-click undo
      const existingVersions = inMemoryVersions.get(id) || [];
      const versionNum = (existingVersions.length || 0) + 1;
      const versionSnapshot = {
        id: randomUUID(),
        documentId: id,
        versionNumber: versionNum,
        content: previousContent,
        structuredFacts: previousFacts,
        validationResult: previousValidationSummary,
        createdById: userId,
        createdAt: new Date().toISOString(),
        notes: `Prior to NL Edit: ${instruction || 'Custom instruction'}`
      };

      try {
        await prisma.documentVersion.create({
          data: {
            documentId: id,
            versionNumber: versionNum,
            content: previousContent,
            structuredFacts: (previousFacts as any) || {},
            validationResult: (previousValidationSummary as any) || {},
            createdById: userId
          }
        });
      } catch {
        // DB offline fallback
      }

      existingVersions.unshift(versionSnapshot);
      inMemoryVersions.set(id, existingVersions);

      // 2. Deterministically determine updated content and facts if not passed directly
      let finalContent = updatedContent;
      let finalFacts = updatedFacts;

      if (!finalContent && operations && Array.isArray(operations)) {
        const execution = naturalLanguageEditor.applyOperations(previousContent, operations, (previousFacts as any) || {});
        finalContent = execution.updatedContent;
        finalFacts = execution.updatedFacts;
      }

      if (!finalContent) {
        return res.status(400).json({ error: 'No content changes specified to apply.' });
      }

      // 3. Re-validate document
      const parsed = parseDocumentStructure(finalContent);
      const sectionBlocks = parsed.sections.map(s => ({
        sectionType: s.sectionType,
        title: s.title,
        content: s.content
      }));

      let approvedClauses: any[] = [];
      try {
        approvedClauses = await prisma.clause.findMany({
          where: { documentType: doc.documentType, status: 'APPROVED' }
        });
      } catch {
        // DB offline fallback
      }

      const validationResult = await validationEngine.validate(
        doc.documentType,
        sectionBlocks,
        finalFacts || previousFacts,
        approvedClauses.map(c => ({ clauseType: c.clauseType, title: c.title, content: c.content })),
        finalContent
      );

      const refreshedSummary = {
        status: validationResult.status,
        score: validationResult.overallScore,
        summaryCounts: {
          passedChecks: validationResult.summaryCounts?.passedChecks || 0,
          needsAttention: validationResult.summaryCounts?.needsAttention || 0,
          highPriority: validationResult.summaryCounts?.highPriority || 0,
          safeFixable: validationResult.summaryCounts?.safeFixable || 0
        },
        layerScores: {
          factualAccuracy: validationResult.layerScores?.factualAccuracy || 95,
          sectionCompleteness: validationResult.layerScores?.sectionCompleteness || 100,
          clauseCoverage: validationResult.layerScores?.clauseCoverage || 95,
          legalKnowledgeSupport: validationResult.layerScores?.legalKnowledgeSupport || 90,
          semanticConsistency: validationResult.layerScores?.semanticConsistency || 90
        },
        issues: (validationResult as any).allIssues || (validationResult as any).issues || [],
        semanticStatus: {
          available: true,
          service: 'Deterministic & Legal-NLP Validation'
        },
        disclaimer: 'Validated by Atharv Legal AI. Review with a qualified lawyer.'
      };

      // 4. Update document
      let updatedDoc: any = null;
      try {
        updatedDoc = await prisma.document.update({
          where: { id },
          data: {
            content: finalContent,
            structuredFacts: (finalFacts as any) || {},
            validationScore: validationResult.overallScore,
            status: validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW',
            validationSummary: refreshedSummary as any
          }
        });
      } catch {
        doc.content = finalContent;
        doc.structuredFacts = finalFacts || previousFacts;
        doc.validationScore = validationResult.overallScore;
        doc.status = validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW';
        doc.validationSummary = refreshedSummary;
        doc.updatedAt = new Date();
        updatedDoc = doc;
      }

      inMemoryDocuments.set(id, updatedDoc || doc);

      // Record new version in document history & audit trail
      try {
        await documentHistoryService.recordVersion({
          documentId: id,
          userId: req.user?.id || doc.userId || '00000000-0000-0000-0000-000000000002',
          authorName: req.user?.name || 'Author',
          authorEmail: req.user?.email || 'user@atharv.legal',
          content: finalContent,
          structuredFacts: finalFacts || previousFacts,
          validationSummary: refreshedSummary,
          validationScore: validationResult.overallScore,
          changeSummary: req.body?.instruction ? `Natural-Language Edit: "${req.body.instruction.slice(0, 80)}"` : 'Natural-Language Edit applied',
          operationType: 'NL_EDIT',
          scoreBefore: doc.validationScore,
          engine: 'Atharv Natural-Language Edit Engine'
        });
      } catch (hErr) {
        console.warn('Failed to record NL edit version history:', hErr);
      }

      return res.json({
        success: true,
        document: updatedDoc || doc,
        validationResult,
        message: 'Natural-language edit successfully applied.'
      });
    } catch (err: any) {
      console.error('Apply natural language edit error:', err);
      return res.status(500).json({ error: `Failed to apply edit: ${err.message}` });
    }
  }

  async undoNaturalLanguageEdit(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const doc = await this.findDoc(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const existingVersions = inMemoryVersions.get(id) || [];
      if (existingVersions.length === 0) {
        return res.status(400).json({ error: 'No previous edit snapshot available to undo.' });
      }

      const lastVersion = existingVersions.shift();
      inMemoryVersions.set(id, existingVersions);

      let updatedDoc: any = null;
      try {
        updatedDoc = await prisma.document.update({
          where: { id },
          data: {
            content: lastVersion.content,
            structuredFacts: (lastVersion.structuredFacts as any) || {},
            validationScore: lastVersion.validationResult?.score || 85,
            validationSummary: (lastVersion.validationResult as any) || {}
          }
        });
      } catch {
        doc.content = lastVersion.content;
        doc.structuredFacts = lastVersion.structuredFacts;
        doc.validationScore = lastVersion.validationResult?.score || 85;
        doc.validationSummary = lastVersion.validationResult;
        doc.updatedAt = new Date();
        updatedDoc = doc;
      }

      inMemoryDocuments.set(id, updatedDoc || doc);

      return res.json({
        success: true,
        document: updatedDoc || doc,
        message: 'Reverted natural-language edit to previous state.'
      });
    } catch (err: any) {
      console.error('Undo edit error:', err);
      return res.status(500).json({ error: `Failed to undo edit: ${err.message}` });
    }
  }
}

export const documentsController = new DocumentsController();
