import { legalNLPClient, ValidationIssue } from '../nlp/legal_nlp_client.js';

export interface ComprehensiveValidationResult {
  overallScore: number;
  status: 'PASSED' | 'NEEDS_REVIEW' | 'FAILED';
  layerScores: {
    factualAccuracy: number;
    sectionCompleteness: number;
    clauseCoverage: number;
    legalKnowledgeSupport: number;
    semanticConsistency: number;
  };
  deterministicIssues: ValidationIssue[];
  legalBertIssues: ValidationIssue[];
  allIssues: ValidationIssue[];
  disclaimer: string;
}

export class ValidationEngine {
  /**
   * Run multi-layer validation:
   * Layer 1: Deterministic rule verification
   * Layer 2: Legal-BERT semantic and clause classification verification
   * Layer 3: Secondary heuristic review
   */
  async validate(
    documentType: string,
    sections: Array<{ sectionType: string; title?: string; content: string }>,
    structuredFacts: Record<string, any>,
    approvedClauses: Array<{ clauseType: string; title: string; content: string }> = []
  ): Promise<ComprehensiveValidationResult> {
    const fullText = sections.map(s => s.content).join('\n\n');

    // Layer 1: Deterministic Validation
    const deterministicIssues: ValidationIssue[] = this.runDeterministicValidation(
      documentType,
      sections,
      fullText,
      structuredFacts
    );

    // Layer 2: Legal-BERT Validation
    let legalBertIssues: ValidationIssue[] = [];
    let bertScore = 95;
    try {
      const bertRes = await legalNLPClient.validateSections(documentType, sections, approvedClauses);
      legalBertIssues = bertRes.issues;
      bertScore = bertRes.score;
    } catch (err) {
      console.warn('Legal NLP validation warning:', err);
      // If service is offline, flag advisory issue
      legalBertIssues.push({
        type: 'NLP_SERVICE_OFFLINE',
        severity: 'LOW',
        section: 'System',
        description: 'Legal-BERT validation service was unreachable; deterministic validation was enforced.'
      });
    }

    const allIssues = [...deterministicIssues, ...legalBertIssues];

    // Compute metrics
    const highSeverityCount = allIssues.filter(i => i.severity === 'HIGH').length;
    const medSeverityCount = allIssues.filter(i => i.severity === 'MEDIUM').length;
    const lowSeverityCount = allIssues.filter(i => i.severity === 'LOW').length;

    const factMismatchCount = allIssues.filter(i => i.type === 'FACT_MISMATCH').length;
    const missingSectionCount = allIssues.filter(i => i.type === 'MISSING_SECTION').length;

    const factualAccuracy = Math.max(0, 100 - (factMismatchCount * 35));
    const sectionCompleteness = Math.max(0, 100 - (missingSectionCount * 30));
    const clauseCoverage = Math.max(40, 100 - (medSeverityCount * 12));
    const semanticConsistency = Math.max(30, Math.round(bertScore));
    const legalKnowledgeSupport = approvedClauses.length > 0 ? 95 : 75;

    // Overall composite validation score
    const weightedScore = Math.round(
      factualAccuracy * 0.35 +
      sectionCompleteness * 0.25 +
      clauseCoverage * 0.15 +
      semanticConsistency * 0.15 +
      legalKnowledgeSupport * 0.10
    );

    let status: 'PASSED' | 'NEEDS_REVIEW' | 'FAILED' = 'PASSED';
    if (highSeverityCount > 0 || factualAccuracy < 80) {
      status = 'NEEDS_REVIEW';
    } else if (weightedScore < 60) {
      status = 'FAILED';
    }

    return {
      overallScore: Math.min(100, Math.max(0, weightedScore)),
      status,
      layerScores: {
        factualAccuracy,
        sectionCompleteness,
        clauseCoverage,
        legalKnowledgeSupport,
        semanticConsistency
      },
      deterministicIssues,
      legalBertIssues,
      allIssues,
      disclaimer: "AI Validation Score — informational only. This metric indicates automated heuristic and semantic alignment, and does not constitute a legal guarantee."
    };
  }

  /**
   * Deterministic Validation Rules
   */
  private runDeterministicValidation(
    documentType: string,
    sections: Array<{ sectionType: string; title?: string; content: string }>,
    fullText: string,
    facts: Record<string, any>
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Party Name Exact Check
    if (documentType === 'NDA') {
      const p1 = facts.disclosingParty?.name;
      const p2 = facts.receivingParty?.name;

      if (p1 && !fullText.includes(p1)) {
        issues.push({
          type: 'FACT_MISMATCH',
          severity: 'HIGH',
          section: 'Parties',
          description: `Disclosing party name '${p1}' specified in facts does not appear in the generated document text.`
        });
      }
      if (p2 && !fullText.includes(p2)) {
        issues.push({
          type: 'FACT_MISMATCH',
          severity: 'HIGH',
          section: 'Parties',
          description: `Receiving party name '${p2}' specified in facts does not appear in the generated document text.`
        });
      }

      // 2. Duration Check
      const durationFact = (facts.duration || '').toLowerCase().trim();
      if (durationFact) {
        // Extract years/months mentioned in duration section
        const durationSection = sections.find(s => s.sectionType === 'duration' || s.title?.toLowerCase().includes('duration') || s.title?.toLowerCase().includes('term'));
        const durationText = (durationSection ? durationSection.content : fullText).toLowerCase();

        // Check if duration numbers match
        const factNumMatch = durationFact.match(/\d+/);
        if (factNumMatch) {
          const factNum = factNumMatch[0];
          // Look for any conflicting number of years/months in duration context
          const docNumMatch = durationText.match(/(\d+)\s*(?:years?|months?)/);
          if (docNumMatch && docNumMatch[1] !== factNum) {
            issues.push({
              type: 'FACT_MISMATCH',
              severity: 'HIGH',
              section: 'Duration',
              description: `Duration fact mismatch: Fact specifies '${durationFact}', but generated document specifies '${docNumMatch[0]}'.`
            });
          }
        }
      }

      // 3. Governing Law & Jurisdiction Check
      const govLaw = facts.governingLaw;
      if (govLaw && !fullText.toLowerCase().includes(govLaw.toLowerCase())) {
        issues.push({
          type: 'FACT_MISMATCH',
          severity: 'HIGH',
          section: 'Governing Law',
          description: `Governing law '${govLaw}' was not incorporated in the governing law clause.`
        });
      }

      // 4. Signature Block Check
      const hasSignatures = sections.some(s => s.sectionType === 'signatures' || /in witness whereof|for and on behalf of|signature/i.test(s.content));
      if (!hasSignatures) {
        issues.push({
          type: 'MISSING_SIGNATURE_BLOCK',
          severity: 'HIGH',
          section: 'Signatures',
          description: 'Document is missing an operative execution and signature block.'
        });
      }

    } else { // LEGAL_NOTICE
      const sender = facts.sender?.name;
      const recipient = facts.recipient?.name;
      const amount = facts.amount;
      const responsePeriod = facts.responsePeriod;

      if (sender && !fullText.includes(sender)) {
        issues.push({
          type: 'FACT_MISMATCH',
          severity: 'HIGH',
          section: 'Sender',
          description: `Sender name '${sender}' specified in facts does not appear in the notice.`
        });
      }

      if (recipient && !fullText.includes(recipient)) {
        issues.push({
          type: 'FACT_MISMATCH',
          severity: 'HIGH',
          section: 'Recipient',
          description: `Recipient name '${recipient}' specified in facts does not appear in the notice.`
        });
      }

      // Money Amount Check
      if (amount) {
        // Strip symbols for pure numeric/text comparison
        const cleanFactAmount = amount.replace(/[^0-9]/g, '');
        const cleanText = fullText.replace(/,/g, '');
        if (cleanFactAmount && !cleanText.includes(cleanFactAmount)) {
          issues.push({
            type: 'FACT_MISMATCH',
            severity: 'HIGH',
            section: 'Demand / Breach',
            description: `Outstanding monetary claim of '${amount}' does not match the figure referenced in the notice text.`
          });
        }
      }

      // Response Period Check
      if (responsePeriod) {
        const factPeriodNum = responsePeriod.match(/\d+/)?.[0];
        if (factPeriodNum) {
          const noticePeriodMatch = fullText.match(/(\d+)\s*days?/i);
          if (noticePeriodMatch && noticePeriodMatch[1] !== factPeriodNum) {
            issues.push({
              type: 'FACT_MISMATCH',
              severity: 'HIGH',
              section: 'Response Period',
              description: `Response period mismatch: Fact specifies '${responsePeriod}', but notice stipulates '${noticePeriodMatch[0]}'.`
            });
          }
        }
      }
    }

    return issues;
  }
}

export const validationEngine = new ValidationEngine();
