import { prisma } from '../../utils/prisma.js';
import { legalNLPClient } from '../nlp/legal_nlp_client.js';
import { ragService } from '../rag/rag_service.js';
import { generationService, GeneratedDocumentResult } from '../generation/generation_service.js';
import { validationEngine, ComprehensiveValidationResult } from '../validation/validation_engine.js';

export interface PlanStep {
  step: number;
  action: string;
  description: string;
}

export interface MissingInfoCheckResult {
  hasMissing: boolean;
  missingFields: Array<{
    field: string;
    label: string;
    description: string;
    importance: 'CRITICAL' | 'RECOMMENDED';
  }>;
}

export class AgentPlanner {
  /**
   * Determine missing legal facts based on strict non-hallucination rules.
   */
  checkMissingInformation(documentType: string, facts: Record<string, any>): MissingInfoCheckResult {
    const missingFields: MissingInfoCheckResult['missingFields'] = [];

    if (documentType === 'NDA') {
      if (!facts.disclosingParty?.name) {
        missingFields.push({
          field: 'disclosingParty.name',
          label: 'Disclosing Party Name',
          description: 'The legal or corporate entity disclosing proprietary information.',
          importance: 'CRITICAL'
        });
      }
      if (!facts.receivingParty?.name) {
        missingFields.push({
          field: 'receivingParty.name',
          label: 'Receiving Party Name',
          description: 'The legal or corporate entity receiving proprietary information.',
          importance: 'CRITICAL'
        });
      }
      if (!facts.duration) {
        missingFields.push({
          field: 'duration',
          label: 'Duration / Term of Confidentiality',
          description: 'Exact length of time the confidentiality covenants survive (e.g., 2 years, 3 years).',
          importance: 'CRITICAL'
        });
      }
      if (!facts.purpose) {
        missingFields.push({
          field: 'purpose',
          label: 'Authorized Purpose',
          description: 'The specific collaboration or business purpose for which information is disclosed.',
          importance: 'RECOMMENDED'
        });
      }
      if (!facts.governingLaw) {
        missingFields.push({
          field: 'governingLaw',
          label: 'Governing Law',
          description: 'The legal jurisdiction governing the contract (e.g. India).',
          importance: 'RECOMMENDED'
        });
      }
    } else { // LEGAL_NOTICE
      if (!facts.sender?.name) {
        missingFields.push({
          field: 'sender.name',
          label: 'Sender / Complainant Name',
          description: 'Party issuing the formal legal notice.',
          importance: 'CRITICAL'
        });
      }
      if (!facts.recipient?.name) {
        missingFields.push({
          field: 'recipient.name',
          label: 'Recipient / Addressee Name',
          description: 'Defaulting party upon whom notice is served.',
          importance: 'CRITICAL'
        });
      }
      if (!facts.amount) {
        missingFields.push({
          field: 'amount',
          label: 'Claim / Outstanding Amount',
          description: 'Exact quantified monetary sum in default.',
          importance: 'CRITICAL'
        });
      }
      if (!facts.demand) {
        missingFields.push({
          field: 'demand',
          label: 'Specific Legal Demand',
          description: 'The exact remedy or action demanded from the recipient.',
          importance: 'RECOMMENDED'
        });
      }
      if (!facts.responsePeriod) {
        missingFields.push({
          field: 'responsePeriod',
          label: 'Response Period / Deadline',
          description: 'Notice compliance window (e.g. 15 days).',
          importance: 'RECOMMENDED'
        });
      }
    }

    return {
      hasMissing: missingFields.some(f => f.importance === 'CRITICAL'),
      missingFields
    };
  }

  /**
   * Execute the full 10-step Atharv Legal AI Controlled Generation and Validation Pipeline.
   */
  async executeMiraPipeline(
    documentId: string,
    rawInput: string,
    requestedDocType: string,
    providedFacts?: Record<string, any>,
    generationMode: 'MIRA' | 'BASELINE' = 'MIRA'
  ) {
    const startTime = Date.now();

    // Create AgentRun record
    const agentRun = await prisma.agentRun.create({
      data: {
        documentId,
        status: 'RUNNING'
      }
    });

    const recordStep = async (
      stepNum: number,
      stepName: string,
      inputData: any,
      outputData: any,
      status: string = 'COMPLETED',
      executionTimeMs: number = 0,
      modelUsed: string = 'InLegalBERT/RuleEngine'
    ) => {
      return await prisma.agentStep.create({
        data: {
          agentRunId: agentRun.id,
          stepNumber: stepNum,
          stepName,
          inputData: inputData || {},
          outputData: outputData || {},
          status,
          executionTimeMs,
          modelUsed
        }
      });
    };

    try {
      // Step 1: INTAKE & CLASSIFY
      const step1Start = Date.now();
      let detectedDocType = requestedDocType;
      let classificationConf = 1.0;

      if (rawInput && (!requestedDocType || requestedDocType === 'UNKNOWN')) {
        try {
          const classResult = await legalNLPClient.classifyDocument(rawInput);
          detectedDocType = classResult.documentType !== 'UNKNOWN' ? classResult.documentType : requestedDocType;
          classificationConf = classResult.confidence;
        } catch (e) {
          console.warn('Document classification fallback used');
        }
      }

      await recordStep(
        1,
        'CLASSIFY_DOCUMENT',
        { rawInput: rawInput.slice(0, 150), requestedDocType },
        { documentType: detectedDocType, confidence: classificationConf },
        'COMPLETED',
        Date.now() - step1Start,
        'law-ai/InLegalBERT'
      );

      // Step 2: EXTRACT_FACTS
      const step2Start = Date.now();
      let structuredFacts = providedFacts || {};

      if (rawInput && (!providedFacts || Object.keys(providedFacts).length === 0)) {
        try {
          const extResult = await legalNLPClient.extractEntities(rawInput, detectedDocType);
          structuredFacts = extResult.facts;
        } catch (e) {
          console.warn('Entity extraction fallback used');
        }
      }

      await recordStep(
        2,
        'EXTRACT_STRUCTURED_FACTS',
        { inputLength: rawInput.length },
        { structuredFacts },
        'COMPLETED',
        Date.now() - step2Start,
        'law-ai/InLegalBERT'
      );

      // Step 3: CHECK_MISSING_INFORMATION
      const step3Start = Date.now();
      const missingCheck = this.checkMissingInformation(detectedDocType, structuredFacts);

      await recordStep(
        3,
        'CHECK_MISSING_INFORMATION',
        { documentType: detectedDocType },
        missingCheck,
        missingCheck.hasMissing ? 'WARNING' : 'COMPLETED',
        Date.now() - step3Start,
        'Atharv Legal Fact Verifier'
      );

      // If in Baseline mode, skip template, clause library, and RAG retrieval
      if (generationMode === 'BASELINE') {
        const baselineStart = Date.now();
        const draftResult = await generationService.generateDocument({
          documentType: detectedDocType,
          structuredFacts,
          approvedClauses: [],
          retrievedLegalKnowledge: [],
          generationMode: 'BASELINE'
        });

        await recordStep(
          4,
          'GENERATE_BASELINE_DRAFT',
          { mode: 'BASELINE' },
          { title: draftResult.title, sectionCount: draftResult.sections.length },
          'COMPLETED',
          Date.now() - baselineStart,
          draftResult.modelUsed
        );

        // Save document
        await prisma.document.update({
          where: { id: documentId },
          data: {
            title: draftResult.title,
            documentType: detectedDocType,
            generationMode: 'BASELINE',
            status: 'COMPLETED',
            content: draftResult.formattedDocument,
            structuredFacts: structuredFacts as any,
            validationScore: 40.0,
            validationSummary: { mode: 'BASELINE', notice: 'Baseline generation without Atharv Legal AI verification.' }
          }
        });

        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });

        return {
          documentId,
          status: 'COMPLETED',
          generationMode: 'BASELINE',
          validationScore: 40.0,
          missingInfo: missingCheck
        };
      }

      // Step 4: SELECT_TEMPLATE
      const step4Start = Date.now();
      const template = await prisma.template.findFirst({
        where: {
          documentType: { code: detectedDocType }
        },
        include: { sections: { orderBy: { orderIndex: 'asc' } } }
      });

      await recordStep(
        4,
        'SELECT_TEMPLATE',
        { documentType: detectedDocType },
        { templateId: template?.id, templateName: template?.name, sectionCount: template?.sections.length || 0 },
        'COMPLETED',
        Date.now() - step4Start,
        'Template Registry'
      );

      // Step 5: SELECT_CLAUSES (Approved Clause Library Retrieval via Legal-BERT embeddings)
      const step5Start = Date.now();
      const clauseSearchQuery = `${detectedDocType} confidentiality duration dispute remedies`;
      const approvedClauses = await ragService.retrieveApprovedClauses(clauseSearchQuery, detectedDocType, undefined, 4);

      await recordStep(
        5,
        'SELECT_APPROVED_CLAUSES',
        { query: clauseSearchQuery, documentType: detectedDocType },
        {
          retrievedCount: approvedClauses.length,
          clauses: approvedClauses.map(c => ({
            title: c.title,
            type: c.clauseType,
            similarity: c.similarity,
            status: c.status
          }))
        },
        'COMPLETED',
        Date.now() - step5Start,
        'law-ai/InLegalBERT + pgvector'
      );

      // Step 6: RETRIEVE_KNOWLEDGE (RAG via pgvector)
      const step6Start = Date.now();
      const ragQuery = `${detectedDocType} ${structuredFacts.purpose || ''} ${structuredFacts.breach || ''} legal obligations`;
      const retrievedSources = await ragService.retrieveLegalKnowledge(ragQuery, detectedDocType, 4);

      await recordStep(
        6,
        'RETRIEVE_LEGAL_KNOWLEDGE',
        { query: ragQuery, documentType: detectedDocType },
        {
          sourcesCount: retrievedSources.length,
          sources: retrievedSources.map(s => ({
            title: s.title,
            section: s.section,
            relevanceScore: s.relevanceScore,
            documentId: s.documentId
          }))
        },
        'COMPLETED',
        Date.now() - step6Start,
        'pgvector Cosine RAG Engine'
      );

      // Step 7: CREATE_PLAN
      const step7Start = Date.now();
      const plan: PlanStep[] = [
        { step: 1, action: "validate_facts", description: "Enforce strict factual parameters" },
        { step: 2, action: "select_template", description: `Apply template: ${template?.name || detectedDocType}` },
        { step: 3, action: "bind_approved_clauses", description: `Incorporate ${approvedClauses.length} approved legal clauses` },
        { step: 4, action: "integrate_rag_context", description: `Ground draft in ${retrievedSources.length} legal knowledge sources` },
        { step: 5, action: "generate_sections", description: "Synthesize structured legal sections" },
        { step: 6, action: "multi_tier_validate", description: "Execute deterministic and Legal-BERT validation" }
      ];

      await recordStep(
        7,
        'CREATE_PLAN',
        { documentType: detectedDocType },
        { plan },
        'COMPLETED',
        Date.now() - step7Start,
        'Atharv Legal Orchestrator'
      );

      // Step 8: GENERATE_DRAFT
      const step8Start = Date.now();
      const draftResult: GeneratedDocumentResult = await generationService.generateDocument({
        documentType: detectedDocType,
        structuredFacts,
        selectedTemplate: template,
        approvedClauses: approvedClauses.map(c => ({
          clauseType: c.clauseType,
          title: c.title,
          content: c.content
        })),
        retrievedLegalKnowledge: retrievedSources.map(s => ({
          title: s.title,
          chunk: s.chunk,
          relevanceScore: s.relevanceScore
        })),
        generationMode: 'MIRA'
      });

      await recordStep(
        8,
        'GENERATE_DRAFT',
        { sectionCount: draftResult.sections.length },
        { title: draftResult.title, executionTimeMs: draftResult.generationTimeMs },
        'COMPLETED',
        Date.now() - step8Start,
        draftResult.modelUsed
      );

      // Step 9: MULTI-TIER VALIDATE
      const step9Start = Date.now();
      const validationResult: ComprehensiveValidationResult = await validationEngine.validate(
        detectedDocType,
        draftResult.sections,
        structuredFacts,
        approvedClauses.map(c => ({
          clauseType: c.clauseType,
          title: c.title,
          content: c.content
        }))
      );

      await recordStep(
        9,
        'MULTI_TIER_VALIDATE',
        { sectionCount: draftResult.sections.length },
        {
          overallScore: validationResult.overallScore,
          status: validationResult.status,
          layerScores: validationResult.layerScores,
          issuesCount: validationResult.allIssues.length
        },
        validationResult.status === 'PASSED' ? 'COMPLETED' : 'WARNING',
        Date.now() - step9Start,
        'Deterministic Engine + InLegalBERT Validator'
      );

      // Record ValidationResult in DB
      await prisma.validationResult.create({
        data: {
          documentId,
          layer: 'DETERMINISTIC',
          status: validationResult.status,
          score: validationResult.overallScore,
          issues: validationResult.allIssues as any
        }
      });

      // Update Document
      const docStatus = validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW';
      await prisma.document.update({
        where: { id: documentId },
        data: {
          title: draftResult.title,
          documentType: detectedDocType,
          generationMode: 'MIRA',
          status: docStatus,
          content: draftResult.formattedDocument,
          structuredFacts: structuredFacts as any,
          validationScore: validationResult.overallScore,
          validationSummary: {
            status: validationResult.status,
            score: validationResult.overallScore,
            layerScores: validationResult.layerScores,
            issues: validationResult.allIssues,
            sourcesUsed: retrievedSources.map(s => ({ title: s.title, relevance: s.relevanceScore })),
            approvedClausesUsed: approvedClauses.map(c => ({ title: c.title, similarity: c.similarity })),
            disclaimer: validationResult.disclaimer
          } as any
        }
      });

      // Create DocumentVersion
      const latestVersion = await prisma.documentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: 'desc' }
      });
      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      await prisma.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNumber,
          content: draftResult.formattedDocument,
          structuredFacts: structuredFacts as any,
          validationResult: {
            score: validationResult.overallScore,
            status: validationResult.status,
            issues: validationResult.allIssues
          } as any,
          createdById: (await prisma.document.findUnique({ where: { id: documentId } }))?.userId || ''
        }
      });

      // Complete AgentRun
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: validationResult.status === 'PASSED' ? 'COMPLETED' : 'NEEDS_REVIEW',
          completedAt: new Date()
        }
      });

      return {
        documentId,
        status: docStatus,
        generationMode: 'MIRA',
        validationScore: validationResult.overallScore,
        validationResult,
        missingInfo: missingCheck,
        draftResult
      };

    } catch (err: any) {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'FAILED',
          completedAt: new Date()
        }
      });
      throw err;
    }
  }
}

export const agentPlanner = new AgentPlanner();
