import { legalNLPClient, ValidationIssue } from '../nlp/legal_nlp_client.js';
import {
  parseDocumentStructure,
  locateTextInDocument,
  stripTemplateInstructions,
  isInstructionOrPlaceholder,
  DocumentLocation,
  DocumentPatch
} from '../documents/document_structure.js';

export interface ValidationFinding extends ValidationIssue {
  id: string;
  issueId: string;
  category: 'FACTUAL' | 'STRUCTURAL' | 'RISK' | 'COMPLIANCE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  section: string;
  title: string;
  message: string;
  description: string; // for backward compatibility
  location: DocumentLocation;
  evidence: string;
  reason: string;
  suggestion: string;
  canAutoFix: boolean;
  mode: 'SAFE_AUTO' | 'REVIEW' | 'MANUAL';
  confidence: number;
  sources?: Array<{ title: string; source: string; relevance?: number }>;
  proposedPatch?: DocumentPatch;
}

export interface ComprehensiveValidationResult {
  overallScore: number;
  status: 'PASSED' | 'NEEDS_REVIEW' | 'FAILED';
  summaryCounts: {
    passedChecks: number;
    needsAttention: number;
    highPriority: number;
    safeFixable: number;
  };
  layerScores: {
    factualAccuracy: number;
    sectionCompleteness: number;
    clauseCoverage: number;
    legalKnowledgeSupport: number;
    semanticConsistency: number;
  };
  semanticStatus?: {
    available: boolean;
    service: string;
    message?: string;
  };
  deterministicIssues: ValidationFinding[];
  legalBertIssues: ValidationFinding[];
  allIssues: ValidationFinding[];
  disclaimer: string;
}

export class ValidationEngine {
  /**
   * Run multi-tier validation:
   * Layer 1: Deterministic rules (facts, consistency, broken references, missing data)
   * Layer 2: Legal-BERT semantic consistency & approved clause alignment
   * Layer 3: Risk & compliance analysis
   */
  async validate(
    documentType: string,
    sections: Array<{ sectionType: string; title?: string; content: string }>,
    structuredFacts: Record<string, any>,
    approvedClausesOrFullText?: Array<{ clauseType: string; title?: string; content: string }> | string,
    optionalFullText?: string
  ): Promise<ComprehensiveValidationResult> {
    let approvedClauses: Array<{ clauseType: string; title?: string; content: string }> = [];
    let fullText: string;

    if (typeof approvedClausesOrFullText === 'string') {
      fullText = approvedClausesOrFullText;
      approvedClauses = [];
    } else {
      approvedClauses = Array.isArray(approvedClausesOrFullText) ? approvedClausesOrFullText : [];
      fullText = optionalFullText || sections.map(s => s.content).join('\n\n---\n\n');
    }

    // Layer 1: Deterministic Validation
    const deterministicIssues: ValidationFinding[] = this.runDeterministicValidation(
      documentType,
      sections,
      fullText,
      structuredFacts || {}
    );

    // Layer 2: Legal-BERT Validation
    let legalBertIssues: ValidationFinding[] = [];
    let bertScore = 95;
    let remoteServiceUsed = false;
    let serviceName = 'Embedded Legal Heuristics Fallback';

    try {
      const bertRes = await legalNLPClient.validateSections(documentType, sections, approvedClauses);
      bertScore = bertRes.score;
      remoteServiceUsed = bertRes.remoteServiceUsed ?? false;
      serviceName = bertRes.serviceName || (remoteServiceUsed ? 'InLegalBERT (Remote NLP)' : 'Embedded Legal Heuristics Fallback');

      // Transform Legal-BERT issues into full ValidationFinding objects
      // Note: Never include NLP_SERVICE_OFFLINE as a legal defect finding card!
      legalBertIssues = (bertRes.issues || [])
        .filter(iss => iss.type !== 'NLP_SERVICE_OFFLINE' && !iss.description?.toLowerCase().includes('nlp service offline'))
        .map((iss, idx) => {
          const located = locateTextInDocument(fullText, iss.section, iss.section);
          const issueId = `bert_${iss.type.toLowerCase()}_${idx}`;

          return {
            id: issueId,
            issueId,
            type: iss.type,
            category: iss.type === 'MISSING_SECTION' ? 'STRUCTURAL' : 'COMPLIANCE',
            severity: iss.severity as 'HIGH' | 'MEDIUM' | 'LOW',
            section: iss.section,
            title: formatIssueTitle(iss.type, iss.section),
            message: iss.description,
            description: iss.description,
            location: located.location,
            evidence: located.evidence,
            reason: getReasonForType(iss.type, iss.description),
            suggestion: getSuggestionForType(iss.type, iss.section),
            canAutoFix: iss.type === 'MISSING_SECTION' || iss.type === 'APPROVED_CLAUSE_DEVIATION',
            mode: iss.type === 'MISSING_SECTION' ? 'REVIEW' : (iss.type === 'APPROVED_CLAUSE_DEVIATION' ? 'REVIEW' : 'MANUAL'),
            confidence: 0.88,
            sources: [{ title: 'Atharv Legal Knowledge Base & InLegalBERT Standards', source: 'Institutional Precedents' }]
          };
        });
    } catch (err) {
      console.warn('Remote Legal NLP service unavailable; evaluated using embedded legal validation engine:', err);
    }

    const semanticStatus = {
      available: remoteServiceUsed,
      service: serviceName,
      message: remoteServiceUsed
        ? 'Semantic analysis completed via Legal NLP service.'
        : 'Semantic analysis unavailable — deterministic validation completed.'
    };

    // Combine & Deduplicate Issues
    const seenIssueKeys = new Set<string>();
    const allIssues: ValidationFinding[] = [];

    for (const issue of [...deterministicIssues, ...legalBertIssues]) {
      const key = `${issue.type}_${(issue.section || '').toLowerCase()}_${(issue.title || '').toLowerCase()}`;
      if (!seenIssueKeys.has(key)) {
        seenIssueKeys.add(key);
        allIssues.push(issue);
      }
    }

    // Compute metrics
    const highSeverityCount = allIssues.filter(i => i.severity === 'HIGH').length;
    const medSeverityCount = allIssues.filter(i => i.severity === 'MEDIUM').length;
    const lowSeverityCount = allIssues.filter(i => i.severity === 'LOW').length;
    const safeFixableCount = allIssues.filter(i => i.canAutoFix && i.mode === 'SAFE_AUTO').length;

    const factMismatchCount = allIssues.filter(i => i.type === 'FACT_MISMATCH' || i.type === 'CONFLICTING_TERMS' || i.type === 'PARTY_MISMATCH').length;
    const missingSectionCount = allIssues.filter(i => i.type === 'MISSING_SECTION').length;

    const factualAccuracy = Math.max(0, 100 - (factMismatchCount * 25));
    const sectionCompleteness = Math.max(0, 100 - (missingSectionCount * 20));
    const clauseCoverage = Math.max(40, 100 - (medSeverityCount * 8));
    const semanticConsistency = Math.max(30, Math.round(bertScore));
    const legalKnowledgeSupport = approvedClauses.length > 0 ? 95 : 85;

    // Dynamic Composite Score Calculation
    // Base 100 with penalties for detected issues
    const totalPenalty = (highSeverityCount * 12) + (medSeverityCount * 5) + (lowSeverityCount * 2);
    const overallScore = Math.max(20, Math.min(100, 100 - totalPenalty));

    let status: 'PASSED' | 'NEEDS_REVIEW' | 'FAILED' = 'PASSED';
    if (highSeverityCount > 0 || factualAccuracy < 80) {
      status = 'NEEDS_REVIEW';
    } else if (overallScore < 60) {
      status = 'FAILED';
    }

    // Passed checks count calculation (e.g. 16 standard checks - issues count)
    const passedChecks = Math.max(8, 16 - allIssues.length);

    return {
      overallScore,
      status,
      summaryCounts: {
        passedChecks,
        needsAttention: medSeverityCount + lowSeverityCount,
        highPriority: highSeverityCount,
        safeFixable: safeFixableCount
      },
      layerScores: {
        factualAccuracy,
        sectionCompleteness,
        clauseCoverage,
        legalKnowledgeSupport,
        semanticConsistency
      },
      semanticStatus,
      deterministicIssues,
      legalBertIssues,
      allIssues,
      disclaimer: "AI Validation Score - informational only. This metric indicates automated heuristic and semantic alignment, and does not constitute a legal guarantee."
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
  ): ValidationFinding[] {
    const issues: ValidationFinding[] = [];
    const docParsed = parseDocumentStructure(fullText);
    const cleanText = stripTemplateInstructions(fullText);
    const isNDA = /nda|non-disclosure|confidentiality/i.test(documentType);
    const isServicesOrConsulting = /services|consulting|contractor|development/i.test(documentType);

    // ==========================================
    // 1. PARTY NAME EXACT CHECK (NDA & NOTICE)
    // ==========================================
    if (isNDA || isServicesOrConsulting) {
      const p1 = typeof facts.disclosingParty === 'string'
        ? facts.disclosingParty
        : facts.disclosingParty?.name || facts.parties?.disclosingParty || facts.partyA || facts.client;
      const p2 = typeof facts.receivingParty === 'string'
        ? facts.receivingParty
        : facts.receivingParty?.name || facts.parties?.receivingParty || facts.partyB || facts.serviceProvider || facts.contractor;

      if (p1 && typeof p1 === 'string' && p1.trim() && !cleanText.includes(p1.trim())) {
        const partiesSec = sections.find(s => s.sectionType === 'parties' || /part/i.test(s.title || ''));
        const p1Target = (partiesSec?.content.match(/(?:entered\s+into\s+by|by\s+and\s+between)\s+([^,("\n]+)/i))?.[1]?.trim() || 'Disclosing Party';
        const located = locateTextInDocument(fullText, p1Target, 'Parties');
        issues.push({
          id: 'det_fact_party_disclosing',
          issueId: 'det_fact_party_disclosing',
          type: 'PARTY_MISMATCH',
          category: 'FACTUAL',
          severity: 'HIGH',
          section: 'Parties',
          title: 'Party Name Mismatch (Disclosing Party)',
          message: `Disclosing party name '${p1}' specified in facts does not appear in the agreement. Found '${p1Target}'.`,
          description: `Disclosing party name '${p1}' specified in facts does not appear in the agreement. Found '${p1Target}'.`,
          location: located.location,
          evidence: located.evidence,
          reason: `Misidentifying the formal registered contracting entity creates privity defects and renders non-disclosure covenants unenforceable against the intended party.`,
          suggestion: `Incorporate the authoritative entity name '${p1}' into the Parties identification clause.`,
          canAutoFix: true,
          mode: 'SAFE_AUTO',
          confidence: 0.96,
          proposedPatch: {
            id: 'patch_p1_name',
            issueId: 'det_fact_party_disclosing',
            action: 'REPLACE_TEXT',
            target: located.location,
            originalText: p1Target,
            replacementText: p1,
            reason: `Binds authoritative disclosing entity '${p1}' into the contract preamble.`,
            canAutoFix: true,
            mode: 'SAFE_AUTO',
            confidence: 0.96,
            requiresUserInput: false
          }
        });
      }

      if (p2 && typeof p2 === 'string' && p2.trim() && !cleanText.includes(p2.trim())) {
        const partiesSec = sections.find(s => s.sectionType === 'parties' || /part/i.test(s.title || ''));
        const p2Target = (partiesSec?.content.match(/(?:and\s+)([^,("\n]+)(?:\s*\("Receiving|\s*\("Consultant|\s*\("Service|\s*\("Vendor)/i))?.[1]?.trim() || 'Receiving Party';
        const located = locateTextInDocument(fullText, p2Target, 'Parties');
        issues.push({
          id: 'det_fact_party_receiving',
          issueId: 'det_fact_party_receiving',
          type: 'PARTY_MISMATCH',
          category: 'FACTUAL',
          severity: 'HIGH',
          section: 'Parties',
          title: 'Party Name Mismatch (Receiving Party)',
          message: `Receiving party name '${p2}' specified in facts does not appear in the agreement. Found '${p2Target}'.`,
          description: `Receiving party name '${p2}' specified in facts does not appear in the agreement. Found '${p2Target}'.`,
          location: located.location,
          evidence: located.evidence,
          reason: `Failing to bind the receiving party by its formal legal name undermines the enforceability of confidentiality restrictions.`,
          suggestion: `Incorporate the authoritative entity name '${p2}' into the Parties identification clause.`,
          canAutoFix: true,
          mode: 'SAFE_AUTO',
          confidence: 0.96,
          proposedPatch: {
            id: 'patch_p2_name',
            issueId: 'det_fact_party_receiving',
            action: 'REPLACE_TEXT',
            target: located.location,
            originalText: p2Target,
            replacementText: p2,
            reason: `Binds authoritative receiving entity '${p2}' into the contract preamble.`,
            canAutoFix: true,
            mode: 'SAFE_AUTO',
            confidence: 0.96,
            requiresUserInput: false
          }
        });
      }

      // ==========================================
      // 2. DURATION / TERM FACT CHECK
      // ==========================================
      const durationFact = (facts.duration || '').toLowerCase().trim();
      if (durationFact) {
        const factNumMatch = durationFact.match(/\d+/);
        if (factNumMatch) {
          const factNum = factNumMatch[0];

          // Search inside duration/term section or clean text
          const durationSec = sections.find(s =>
            s.sectionType === 'duration' ||
            s.title?.toLowerCase().includes('duration') ||
            s.title?.toLowerCase().includes('term')
          );
          const durationText = durationSec ? stripTemplateInstructions(durationSec.content) : cleanText;

          const docNumMatch = durationText.match(/(\d+)\s*(?:years?|months?)/i);
          if (docNumMatch && docNumMatch[1] !== factNum) {
            const located = locateTextInDocument(fullText, docNumMatch[0], 'Duration');
            issues.push({
              id: 'det_fact_duration_mismatch',
              issueId: 'det_fact_duration_mismatch',
              type: 'FACT_MISMATCH',
              category: 'FACTUAL',
              severity: 'HIGH',
              section: 'Duration',
              title: 'Contract Term & Duration Mismatch',
              message: `Duration fact mismatch: Fact specifies '${durationFact}', but generated document specifies '${docNumMatch[0]}'.`,
              description: `Duration fact mismatch: Fact specifies '${durationFact}', but generated document specifies '${docNumMatch[0]}'.`,
              location: located.location,
              evidence: located.evidence,
              reason: `Discrepancy in the duration period undermines certainty regarding when confidentiality covenants and trade secret protections expire.`,
              suggestion: `Align the duration in the contract text with the authoritative project fact ('${durationFact}').`,
              canAutoFix: true,
              mode: 'SAFE_AUTO',
              confidence: 0.95,
              proposedPatch: {
                id: 'patch_duration',
                issueId: 'det_fact_duration_mismatch',
                action: 'REPLACE_TEXT',
                target: located.location,
                originalText: docNumMatch[0],
                replacementText: durationFact,
                reason: `Replaces contradictory term '${docNumMatch[0]}' with authoritative fact '${durationFact}'.`,
                canAutoFix: true,
                mode: 'SAFE_AUTO',
                confidence: 0.95,
                requiresUserInput: false
              }
            });
          }
        }
      }

      // ==========================================
      // 3. GOVERNING LAW & JURISDICTION CHECK
      // ==========================================
      const govLaw = facts.governingLaw || facts.jurisdiction;
      if (govLaw && !cleanText.toLowerCase().includes(govLaw.toLowerCase())) {
        const located = locateTextInDocument(fullText, 'governing law', 'Governing Law');
        issues.push({
          id: 'det_fact_governing_law',
          issueId: 'det_fact_governing_law',
          type: 'FACT_MISMATCH',
          category: 'COMPLIANCE',
          severity: 'HIGH',
          section: 'Governing Law',
          title: 'Designated Governing Law Omitted',
          message: `Governing law '${govLaw}' was not incorporated in the governing law clause.`,
          description: `Governing law '${govLaw}' was not incorporated in the governing law clause.`,
          location: located.location,
          evidence: located.evidence,
          reason: `Omitting the designated governing jurisdiction exposes disputes to conflict-of-laws disputes and forum shopping.`,
          suggestion: `Stipulate '${govLaw}' as the sole governing substantive law and exclusive forum.`,
          canAutoFix: true,
          mode: 'REVIEW',
          confidence: 0.90
        });
      }

      // ==========================================
      // 4. MISSING SIGNATURE BLOCK CHECK
      // ==========================================
      const hasSignatures = sections.some(s =>
        s.sectionType === 'signatures' ||
        /in witness whereof|for and on behalf of|execution & signatures|by:\s*_+|authorized signatory|signature:\s*_+/i.test(s.content)
      ) || /in witness whereof|for and on behalf of|execution & signatures|by:\s*_+/i.test(cleanText);

      if (!hasSignatures) {
        issues.push({
          id: 'det_missing_signatures',
          issueId: 'det_missing_signatures',
          type: 'MISSING_SIGNATURE_BLOCK',
          category: 'STRUCTURAL',
          severity: 'HIGH',
          section: 'Signatures',
          title: 'Missing Execution and Signature Block',
          message: 'Document is missing an operative execution and signature block.',
          description: 'Document is missing an operative execution and signature block.',
          location: {
            sectionId: docParsed.sections[docParsed.sections.length - 1]?.id || 'sec_end'
          },
          evidence: 'End of document',
          reason: 'A contract without signature lines cannot be formally executed or admitted as an operative written agreement.',
          suggestion: 'Append a bilateral corporate signature block with designated authorized signatories.',
          canAutoFix: true,
          mode: 'SAFE_AUTO',
          confidence: 0.94
        });
      }
    }

    // ==========================================
    // 5. CONFLICTING INTERNAL PERIODS
    // ==========================================
    // Only compare timeframes within the SAME legal obligation category.
    // (E.g. 7 days to return materials vs 30 days termination notice is legitimate standard practice, NOT a conflict!)

    // A. Payment / Invoicing timeframe conflicts
    const paymentPeriodMatches = Array.from(cleanText.matchAll(/(?:(?:invoices?|payment|fees?|due|payable|remit)[^\.\n]*?(?:within|past|period of)?\s*(\d+)\s*days|(?:within|past|period of)?\s*(\d+)\s*days[^\.\n]*?(?:of invoice|of receipt of invoice|due|payable|for payment))/gi));
    const paymentDays = Array.from(new Set(paymentPeriodMatches.map(m => m[1] || m[2]).filter(Boolean)));
    if (paymentDays.length >= 2) {
      const matchText = paymentPeriodMatches[1][0];
      const located = locateTextInDocument(fullText, matchText, 'Payment & Terms');
      issues.push({
        id: 'det_conflicting_payment_period',
        issueId: 'det_conflicting_payment_period',
        type: 'CONFLICTING_TERMS',
        category: 'FACTUAL',
        severity: 'HIGH',
        section: 'Payment & Terms',
        title: 'Conflicting Contractual Timeframes',
        message: `Potential internal inconsistency: payment timeframe appears as ${paymentDays[0]} days in one provision and ${paymentDays[1]} days in another.`,
        description: `Potential internal inconsistency: payment timeframe appears as ${paymentDays[0]} days in one provision and ${paymentDays[1]} days in another.`,
        location: located.location,
        evidence: `${paymentDays[0]} days vs ${paymentDays[1]} days`,
        reason: `Conflicting performance deadlines in the same agreement render compliance unprovable and void default clauses.`,
        suggestion: `Align the conflicting clauses to a single mutually agreed timeframe (${paymentDays[0]} days or ${paymentDays[1]} days).`,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.92
      });
    }

    // B. Termination notice timeframe conflicts
    const noticeMatches = Array.from(cleanText.matchAll(/(?:terminate|termination)[^\.\n]*?(?:upon|with|giving|providing|of)\s*(?:at\s*least\s*)?(\d+)\s*days(?:\s*(?:prior\s*)?written)?\s*notice|(\d+)\s*days(?:\s*(?:prior\s*)?written)?\s*notice\s*(?:to\s*terminate|of\s*termination)/gi));
    const noticeDays = Array.from(new Set(noticeMatches.map(m => m[1] || m[2]).filter(Boolean)));
    if (noticeDays.length >= 2) {
      const matchText = noticeMatches[1][0];
      const located = locateTextInDocument(fullText, matchText, 'Termination');
      issues.push({
        id: 'det_conflicting_notice_period',
        issueId: 'det_conflicting_notice_period',
        type: 'CONFLICTING_TERMS',
        category: 'FACTUAL',
        severity: 'HIGH',
        section: 'Termination',
        title: 'Conflicting Termination Notice Periods',
        message: `Potential internal inconsistency: termination notice appears as ${noticeDays[0]} days in one provision and ${noticeDays[1]} days in another.`,
        description: `Potential internal inconsistency: termination notice appears as ${noticeDays[0]} days in one provision and ${noticeDays[1]} days in another.`,
        location: located.location,
        evidence: `${noticeDays[0]} days vs ${noticeDays[1]} days`,
        reason: `Conflicting termination notice periods create contractual ambiguity over effective termination dates.`,
        suggestion: `Standardize termination notice to a single timeframe (${noticeDays[0]} days or ${noticeDays[1]} days).`,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.92
      });
    }

    // C. Return/destruction of materials timeframe conflicts
    const returnMatches = Array.from(cleanText.matchAll(/(?:(?:return|destroy|surrender)[^\.\n]*?(?:within|in)?\s*(\d+)\s*days|(\d+)\s*days[^\.\n]*?(?:to return|to destroy|return of))/gi));
    const returnDays = Array.from(new Set(returnMatches.map(m => m[1] || m[2]).filter(Boolean)));
    if (returnDays.length >= 2) {
      const matchText = returnMatches[1][0];
      const located = locateTextInDocument(fullText, matchText, 'Return of Materials');
      issues.push({
        id: 'det_conflicting_return_period',
        issueId: 'det_conflicting_return_period',
        type: 'CONFLICTING_TERMS',
        category: 'FACTUAL',
        severity: 'HIGH',
        section: 'Return of Materials',
        title: 'Conflicting Return of Materials Timeframes',
        message: `Potential internal inconsistency: return timeframe appears as ${returnDays[0]} days in one provision and ${returnDays[1]} days in another.`,
        description: `Potential internal inconsistency: return timeframe appears as ${returnDays[0]} days in one provision and ${returnDays[1]} days in another.`,
        location: located.location,
        evidence: `${returnDays[0]} days vs ${returnDays[1]} days`,
        reason: 'Contradictory return periods cause uncertainty regarding post-termination compliance deadlines.',
        suggestion: `Standardize return of materials timeframe to either ${returnDays[0]} days or ${returnDays[1]} days.`,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.92
      });
    }

    // ==========================================
    // 6. MISSING PAYMENT AMOUNT
    // ==========================================
    // Key rules:
    // 1. Distinguish between real contract clauses/facts and template placeholders, instructions, headings, and examples.
    // 2. Only flag missing payment amount when the actual contract genuinely contains a payment/consideration obligation without an amount, formula, or schedule.
    // 3. If the document type is an NDA and no payment obligation actually exists, do not generate this HIGH flag.
    const hasFactAmount = !!(facts.amount || facts.fee || facts.compensation || facts.price);
    const hasNumericAmount = /\$[\d,]+|\bINR\s*[\d,]+|\bUSD\s*[\d,]+|\bEUR\s*[\d,]+|\b\d+\s*dollars\b|\b\d+\s*rupees\b|\b\d+\s*cents\b/i.test(cleanText);

    // Look for genuine affirmative payment obligations in non-template lines
    const textLines = cleanText.split('\n');
    let affirmativePaymentClause = '';

    for (const line of textLines) {
      const t = line.trim();
      if (!t || isInstructionOrPlaceholder(t)) continue;

      // Skip common non-payment/disclaimer phrases:
      // - "damages alone would be inadequate compensation"
      // - "reasonable attorney's fees"
      // - "each party shall bear its own expenses/fees"
      // - "without payment of any royalty or fee"
      // - "no compensation or fee is payable"
      if (/damages\s+(?:alone\s+)?(?:would|may|shall)?\s*(?:not\s+be|be\s+inadequate)\s+compensation|inadequate\s+compensation|reasonable\s+attorney(?:'s)?\s*fees|bear\s+(?:its|their)\s+own\s+(?:costs|expenses|fees)|without\s+(?:any\s+)?(?:payment|fee|compensation|remuneration|royalty)|no\s+(?:payment|fee|compensation|remuneration|royalty)\s+shall\s+be\s+due|free\s+of\s+charge/i.test(t)) {
        continue;
      }

      // Check for affirmative covenant: "shall pay", "agrees to pay", "Client shall compensate", "fee of", "in consideration of"
      if (
        /(?:shall|agrees?\s+to|will)\s+(?:pay|remit|disburse)\b/i.test(t) ||
        /(?:client|customer|company)\s+shall\s+(?:compensate|reimburse|pay)\b/i.test(t) ||
        /(?:compensation|consulting\s*fee|service\s*fee|contract\s*price|purchase\s*price)\s*(?:is|shall\s*be|in\s*the\s*amount\s*of)\b/i.test(t)
      ) {
        affirmativePaymentClause = t;
        break;
      }
    }

    // Determine if payment check should trigger:
    // For NDA: Only if facts specify an amount OR an affirmative payment covenant actually exists in text
    // For Services / Consulting: If affirmative payment covenant exists without an amount, OR if facts specify payment, OR if a payment section exists without an amount
    const shouldCheckPayment = isNDA
      ? (hasFactAmount || !!affirmativePaymentClause)
      : (isServicesOrConsulting || hasFactAmount || !!affirmativePaymentClause);

    if (shouldCheckPayment && !hasNumericAmount && !hasFactAmount) {
      const paymentSec = sections.find(s =>
        /compensation|payment|fee|remuneration|pricing/i.test(s.title || '') ||
        /compensation|payment|fee/i.test(s.sectionType)
      );

      if (affirmativePaymentClause || (isServicesOrConsulting && paymentSec)) {
        const targetSearch = affirmativePaymentClause || paymentSec?.title || 'Payment';
        const located = locateTextInDocument(fullText, targetSearch.slice(0, 50), 'Payment');
        issues.push({
          id: 'det_missing_payment_amount',
          issueId: 'det_missing_payment_amount',
          type: 'MISSING_PAYMENT_AMOUNT',
          category: 'FACTUAL',
          severity: 'HIGH',
          section: paymentSec?.title || 'Consideration & Payment',
          title: 'Payment Amount Not Specified',
          message: 'Payment obligation is referenced in the text, but no specific monetary amount or payment schedule is defined.',
          description: 'Payment obligation is referenced in the text, but no specific monetary amount or payment schedule is defined.',
          location: located.location,
          evidence: located.evidence,
          reason: 'A contract reciting monetary consideration without a defined amount or ascertainable formula is vulnerable to unenforceability for indefiniteness.',
          suggestion: 'Specify the exact consideration amount, currency, and installment or milestone schedule.',
          canAutoFix: false,
          mode: 'MANUAL',
          confidence: 0.95
        });
      }
    }

    // ==========================================
    // 7. MISSING NOTICE PERIOD IN TERMINATION
    // ==========================================
    const termSec = sections.find(s => /term|termination/i.test(s.title || '') || s.sectionType.includes('term'));
    if (termSec) {
      const cleanTermContent = stripTemplateInstructions(termSec.content);
      const hasNoticeMention = /(?:by|upon)?\s*(?:prior\s*)?(?:written\s*)?notice/i.test(cleanTermContent);
      const hasNoticeDays = /\d+\s*days/i.test(cleanTermContent);

      if (hasNoticeMention && !hasNoticeDays) {
        const noticeMatch = cleanTermContent.match(/(?:by|upon)\s*(?:prior\s*)?(?:written\s*)?notice/i) || cleanTermContent.match(/notice/i);
        const originalPhrase = noticeMatch ? noticeMatch[0] : 'notice';
        const located = locateTextInDocument(fullText, originalPhrase, 'Term');
        const rawPeriod = facts.noticePeriod || facts.responsePeriod || '30 days';
        const knownPeriod = rawPeriod.includes('day') ? rawPeriod : `${rawPeriod} days`;

        issues.push({
          id: 'det_missing_notice_period',
          issueId: 'det_missing_notice_period',
          type: 'MISSING_NOTICE_PERIOD',
          category: 'STRUCTURAL',
          severity: 'MEDIUM',
          section: 'Termination',
          title: 'Termination Notice Period Omitted',
          message: 'The termination clause specifies termination upon notice but does not define a required notice timeframe.',
          description: 'The termination clause specifies termination upon notice but does not define a required notice timeframe.',
          location: located.location,
          evidence: located.evidence,
          reason: 'Without a defined notice duration, an agreement can be terminated abruptly, prejudicing ongoing operations and transition arrangements.',
          suggestion: `Specify the required notice window (e.g., '${knownPeriod} written notice').`,
          canAutoFix: true,
          mode: 'SAFE_AUTO',
          confidence: 0.92,
          proposedPatch: {
            id: 'patch_notice_period',
            issueId: 'det_missing_notice_period',
            action: 'REPLACE_TEXT',
            target: located.location,
            originalText: originalPhrase,
            replacementText: `upon ${knownPeriod} written notice`,
            reason: `Defines clear ${knownPeriod} written notice window before termination becomes effective.`,
            canAutoFix: true,
            mode: 'SAFE_AUTO',
            confidence: 0.92,
            requiresUserInput: false
          }
        });
      }
    }

    // ==========================================
    // 8. UNLIMITED LIABILITY EXPOSURE
    // ==========================================
    const hasLiabilityClause = sections.some(s => /liability|indemn/i.test(s.title || '') || s.sectionType.includes('liability') || s.sectionType.includes('indemn'));
    if (hasLiabilityClause && !isNDA) {
      const hasCap = /liability\s*(?:shall\s*not\s*exceed|is\s*capped|shall\s*be\s*limited\s*to)|aggregate\s*liability/i.test(cleanText);
      if (!hasCap) {
        const located = locateTextInDocument(fullText, /liability|indemnif/i, 'Liability');
        issues.push({
          id: 'det_unlimited_liability',
          issueId: 'det_unlimited_liability',
          type: 'UNLIMITED_LIABILITY',
          category: 'RISK',
          severity: 'HIGH',
          section: 'Liability',
          title: 'Unlimited Liability Exposure',
          message: 'The liability provision does not contain an identifiable monetary limitation or aggregate liability cap.',
          description: 'The liability provision does not contain an identifiable monetary limitation or aggregate liability cap.',
          location: located.location,
          evidence: located.evidence,
          reason: 'Absence of an aggregate liability cap exposes contracting entities to uncapped claims, consequential damages, and enterprise financial risk.',
          suggestion: 'Review whether the parties agreed to an aggregate liability cap (e.g. fees paid over the preceding 12 months) and define applicable exclusions.',
          canAutoFix: false,
          mode: 'MANUAL',
          confidence: 0.91
        });
      }
    }

    // ==========================================
    // 9. MISSING IP OWNERSHIP
    // ==========================================
    // Suppress on NDAs: In an NDA, 'intellectual property' and 'proprietary information' are merely defined as confidential.
    // Only check in services, consulting, or development agreements where custom deliverables or work product are commissioned.
    if (!isNDA && documentType !== 'LEGAL_NOTICE') {
      const commissionsCustomWork = /(?:shall\s*(?:create|develop|author|deliver|provide|build)\s*(?:custom\s*)?(?:software|deliverables|work\s*product|source\s*code|inventions)|custom\s*software\s*modules|deliverables\s*and\s*deliverables|commissioned\s*work)\b/i.test(cleanText);
      const definesOwnership = /hereby\s*assigns|exclusive\s*property\s*of|sole\s*and\s*exclusive\s*owner|retains\s*all\s*right|all\s*rights.*shall\s*belong|work\s*(?:made\s*)?for\s*hire|ownership\s*of\s*(?:ip|intellectual\s*property|deliverables)|assignment\s*of\s*rights|title\s*and\s*interest\s*in/i.test(cleanText);

      if (commissionsCustomWork && !definesOwnership) {
        const located = locateTextInDocument(fullText, /custom software|deliverables|work product|inventions/i, 'Intellectual Property');
        issues.push({
          id: 'det_missing_ip_ownership',
          issueId: 'det_missing_ip_ownership',
          type: 'MISSING_IP_OWNERSHIP',
          category: 'RISK',
          severity: 'MEDIUM',
          section: 'Intellectual Property',
          title: 'Intellectual Property Ownership Unclear',
          message: 'The contract references intellectual property or deliverables, but does not explicitly state who owns newly created work.',
          description: 'The contract references intellectual property or deliverables, but does not explicitly state who owns newly created work.',
          location: located.location,
          evidence: located.evidence,
          reason: 'Failure to explicitly state whether developments are retained, licensed, or assigned leads to dual-ownership disputes under statutory IP laws.',
          suggestion: 'Add an intellectual property covenant defining ownership transfer, retaining pre-existing rights, and licensing terms.',
          canAutoFix: false,
          mode: 'MANUAL',
          confidence: 0.86
        });
      }
    }

    // ==========================================
    // 10. BROKEN CROSS-REFERENCE (TEST 7)
    // ==========================================
    // Look for references like "Section 15", "Clause 12"
    const refMatches = Array.from(fullText.matchAll(/(?:Section|Clause)\s+(\d+)/gi));
    const sectionNumbers = sections.map(s => {
      const match = (s.title || '').match(/\b(\d+)\b/);
      return match ? parseInt(match[1], 10) : null;
    }).filter((n): n is number => n !== null);

    const maxSectionNum = sectionNumbers.length > 0 ? Math.max(...sectionNumbers) : sections.length;

    for (const ref of refMatches) {
      const refNum = parseInt(ref[1], 10);
      if (refNum > maxSectionNum + 3) {
        const located = locateTextInDocument(fullText, ref[0]);
        issues.push({
          id: `det_broken_ref_${refNum}`,
          issueId: `det_broken_ref_${refNum}`,
          type: 'BROKEN_CROSS_REFERENCE',
          category: 'STRUCTURAL',
          severity: 'MEDIUM',
          section: 'Cross-References',
          title: `Broken Cross-Reference: ${ref[0]}`,
          message: `${ref[0]} is referenced in the text, but the agreement outline only contains sections up to ${maxSectionNum}.`,
          description: `${ref[0]} is referenced in the text, but the agreement outline only contains sections up to ${maxSectionNum}.`,
          location: located.location,
          evidence: located.evidence,
          reason: 'Broken cross-references render contingent rights or conditional obligations legally ambiguous and open to judicial reinterpretation.',
          suggestion: `Update ${ref[0]} to refer to the actual operative section governing this matter.`,
          canAutoFix: false,
          mode: 'MANUAL',
          confidence: 0.90
        });
        break; // Report one clear instance
      }
    }

    // ==========================================
    // 11. LEGAL NOTICE SPECIFIC DETERMINISTIC CHECKS
    // ==========================================
    if (documentType === 'LEGAL_NOTICE') {
      const sender = facts.sender?.name;
      const recipient = facts.recipient?.name;
      const amount = facts.amount;
      const responsePeriod = facts.responsePeriod;

      if (sender && !fullText.includes(sender)) {
        const located = locateTextInDocument(fullText, 'from', 'Sender');
        issues.push({
          id: 'det_notice_sender',
          issueId: 'det_notice_sender',
          type: 'FACT_MISMATCH',
          category: 'FACTUAL',
          severity: 'HIGH',
          section: 'Sender',
          title: 'Sender Identity Missing',
          message: `Sender name '${sender}' specified in facts does not appear in the notice.`,
          description: `Sender name '${sender}' specified in facts does not appear in the notice.`,
          location: located.location,
          evidence: located.evidence,
          reason: 'A statutory legal notice must clearly identify the aggrieved claimant issuing the notice.',
          suggestion: `State the sender's full legal name ('${sender}') in the header and demand narrative.`,
          canAutoFix: true,
          mode: 'SAFE_AUTO',
          confidence: 0.95
        });
      }

      if (recipient && !fullText.includes(recipient)) {
        const located = locateTextInDocument(fullText, 'to:', 'Recipient');
        issues.push({
          id: 'det_notice_recipient',
          issueId: 'det_notice_recipient',
          type: 'FACT_MISMATCH',
          category: 'FACTUAL',
          severity: 'HIGH',
          section: 'Recipient',
          title: 'Recipient Identity Missing',
          message: `Recipient name '${recipient}' specified in facts does not appear in the notice.`,
          description: `Recipient name '${recipient}' specified in facts does not appear in the notice.`,
          location: located.location,
          evidence: located.evidence,
          reason: 'A notice without accurate addressee details cannot establish effective statutory service of process.',
          suggestion: `Address the notice explicitly to '${recipient}'.`,
          canAutoFix: true,
          mode: 'SAFE_AUTO',
          confidence: 0.95
        });
      }

      if (amount) {
        const cleanFactAmount = amount.replace(/[^0-9]/g, '');
        const cleanText = fullText.replace(/,/g, '');
        if (cleanFactAmount && !cleanText.includes(cleanFactAmount)) {
          const located = locateTextInDocument(fullText, /demand|claim|\$/i, 'Demand');
          issues.push({
            id: 'det_notice_amount_mismatch',
            issueId: 'det_notice_amount_mismatch',
            type: 'FACT_MISMATCH',
            category: 'FACTUAL',
            severity: 'HIGH',
            section: 'Demand / Breach',
            title: 'Monetary Claim Sum Mismatch',
            message: `Outstanding monetary claim of '${amount}' does not match the figure referenced in the notice text.`,
            description: `Outstanding monetary claim of '${amount}' does not match the figure referenced in the notice text.`,
            location: located.location,
            evidence: located.evidence,
            reason: 'Discrepancies in demand figures create fatal procedural defects under Negotiable Instruments and Commercial Code statutes.',
            suggestion: `Synchronize the outstanding claim figure with the authoritative sum ('${amount}').`,
            canAutoFix: true,
            mode: 'SAFE_AUTO',
            confidence: 0.95
          });
        }
      }

      if (responsePeriod) {
        const factPeriodNum = responsePeriod.match(/\d+/)?.[0];
        if (factPeriodNum) {
          const noticePeriodMatch = fullText.match(/(\d+)\s*days?/i);
          if (noticePeriodMatch && noticePeriodMatch[1] !== factPeriodNum) {
            const located = locateTextInDocument(fullText, noticePeriodMatch[0], 'Response Period');
            issues.push({
              id: 'det_notice_response_period',
              issueId: 'det_notice_response_period',
              type: 'FACT_MISMATCH',
              category: 'FACTUAL',
              severity: 'HIGH',
              section: 'Response Period',
              title: 'Cure / Response Period Mismatch',
              message: `Response period mismatch: Fact specifies '${responsePeriod}', but notice stipulates '${noticePeriodMatch[0]}'.`,
              description: `Response period mismatch: Fact specifies '${responsePeriod}', but notice stipulates '${noticePeriodMatch[0]}'.`,
              location: located.location,
              evidence: located.evidence,
              reason: 'Stipulating an incorrect cure period prejudices subsequent legal remedies and may invalidate default notice requirements.',
              suggestion: `Stipulate '${responsePeriod}' as the statutory cure period.`,
              canAutoFix: true,
              mode: 'SAFE_AUTO',
              confidence: 0.95
            });
          }
        }
      }
    }

    return issues;
  }
}

function formatIssueTitle(type: string, section: string): string {
  switch (type) {
    case 'MISSING_SECTION':
      return `Missing Required Section: ${section}`;
    case 'EMPTY_OR_TRUNCATED_SECTION':
      return `Truncated Clause in ${section}`;
    case 'APPROVED_CLAUSE_DEVIATION':
      return `Wording Deviation in ${section}`;
    case 'DUPLICATE_CLAUSE':
      return `Redundant / Duplicate Clause in ${section}`;
    default:
      return `${section} Review Finding`;
  }
}

function getReasonForType(type: string, description: string): string {
  switch (type) {
    case 'MISSING_SECTION':
      return 'Standard commercial agreements require this substantive section to establish operative legal duties and remedies.';
    case 'EMPTY_OR_TRUNCATED_SECTION':
      return 'Brief or incomplete clauses fail to specify mutual standards of performance or statutory exceptions.';
    case 'APPROVED_CLAUSE_DEVIATION':
      return 'The wording departs substantially from approved institutional standard clauses, increasing exposure to adverse court interpretation.';
    case 'DUPLICATE_CLAUSE':
      return 'Redundant provisions create contractual ambiguity regarding which clause governs in the event of an alleged breach.';
    default:
      return description;
  }
}

function getSuggestionForType(type: string, section: string): string {
  switch (type) {
    case 'MISSING_SECTION':
      return `Insert standard institutional covenants for ${section}.`;
    case 'EMPTY_OR_TRUNCATED_SECTION':
      return `Expand the truncated clause with comprehensive rights, conditions, and exceptions.`;
    case 'APPROVED_CLAUSE_DEVIATION':
      return `Replace or align the clause with institutional approved wording.`;
    case 'DUPLICATE_CLAUSE':
      return `Consolidate or remove the duplicate clause.`;
    default:
      return `Review and refine this section.`;
  }
}

export const validationEngine = new ValidationEngine();
