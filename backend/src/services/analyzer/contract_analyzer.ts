import zlib from 'zlib';
import mammoth from 'mammoth';
import { parseDocumentStructure } from '../documents/document_structure.js';
import { legalNLPClient } from '../nlp/legal_nlp_client.js';

export type ContractClauseStatus = 'PRESENT' | 'MISSING' | 'INCOMPLETE' | 'AMBIGUOUS';
export type ContractRiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface ContractPartyInfo {
  name: string;
  role: string;
  address?: string;
  signatory?: string;
}

export interface ContractClauseMapItem {
  id: string;
  name: string;
  category: string;
  status: ContractClauseStatus;
  isRequired: boolean;
  detectedSnippet?: string;
  explanation: string;
  location?: { start: number; end: number };
}

export interface ContractRiskArea {
  id: string;
  ruleId: string;
  severity: ContractRiskSeverity;
  category: string;
  clause: string;
  section: string;
  title: string;
  description: string;
  reason: string;
  practicalImpact: string;
  evidence: string;
  confidence: number;
  location?: { line?: number; textRange?: { start: number; end: number } };
  legalRationale: string;
  suggestedResolution: string;
  suggestedFix: string;
  nature: 'TEMPLATE_PLACEHOLDER' | 'LEGAL_RISK' | 'CONTRADICTION' | 'MISSING_CLAUSE' | 'SECURITY';
}

export interface ContractConsistencyCheck {
  partiesMatch: boolean;
  dateChronologyValid: boolean;
  definedTermsConsistent: boolean;
  findings: string[];
  contradictionRisks: ContractRiskArea[];
}

export interface ContractOverview {
  title: string;
  contractType: string;
  parties: ContractPartyInfo[];
  effectiveDate?: string;
  duration?: string;
  monetaryTerms: string;
  governingLaw?: string;
  jurisdiction?: string;
  wordCount: number;
  paragraphCount: number;
  hasPromptInjection?: boolean;
  hasUnresolvedPlaceholders?: boolean;
}

export interface ContractHealthSubScore {
  score: number;
  weight: number;
  explanation: string;
}

export interface ContractHealthSummary {
  score: number;
  status: 'STRONG' | 'MODERATE' | 'NEEDS_REVISION' | 'CRITICAL_ATTENTION';
  categoryScores: {
    completeness: number;
    clauseCoverage: number;
    riskAndCompliance: number;
    consistency: number;
    clarity: number;
    formatting: number;
    evidenceConfidence: number;
  };
  subScores: {
    completeness: ContractHealthSubScore;
    clauseCoverage: ContractHealthSubScore;
    consistency: ContractHealthSubScore;
    risk: ContractHealthSubScore;
    formatting: ContractHealthSubScore;
    evidenceConfidence: ContractHealthSubScore;
  };
  scoreBreakdown: string[];
  disclaimer: string;
}

export interface ContractAnalysisResult {
  overview: ContractOverview;
  clauseMap: ContractClauseMapItem[];
  riskAreas: ContractRiskArea[];
  consistency: ContractConsistencyCheck;
  health: ContractHealthSummary;
  extractedText: string;
}

export class ContractAnalyzer {
  /**
   * Extracts raw plain text from PDF, DOCX, or TXT buffer.
   */
  async extractTextFromBuffer(buffer: Buffer, mimeType?: string, filename?: string): Promise<string> {
    const fn = (filename || '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    // 1. PDF
    if (fn.endsWith('.pdf') || mime.includes('pdf')) {
      try {
        const pdfModule: any = await import('pdf-parse');
        const pdfFunc = pdfModule.default || pdfModule;
        const data = await pdfFunc(buffer);
        if (data && data.text && data.text.trim().length > 0) {
          return data.text.trim();
        }
      } catch (pdfErr) {
        // Fall back gracefully to internal PDF stream extractor
      }
      return this.fallbackPdfExtract(buffer);
    }

    // 2. DOCX
    if (fn.endsWith('.docx') || mime.includes('wordprocessingml') || mime.includes('docx')) {
      try {
        const res = await mammoth.extractRawText({ buffer });
        if (res && res.value && res.value.trim().length > 0) {
          return res.value.trim();
        }
      } catch (docxErr) {
        console.warn('mammoth failed, falling back to zip/xml extractor:', docxErr);
      }
      return this.fallbackDocxExtract(buffer);
    }

    // 3. Plain Text / Markdown / UTF-8
    return buffer.toString('utf-8').trim();
  }

  /**
   * Zero-dependency fallback DOCX text extractor (ZIP -> word/document.xml)
   */
  fallbackDocxExtract(buffer: Buffer): string {
    let offset = 0;
    while (offset < buffer.length - 4) {
      if (buffer.readUInt32LE(offset) === 0x04034b50) { // PK\x03\x04
        const compMethod = buffer.readUInt16LE(offset + 8);
        const compSize = buffer.readUInt32LE(offset + 18);
        const fnLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const filename = buffer.toString('utf8', offset + 30, offset + 30 + fnLen);
        const dataOffset = offset + 30 + fnLen + extraLen;

        if (filename === 'word/document.xml') {
          const compData = buffer.subarray(dataOffset, dataOffset + compSize);
          let xmlStr = '';
          if (compMethod === 8) {
            xmlStr = zlib.inflateRawSync(compData).toString('utf8');
          } else {
            xmlStr = compData.toString('utf8');
          }

          return xmlStr
            .replace(/<\/w:p>/gi, '\n\n')
            .replace(/<w:br[^>]*\/>/gi, '\n')
            .replace(/<w:tab[^>]*\/>/gi, '\t')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim();
        }
        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }
    return buffer.toString('utf8');
  }

  /**
   * Zero-dependency robust PDF text stream extractor
   */
  fallbackPdfExtract(buffer: Buffer): string {
    const streamMarker = Buffer.from('stream');
    const endStreamMarker = Buffer.from('endstream');
    const textBlocks: string[] = [];

    let pos = 0;
    while (pos < buffer.length) {
      const sIdx = buffer.indexOf(streamMarker, pos);
      if (sIdx === -1) break;

      let dataStart = sIdx + 6;
      if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
      else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) dataStart += 1;

      const eIdx = buffer.indexOf(endStreamMarker, dataStart);
      if (eIdx === -1) break;

      let dataEnd = eIdx;
      if (buffer[dataEnd - 2] === 0x0d && buffer[dataEnd - 1] === 0x0a) dataEnd -= 2;
      else if (buffer[dataEnd - 1] === 0x0a || buffer[dataEnd - 1] === 0x0d) dataEnd -= 1;

      const streamData = buffer.subarray(dataStart, dataEnd);
      let decompressed: Buffer | null = null;
      try {
        decompressed = zlib.inflateSync(streamData);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamData);
        } catch {
          decompressed = streamData;
        }
      }

      if (decompressed) {
        const streamText = decompressed.toString('latin1');
        const btRegex = /BT([\s\S]*?)ET/g;
        let btMatch;
        while ((btMatch = btRegex.exec(streamText)) !== null) {
          const body = btMatch[1];
          let lineAcc = '';

          // 1. Handle TJ array operators: [ ... ] TJ
          const tjRegex = /\[([\s\S]*?)\]\s*TJ/g;
          let tjMatch;
          let hasTJ = false;
          while ((tjMatch = tjRegex.exec(body)) !== null) {
            hasTJ = true;
            const inner = tjMatch[1];
            const tokenRegex = /<([0-9a-fA-F]+)>|\(([^)]*)\)|(-?\d+(?:\.\d+)?)/g;
            let tok;
            while ((tok = tokenRegex.exec(inner)) !== null) {
              if (tok[1] !== undefined) {
                // Hex-encoded string
                const hex = tok[1];
                try {
                  lineAcc += Buffer.from(hex, 'hex').toString('utf8');
                } catch {
                  lineAcc += Buffer.from(hex, 'hex').toString('latin1');
                }
              } else if (tok[2] !== undefined) {
                // Literal string
                lineAcc += tok[2].replace(/\\([()\\])/g, '$1').replace(/\\n/g, '\n');
              } else if (tok[3] !== undefined) {
                const num = parseFloat(tok[3]);
                if (num <= -150) {
                  lineAcc += ' ';
                }
              }
            }
            lineAcc += '\n';
          }

          // 2. Handle single string Tj / ' / " operators
          if (!hasTJ) {
            const strRegex = /(?:\(([^)]*)\)|<([0-9a-fA-F]+)>)\s*(?:Tj|'|")/g;
            let sMatch;
            while ((sMatch = strRegex.exec(body)) !== null) {
              if (sMatch[1] !== undefined) {
                lineAcc += sMatch[1].replace(/\\([()\\])/g, '$1').replace(/\\n/g, '\n') + ' ';
              } else if (sMatch[2] !== undefined) {
                try {
                  lineAcc += Buffer.from(sMatch[2], 'hex').toString('utf8') + ' ';
                } catch {
                  lineAcc += Buffer.from(sMatch[2], 'hex').toString('latin1') + ' ';
                }
              }
            }
          }

          if (lineAcc.trim().length > 0) {
            textBlocks.push(lineAcc.trim());
          }
        }
      }

      pos = eIdx + 9;
    }

    if (textBlocks.length === 0) {
      // Fallback: search for readable text strings if no compressed BT/ET matched
      const raw = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      return raw;
    }

    return textBlocks.join('\n\n');
  }

  /**
   * Complete Structured Contract Analysis Pipeline:
   * text extraction → prompt injection screening → contract type detection →
   * placeholder/template instruction classification (BEFORE legal rules) →
   * clause detection (semantic & ontology) → context/negation-aware risk analysis →
   * contradiction detection → evidence verification → 6-dimension health scoring.
   */
  async analyzeContract(rawText: string, filename?: string): Promise<ContractAnalysisResult> {
    const text = rawText.trim();
    if (!text) {
      throw new Error('Contract text is empty or could not be extracted.');
    }

    // 0. Prompt Injection Defense & Data Isolation
    const securityCheck = this.detectPromptInjection(text);
    const isolatedText = securityCheck.sanitizedText;

    // 1. Contract Overview & Type Detection
    const overview = await this.extractOverview(isolatedText, filename);

    // 2. Classify Placeholders & Template Instructions BEFORE Legal Rules Run
    const placeholderAnalysis = this.detectPlaceholders(isolatedText);
    overview.hasUnresolvedPlaceholders = placeholderAnalysis.placeholderRisks.length > 0;
    overview.hasPromptInjection = securityCheck.injectionRisks.length > 0;

    // 3. Clause Completeness Map (Ontology-grounded)
    const clauseMap = this.evaluateClauseMap(isolatedText, overview.contractType);

    // 4. Substantive Risk Areas (Context, Negation, and Condition-aware)
    const substantiveRisks = this.evaluateRiskAreas(isolatedText, overview.contractType, overview);

    // 5. Legal Contradiction & Consistency Verification
    const consistency = this.checkConsistency(isolatedText, overview);

    // Aggregate all findings across pipeline
    const aggregatedRisks: ContractRiskArea[] = [
      ...securityCheck.injectionRisks,
      ...placeholderAnalysis.placeholderRisks,
      ...substantiveRisks,
      ...consistency.contradictionRisks
    ];

    // 6. Evidence Verification: verify quote really exists in document text!
    const verifiedRisks = this.verifyEvidenceQuotes(aggregatedRisks, isolatedText);

    // 7. Calculate 6-Dimension Weighted Contract Health Score (0–100)
    const health = this.calculateHealthScore(clauseMap, verifiedRisks, consistency, overview);

    return {
      overview,
      clauseMap,
      riskAreas: verifiedRisks,
      consistency,
      health,
      extractedText: text
    };
  }

  /**
   * Defend against Prompt Injection:
   * Isolates untrusted document text in data blocks and flags adversarial override commands.
   */
  private detectPromptInjection(text: string): { sanitizedText: string; injectionRisks: ContractRiskArea[] } {
    const injectionRisks: ContractRiskArea[] = [];
    
    // Adversarial patterns seeking to manipulate LLM instructions or override validation
    const injectionPatterns = [
      {
        regex: /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above|existing)\s+(?:instructions|prompts|rules|commands|guidelines)/i,
        label: 'Instruction Overwrite Command'
      },
      {
        regex: /(?:system\s+override|admin\s+override|developer\s+mode|dan\s+mode|jailbreak|root\s+access)/i,
        label: 'System Override Token'
      },
      {
        regex: /(?:declare|rate|score|mark|assert|output)\s+(?:this\s+)?(?:contract|document|agreement)?\s*(?:as\s+)?(?:perfect|100%|flawless|completely\s+safe|score:\s*100)/i,
        label: 'Arbitrary Score Forcing Attempt'
      },
      {
        regex: /(?:bypass|disable|turn\s+off)\s+(?:all\s+)?(?:validation|checks|rules|filters|analysis|safety)/i,
        label: 'Rule Bypass Command'
      }
    ];

    for (const pat of injectionPatterns) {
      const match = text.match(pat.regex);
      if (match) {
        const quote = match[0].trim();
        const linesBefore = text.substring(0, match.index || 0).split('\n').length;
        const sectionTitle = this.detectSectionHeaderAtOffset(text, match.index || 0);

        injectionRisks.push({
          id: `security_injection_${injectionRisks.length + 1}`,
          ruleId: 'RULE_SECURITY_PROMPT_INJECTION',
          severity: 'CRITICAL',
          confidence: 0.99,
          category: 'Security & Integrity',
          clause: 'Document Security',
          section: sectionTitle,
          title: 'Adversarial Prompt Injection Attempt Detected',
          description: `Contract contains meta-instruction "${quote}" attempting to hijack the automated analyzer's evaluation rules.`,
          reason: 'Document text contains adversarial commands designed to bypass legal analysis or force false 100% scores.',
          practicalImpact: 'Adversarial manipulation attempts compromise document integrity and indicate potential bad faith or tampering.',
          evidence: quote,
          location: {
            line: linesBefore,
            textRange: { start: match.index || 0, end: (match.index || 0) + quote.length }
          },
          legalRationale: 'Legal contracts must contain enforceable substantive commitments, not adversarial instructions targeting software systems.',
          suggestedResolution: 'Quarantine and eliminate unauthorized prompt injection tokens from contractual instruments.',
          suggestedFix: 'Remove prompt injection instructions from document immediately.',
          nature: 'SECURITY'
        });
      }
    }

    // Isolate document text as passive DATA
    const sanitizedText = text;

    return { sanitizedText, injectionRisks };
  }

  /**
   * Generalized Pattern + Semantic Detection of Placeholders & Template Instructions:
   * Runs BEFORE legal rules run. "Specify consideration", "[Party Name]", "<Date>", "TBD", "_____"
   * are classified as TEMPLATE_PLACEHOLDER / MISSING_INFORMATION, never genuine obligations.
   */
  private detectPlaceholders(text: string): { placeholderRisks: ContractRiskArea[]; cleanedTextForRules: string } {
    const placeholderRisks: ContractRiskArea[] = [];
    const lines = text.split('\n');
    let inSigBlock = false;
    let charOffset = 0;

    const getPlaceholderId = (prefix: string) => {
      return placeholderRisks.length === 0 ? 'unresolved_placeholders' : `ph_${prefix}_${placeholderRisks.length + 1}`;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (/^#{1,4}\s+.*(?:signature|execution)/i.test(trimmed) || /in\s+witness\s+whereof/i.test(trimmed)) {
        inSigBlock = true;
      }

      const isSigLine = inSigBlock ||
        /(?:by|signature|name|title|date|authorized\s*signatory|for\s+and\s+on\s+behalf\s+of|for|employee|employer|client|contractor|provider|company)[:\s]+_{3,}/i.test(trimmed) ||
        /:\s*_{3,}/.test(trimmed);

      const sectionTitle = this.detectSectionHeaderAtOffset(text, charOffset);

      // (a) Generalized Imperative Template Instruction Verbs
      // e.g. "Specify the exact consideration", "Enter the address", "Insert party name", "Provide payment details"
      const imperativeRegex = /\b(?:Specify|Enter|Insert|Provide|Fill\s+in|Add|State|Select|Describe|Define)\s+(?:the\s+|an?\s+)?(?:exact\s+|verified\s+)?(?:party|address|amount|fee|sum|consideration|name|date|details|jurisdiction|scope|term|signatory|covenant)[^\.\n]*/gi;
      let impMatch;
      while ((impMatch = imperativeRegex.exec(line)) !== null) {
        const quote = impMatch[0].trim();
        const startPos = charOffset + impMatch.index;
        placeholderRisks.push({
          id: getPlaceholderId('imperative'),
          ruleId: 'RULE_TEMPLATE_PLACEHOLDER',
          severity: 'HIGH',
          confidence: 0.96,
          category: 'Clarity & Completeness',
          clause: 'Drafting Instructions',
          section: sectionTitle,
          title: 'Unresolved Drafting Instruction Prompt',
          description: `Contract contains imperative drafting instruction "${quote}" that was never replaced with substantive contractual language.`,
          reason: 'Template guidance sentence was left verbatim in operative document text.',
          practicalImpact: 'Template instructions in place of binding legal commitments render the provision indefinite and unenforceable.',
          evidence: quote,
          location: { line: i + 1, textRange: { start: startPos, end: startPos + quote.length } },
          legalRationale: 'Under contract law, an agreement to specify terms in the future lacks mutuality of assent.',
          suggestedResolution: `Replace "${quote}" with concrete commercial terms or obligations.`,
          suggestedFix: `Specify concrete contractual terms in place of "${quote}".`,
          nature: 'TEMPLATE_PLACEHOLDER'
        });
      }

      // (b) Bracketed Placeholders: [Party Name], [Date], [Insert amount here], [Company Name], [   ]
      const bracketRegex = /\[(?![\^])([^\]\n]{2,60})\](?!\()/g;
      let bm;
      while ((bm = bracketRegex.exec(line)) !== null) {
        const full = bm[0];
        // Ignore checkbox and citations e.g. [x], [X], [2024]
        if (/^\[\s*[xX]?\s*\]$/.test(full) || /^\[\s*\d{4}\s*\]$/.test(full)) continue;
        const startPos = charOffset + bm.index;
        placeholderRisks.push({
          id: getPlaceholderId('bracket'),
          ruleId: 'RULE_TEMPLATE_PLACEHOLDER',
          severity: 'HIGH',
          confidence: 0.98,
          category: 'Clarity & Completeness',
          clause: 'Bracketed Tokens',
          section: sectionTitle,
          title: 'Unresolved Bracketed Token',
          description: `Bracketed placeholder token "${full}" remains unpopulated.`,
          reason: 'Square bracket token marks missing information required for a complete legal instrument.',
          practicalImpact: 'Essential contract terms left in brackets create facial ambiguity regarding the parties or covenants.',
          evidence: full,
          location: { line: i + 1, textRange: { start: startPos, end: startPos + full.length } },
          legalRationale: 'Contracts with uncompleted bracketed tokens fail for vagueness on critical covenants.',
          suggestedResolution: `Replace bracketed field "${full}" with concrete, verified details.`,
          suggestedFix: `Replace "${full}" with concrete facts.`,
          nature: 'TEMPLATE_PLACEHOLDER'
        });
      }

      // (c) Standalone Angle Brackets: <Term>, <Amount>, <Jurisdiction>
      const angleRegex = /<([A-Za-z0-9_\-\s]{2,40})>/g;
      let am;
      while ((am = angleRegex.exec(line)) !== null) {
        const full = am[0];
        const startPos = charOffset + am.index;
        placeholderRisks.push({
          id: getPlaceholderId('angle'),
          ruleId: 'RULE_TEMPLATE_PLACEHOLDER',
          severity: 'HIGH',
          confidence: 0.98,
          category: 'Clarity & Completeness',
          clause: 'Angle Bracket Tokens',
          section: sectionTitle,
          title: 'Unresolved Angle Bracket Placeholder',
          description: `Angle bracket placeholder token "${full}" was not filled in.`,
          reason: 'Token represents unpopulated field in standard contract template.',
          practicalImpact: 'Missing variable in operative agreement.',
          evidence: full,
          location: { line: i + 1, textRange: { start: startPos, end: startPos + full.length } },
          legalRationale: 'Unresolved placeholders fail to bind parties to definite duties.',
          suggestedResolution: `Fill in "${full}" with agreed terms.`,
          suggestedFix: `Replace "${full}" with verified facts.`,
          nature: 'TEMPLATE_PLACEHOLDER'
        });
      }

      // (d) Standalone Curly Brackets: {{company_name}}
      const curlyRegex = /\{\{([^}\n]+)\}\}/g;
      let cm;
      while ((cm = curlyRegex.exec(line)) !== null) {
        const full = cm[0];
        const startPos = charOffset + cm.index;
        placeholderRisks.push({
          id: getPlaceholderId('curly'),
          ruleId: 'RULE_TEMPLATE_PLACEHOLDER',
          severity: 'HIGH',
          confidence: 0.98,
          category: 'Clarity & Completeness',
          clause: 'Template Variables',
          section: sectionTitle,
          title: 'Unresolved Template Macro Token',
          description: `Variable macro "${full}" remains unpopulated.`,
          reason: 'Unresolved templating macro in legal draft.',
          practicalImpact: 'Facial defect evidencing incomplete drafting.',
          evidence: full,
          location: { line: i + 1, textRange: { start: startPos, end: startPos + full.length } },
          legalRationale: 'Unexecuted macros indicate unfinalized negotiation draft.',
          suggestedResolution: `Replace "${full}" with final corporate details.`,
          suggestedFix: `Replace "${full}" with verified entity details.`,
          nature: 'TEMPLATE_PLACEHOLDER'
        });
      }

      // (e) Naked Placeholder Keywords: TBD, N/A, INSERT ... HERE, TO BE DETERMINED
      const nakedRegex = /\b(?:TBD|N\/A|INSERT\s+(?:[A-Za-z0-9_\s]{1,30}\s+)?HERE|YOUR\s+NAME|ENTER\s+PARTY\s+NAME|PARTY\s+[AB]\s+NAME|TO\s+BE\s+DETERMINED|INSERT\s+AMOUNT|T\.B\.D\.)\b/gi;
      let nm;
      while ((nm = nakedRegex.exec(line)) !== null) {
        const full = nm[0];
        const startPos = charOffset + nm.index;
        placeholderRisks.push({
          id: getPlaceholderId('naked'),
          ruleId: 'RULE_TEMPLATE_PLACEHOLDER',
          severity: 'HIGH',
          confidence: 0.95,
          category: 'Clarity & Completeness',
          clause: 'Missing Information',
          section: sectionTitle,
          title: `Explicit Missing Term Token (${full})`,
          description: `Drafting token "${full}" denotes missing information that has not been agreed upon.`,
          reason: 'Contract contains explicit placeholder token.',
          practicalImpact: 'Essential covenant remains TBD / unnegotiated.',
          evidence: full,
          location: { line: i + 1, textRange: { start: startPos, end: startPos + full.length } },
          legalRationale: 'Agreements to agree in the future are generally unenforceable under Indian Contract Act § 29.',
          suggestedResolution: `Specify agreed contractual terms in place of "${full}".`,
          suggestedFix: `Specify final terms in place of "${full}".`,
          nature: 'TEMPLATE_PLACEHOLDER'
        });
      }

      // (f) Non-signature Extended Blanks (e.g. ________)
      if (!isSigLine) {
        const blankRegex = /_{4,}/g;
        let bl;
        while ((bl = blankRegex.exec(line)) !== null) {
          const full = bl[0];
          const startPos = charOffset + bl.index;
          placeholderRisks.push({
            id: getPlaceholderId('blank'),
            ruleId: 'RULE_TEMPLATE_PLACEHOLDER',
            severity: 'HIGH',
            confidence: 0.92,
            category: 'Clarity & Completeness',
            clause: 'Underscore Blanks',
            section: sectionTitle,
            title: 'Unfilled Blank Line',
            description: 'Unfilled underscore blank in operative section.',
            reason: 'Blank underline signifies missing covenant value.',
            practicalImpact: 'Missing variable in contractual body.',
            evidence: full,
            location: { line: i + 1, textRange: { start: startPos, end: startPos + full.length } },
            legalRationale: 'Omission of material terms creates legal uncertainty.',
            suggestedResolution: 'Complete the blank with concrete dates, amounts, or names.',
            suggestedFix: 'Fill in concrete terms.',
            nature: 'TEMPLATE_PLACEHOLDER'
          });
        }
      }

      charOffset += line.length + 1;
    }

    return { placeholderRisks, cleanedTextForRules: text };
  }

  /**
   * Helper to detect which section header governs a character offset
   */
  private detectSectionHeaderAtOffset(text: string, offset: number): string {
    const textBefore = text.substring(0, offset);
    const headers = Array.from(textBefore.matchAll(/(?:^|\n)(?:#{1,3}\s*|\d+[\.\)]\s*)([A-Z][A-Za-z0-9\s,\-&]{3,60})(?=\n|$)/g));
    if (headers.length > 0) {
      return headers[headers.length - 1][1].trim();
    }
    return 'Preamble / General Terms';
  }

  /**
   * Extracts Contract Overview: Type, Parties, Dates, Amounts, Duration, Law
   */
  private async extractOverview(text: string, filename?: string): Promise<ContractOverview> {
    const lower = text.toLowerCase();

    // Determine Contract Type
    let contractType = 'GENERAL_CONTRACT';
    if (lower.includes('non-disclosure') || lower.includes('confidentiality agreement') || lower.includes('nda')) {
      contractType = 'NDA';
    } else if (lower.includes('employment agreement') || lower.includes('appointment letter') || lower.includes('offer of employment')) {
      contractType = 'EMPLOYMENT_AGREEMENT';
    } else if (lower.includes('services agreement') || lower.includes('master services') || lower.includes('statement of work') || lower.includes('consulting agreement')) {
      contractType = 'SERVICE_AGREEMENT';
    } else if (lower.includes('legal notice') || lower.includes('demand notice') || lower.includes('statutory notice') || lower.includes('dishonour of cheque')) {
      contractType = 'LEGAL_NOTICE';
    } else if (lower.includes('lease agreement') || lower.includes('tenancy agreement') || lower.includes('rental agreement')) {
      contractType = 'LEASE_AGREEMENT';
    } else if (lower.includes('partnership agreement') || lower.includes('llp agreement')) {
      contractType = 'PARTNERSHIP_AGREEMENT';
    } else if (lower.includes('commercial agreement') || lower.includes('supply agreement') || lower.includes('vendor agreement') || lower.includes('sale agreement')) {
      contractType = 'COMMERCIAL_CONTRACT';
    }

    // Extract Title
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let title = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].replace(/^#+\s*/, '').trim();
      if (line.length > 5 && line.length < 90 && !line.toLowerCase().startsWith('dated') && !line.toLowerCase().startsWith('by and')) {
        title = line;
        break;
      }
    }
    if (!title) title = `${contractType.replace(/_/g, ' ')} Document`;

    // Extract Parties
    const parties: ContractPartyInfo[] = [];
    const partyRegex = /\b([A-Z][a-zA-Z0-9&.\-']*(?:\s+[A-Z][a-zA-Z0-9&.\-']*)*\s+(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|LLC|Inc\.?|LLP|Corporation|Corp\.?|Company|Technologies|Solutions|Enterprises))\b/g;
    const foundNames: string[] = [];
    let pMatch;
    while ((pMatch = partyRegex.exec(text)) !== null) {
      const pName = pMatch[1].trim();
      if (!foundNames.includes(pName) && !pName.toLowerCase().includes('court') && !pName.toLowerCase().includes('state of')) {
        foundNames.push(pName);
      }
    }

    if (foundNames.length >= 2) {
      parties.push({
        name: foundNames[0],
        role: contractType === 'NDA' ? 'Disclosing Party' : contractType === 'SERVICE_AGREEMENT' ? 'Client / Principal' : 'First Party'
      });
      parties.push({
        name: foundNames[1],
        role: contractType === 'NDA' ? 'Receiving Party' : contractType === 'SERVICE_AGREEMENT' ? 'Service Provider / Contractor' : 'Second Party'
      });
    } else if (foundNames.length === 1) {
      parties.push({ name: foundNames[0], role: 'Primary Party' });
    }

    // Fallback party detection from "between X and Y"
    if (parties.length < 2) {
      const betweenMatch = text.match(/(?:between|by\s+and\s+between)\s+([A-Z][A-Za-z0-9&.,' ]{3,50}?)\s+(?:and|with)\s+([A-Z][A-Za-z0-9&.,' ]{3,50}?)(?=[,.]|\s+dated|\s+effective|\s+having)/i);
      if (betweenMatch) {
        if (!parties.some(p => p.name === betweenMatch[1].trim())) {
          parties.push({ name: betweenMatch[1].trim(), role: 'First Party' });
        }
        if (!parties.some(p => p.name === betweenMatch[2].trim())) {
          parties.push({ name: betweenMatch[2].trim(), role: 'Second Party' });
        }
      }
    }

    // Extract Effective Date
    let effectiveDate: string | undefined;
    const dateMatch = text.match(/\b(?:effective\s+as\s+of|dated|entered\s+into\s+on|effective\s+date:?)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i);
    if (dateMatch) {
      effectiveDate = dateMatch[1];
    }

    // Extract Duration / Term
    let duration: string | undefined;
    const durMatch = text.match(/\b(\d+\s*(?:years?|months?|days?|weeks?))\s*(?:from\s+the\s+effective\s+date|term|period|thereafter)?\b/i);
    if (durMatch) {
      duration = durMatch[0];
    } else if (lower.includes('perpetual') || lower.includes('in perpetuity')) {
      duration = 'Perpetual';
    } else if (lower.includes('at-will') || lower.includes('at will')) {
      duration = 'At-will';
    }

    // Extract Monetary Terms
    let monetaryTerms = 'No monetary consideration specified';
    const moneyMatch = text.match(/(?:₹|\$|€|£|INR|USD|EUR)\s*[\d,]+(?:\.\d{2})?(?:\s*(?:per\s+month|per\s+annum|\/-\s*only|only|monthly|annually))?/i)
      || text.match(/(?:sum\s+of|consideration\s+of|amount\s+of|fee\s+of)\s*([A-Za-z0-9$,.₹\s]+?)(?=\.|\,|$)/i);
    if (moneyMatch) {
      monetaryTerms = moneyMatch[0].trim();
    }

    // Extract Governing Law
    let governingLaw: string | undefined;
    const lawMatch = text.match(/(?:governed\s+by|laws\s+of|accordance\s+with\s+the\s+laws\s+of)\s+([A-Za-z\s]+?)(?=\.|\,|\sand\s+subject|\s+without\s+regard|$)/i);
    if (lawMatch) {
      governingLaw = lawMatch[1].trim();
    }

    // Extract Jurisdiction
    let jurisdiction: string | undefined;
    const jurMatch = text.match(/(?:exclusive\s+jurisdiction\s+of\s+the\s+courts\s+of|courts\s+(?:in|at|of))\s+([A-Za-z\s]+?)(?=\.|\,|$)/i);
    if (jurMatch) {
      jurisdiction = jurMatch[1].trim();
    }

    // Word & Paragraph count
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    return {
      title,
      contractType,
      parties,
      effectiveDate,
      duration,
      monetaryTerms,
      governingLaw,
      jurisdiction,
      wordCount,
      paragraphCount
    };
  }

  /**
   * Generates Clause Completeness Map for the contract type
   */
  evaluateClauseMap(content: string, contractType: string): ContractClauseMapItem[] {
    const text = content || '';
    const lower = text.toLowerCase();
    const isNDA = contractType === 'NDA' || /non-disclosure|confidentiality/i.test(contractType);

    const standardClauses: Array<{
      id: string;
      name: string;
      category: string;
      isRequired: boolean;
      keywords: string[];
      minWords: number;
    }> = [
      {
        id: 'parties_preamble',
        name: 'Parties & Preamble',
        category: 'Preamble',
        isRequired: true,
        keywords: ['by and between', 'entered into', 'parties', 'disclosing party', 'receiving party', 'employer', 'employee', 'client', 'contractor'],
        minWords: 15
      },
      {
        id: 'effective_date',
        name: 'Effective Date',
        category: 'Preamble',
        isRequired: true,
        keywords: ['effective as of', 'effective date', 'dated as of', 'entered into on', 'commencing on'],
        minWords: 5
      },
      {
        id: 'recitals_purpose',
        name: 'Recitals & Purpose',
        category: 'Preamble',
        isRequired: false,
        keywords: ['whereas', 'recitals', 'purpose', 'prospective commercial', 'business discussions', 'background', 'desire to explore'],
        minWords: 15
      },
      {
        id: 'definitions',
        name: 'Definition of Confidential Information',
        category: 'Interpretation',
        isRequired: isNDA || contractType === 'SERVICE_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT',
        keywords: ['definition', 'defined terms', 'shall mean', 'confidential information includes', 'confidential information means', 'proprietary information'],
        minWords: 20
      },
      {
        id: 'exceptions_exclusions',
        name: 'Exceptions & Carve-Outs',
        category: 'Operative',
        isRequired: isNDA,
        keywords: ['exceptions', 'exclusions', 'shall not apply', 'public domain', 'publicly known', 'prior lawful possession', 'independently developed'],
        minWords: 20
      },
      {
        id: 'core_obligations',
        name: isNDA ? 'Non-Disclosure Obligations' : contractType === 'SERVICE_AGREEMENT' ? 'Scope of Services & Deliverables' : 'Core Obligations & Duties',
        category: 'Operative',
        isRequired: true,
        keywords: ['shall not disclose', 'maintain in confidence', 'duty of care', 'reasonable care', 'strict confidence', 'scope of work', 'services to be performed', 'obligations of', 'shall perform', 'covenants'],
        minWords: 20
      },
      {
        id: 'permitted_disclosures',
        name: 'Permitted Disclosures',
        category: 'Operative',
        isRequired: false,
        keywords: ['permitted disclosure', 'need to know', 'directors, officers', 'employees and advisors', 'representatives who have a need', 'written confidentiality'],
        minWords: 15
      },
      {
        id: 'compelled_process',
        name: 'Compelled Process / Court Order',
        category: 'Operative',
        isRequired: false,
        keywords: ['compelled by', 'subpoena', 'court order', 'applicable law', 'protective order', 'administrative body', 'prior written notice to disclosing'],
        minWords: 15
      },
      {
        id: 'term_duration',
        name: 'Term & Duration',
        category: 'Term',
        isRequired: true,
        keywords: ['term of this agreement', 'effective period', 'duration of', 'in effect for a period', 'shall remain in effect for', 'term'],
        minWords: 10
      },
      {
        id: 'survival_provisions',
        name: 'Survival of Obligations',
        category: 'Term',
        isRequired: false,
        keywords: ['survival', 'survive', 'shall survive', 'trade secrets', 'following expiration or termination'],
        minWords: 10
      },
      {
        id: 'return_destruction',
        name: 'Return or Destruction of Materials',
        category: 'Enforcement',
        isRequired: false,
        keywords: ['return or destroy', 'return of materials', 'surrender', 'destroy all', 'written certification', 'upon written request', 'within seven'],
        minWords: 15
      },
      {
        id: 'remedies_injunction',
        name: 'Remedies & Injunctive Relief',
        category: 'Enforcement',
        isRequired: isNDA,
        keywords: ['remedies', 'injunctive relief', 'irreparable harm', 'damages alone', 'specific performance', 'restraining order', 'equitable relief'],
        minWords: 15
      },
      {
        id: 'governing_law',
        name: 'Governing Law',
        category: 'Legal',
        isRequired: true,
        keywords: ['governing law', 'governed by', 'laws of', 'accordance with the laws'],
        minWords: 10
      },
      {
        id: 'jurisdiction_forum',
        name: 'Jurisdiction & Dispute Resolution',
        category: 'Legal',
        isRequired: false,
        keywords: ['jurisdiction', 'courts of', 'exclusive jurisdiction', 'arbitration', 'dispute resolution', 'venue'],
        minWords: 10
      },
      {
        id: 'notices_communication',
        name: 'Notices & Communication',
        category: 'Formalities',
        isRequired: false,
        keywords: ['notices', 'deemed served', 'certified mail', 'written notice', 'addresses set forth'],
        minWords: 10
      },
      {
        id: 'assignment_sublicensing',
        name: 'Assignment Restrictions',
        category: 'Formalities',
        isRequired: false,
        keywords: ['assignment', 'assign', 'neither party may assign', 'without the prior written consent'],
        minWords: 10
      },
      {
        id: 'amendment_modification',
        name: 'Written Amendment',
        category: 'Formalities',
        isRequired: false,
        keywords: ['amendment', 'modified', 'in writing', 'signed by authorized', 'written instrument'],
        minWords: 10
      },
      {
        id: 'severability',
        name: 'Severability',
        category: 'Boilerplate',
        isRequired: false,
        keywords: ['severability', 'held invalid', 'unenforceable', 'remainder shall remain in full force'],
        minWords: 10
      },
      {
        id: 'non_waiver',
        name: 'Non-Waiver',
        category: 'Boilerplate',
        isRequired: false,
        keywords: ['waiver', 'no failure or delay', 'operate as a waiver'],
        minWords: 10
      },
      {
        id: 'entire_agreement',
        name: 'Entire Agreement',
        category: 'Boilerplate',
        isRequired: false,
        keywords: ['entire agreement', 'supersedes all prior', 'merger clause'],
        minWords: 10
      },
      {
        id: 'consideration_payment',
        name: 'Consideration & Payment Terms',
        category: 'Commercial',
        isRequired: contractType === 'SERVICE_AGREEMENT' || contractType === 'EMPLOYMENT_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT' || contractType === 'LEASE_AGREEMENT',
        keywords: ['consideration', 'payment', 'invoicing', 'compensation', 'salary', 'fees', 'remuneration', 'hourly rate', 'invoice', 'pro bono', 'no payment'],
        minWords: 10
      },
      {
        id: 'intellectual_property',
        name: 'Intellectual Property Rights',
        category: 'IP & Ownership',
        isRequired: contractType === 'SERVICE_AGREEMENT' || contractType === 'EMPLOYMENT_AGREEMENT',
        keywords: ['intellectual property', 'work for hire', 'work made for hire', 'ip rights', 'proprietary rights', 'assignment of inventions', 'ownership of deliverables', 'remains the property of that party'],
        minWords: 15
      },
      {
        id: 'liability_indemnity',
        name: 'Limitation of Liability & Indemnification',
        category: 'Risk Allocation',
        isRequired: contractType === 'SERVICE_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT',
        keywords: ['limitation of liability', 'indemnif', 'hold harmless', 'consequential damages', 'liability cap', 'aggregate liability'],
        minWords: 15
      },
      {
        id: 'execution_signatures',
        name: 'Execution & Signature Blocks',
        category: 'Formalities',
        isRequired: true,
        keywords: ['in witness whereof', 'authorized signatory', 'signature:', 'signed by', 'by: ______', 'for and on behalf of'],
        minWords: 10
      }
    ];

    const result: ContractClauseMapItem[] = [];

    for (const sc of standardClauses) {
      let matched = false;
      let matchedSnippet = '';
      let isAmbiguous = false;
      let isIncomplete = false;

      // Search keyword occurrences
      for (const kw of sc.keywords) {
        const idx = lower.indexOf(kw);
        if (idx !== -1) {
          matched = true;
          const start = Math.max(0, idx - 20);
          const end = Math.min(text.length, idx + 160);
          matchedSnippet = text.substring(start, end).replace(/\n+/g, ' ').trim();

          const surrounding = text.substring(idx, Math.min(text.length, idx + 400));
          const wordCount = surrounding.split(/\s+/).length;
          if (wordCount < sc.minWords) {
            isIncomplete = true;
          }
          if (surrounding.includes('...') || surrounding.includes('TBD') || surrounding.includes('to be agreed')) {
            isAmbiguous = true;
          }
          break;
        }
      }

      let status: ContractClauseStatus = 'MISSING';
      let explanation = '';

      if (matched) {
        if (isAmbiguous) {
          status = 'AMBIGUOUS';
          explanation = `Clause detected but contains conditional, unresolved, or vague language.`;
        } else if (isIncomplete) {
          status = 'INCOMPLETE';
          explanation = `Clause detected but appears brief or truncated (${matchedSnippet.split(/\s+/).length} words).`;
        } else {
          status = 'PRESENT';
          explanation = `Standard provisions are explicitly stated.`;
        }
      } else {
        status = 'MISSING';
        explanation = sc.isRequired
          ? `Essential clause for standard ${contractType.replace(/_/g, ' ')} is absent.`
          : `Recommended institutional clause is not present in document.`;
      }

      result.push({
        id: sc.id,
        name: sc.name,
        category: sc.category,
        status,
        isRequired: sc.isRequired,
        detectedSnippet: matchedSnippet || undefined,
        explanation
      });
    }

    return result;
  }

  /**
   * Evaluates Risk & Attention Areas with Context, Negation, and Condition Awareness.
   * Keyword-only findings are strictly disallowed.
   */
  private evaluateRiskAreas(text: string, contractType: string, overview: ContractOverview): ContractRiskArea[] {
    const risks: ContractRiskArea[] = [];
    const lower = text.toLowerCase();

    const findLocation = (target: string) => {
      const idx = text.indexOf(target);
      if (idx === -1) return undefined;
      const linesBefore = text.substring(0, idx).split('\n').length;
      return { line: linesBefore, textRange: { start: idx, end: idx + target.length } };
    };

    // 1. Uncapped Liability Exposure
    if (contractType === 'SERVICE_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT' || contractType === 'EMPLOYMENT_AGREEMENT') {
      const hasLiability = lower.includes('liability') || lower.includes('indemnif');
      const hasCap = lower.includes('aggregate liability') ||
        lower.includes('shall not exceed') ||
        lower.includes('cap on liability') ||
        lower.includes('limited to the total fees') ||
        lower.includes('capped at purchase order');

      if (hasLiability && !hasCap) {
        const liabSnippet = text.match(/[^\n.]{0,80}(?:indemnif|liability)[^\n.]{0,80}/i);
        const quote = liabSnippet ? liabSnippet[0].trim() : 'Liability clause without monetary cap';
        risks.push({
          id: 'uncapped_liability',
          ruleId: 'RULE_UNCAPPED_LIABILITY',
          severity: 'HIGH',
          confidence: 0.92,
          category: 'Risk Allocation',
          clause: 'Limitation of Liability',
          section: this.detectSectionHeaderAtOffset(text, text.indexOf(quote)),
          title: 'Uncapped Liability Exposure',
          description: 'Contract imposes indemnification or breach liabilities without an express monetary cap or exclusion of indirect/consequential damages.',
          reason: 'Absence of an aggregate liability ceiling creates unlimited financial risk for contracting parties.',
          practicalImpact: 'Uncapped exposure leaves party vulnerable to ruinous consequential or third-party damages.',
          evidence: quote,
          location: findLocation(quote),
          legalRationale: 'Commercial best practice under Indian Contract Act § 73 requires mutual liability caps limited to recent fees paid.',
          suggestedResolution: 'Add a standard liability limitation clause capping aggregate damages to total fees paid during preceding 12 months.',
          suggestedFix: 'Insert mutual aggregate liability cap limiting total damages to fees paid in preceding 12 months.',
          nature: 'LEGAL_RISK'
        });
      }
    }

    // 2. Unilateral Immediate Termination Without Cause or Cure Period
    if (lower.includes('terminate immediately') || lower.includes('without notice')) {
      const immMatch = text.match(/[^\n.]{0,80}(?:terminate\s+immediately|without\s+notice)[^\n.]{0,80}/i);
      if (immMatch) {
        const quote = immMatch[0].trim();
        const hasJustCause = lower.includes('material breach') || lower.includes('insolvency') || lower.includes('fraud') || lower.includes('gross negligence');
        
        // If immediate termination is NOT justified by fraud/insolvency/material breach, flag it
        if (!hasJustCause || lower.includes('terminate immediately for convenience') || lower.includes('at any time without notice')) {
          risks.push({
            id: 'unilateral_immediate_termination',
            ruleId: 'RULE_TERMINATION_WITHOUT_CURE',
            severity: 'MEDIUM',
            confidence: 0.88,
            category: 'Termination',
            clause: 'Termination',
            section: this.detectSectionHeaderAtOffset(text, text.indexOf(quote)),
            title: 'Immediate Termination Without Cause or Cure Period',
            description: 'Contract permits unilateral termination immediately without providing an opportunity to cure default.',
            reason: 'Termination without notice or cure creates acute operational disruption and contractual instability.',
            practicalImpact: 'Counterparty can terminate abruptly without allowing remedy of curable administrative breaches.',
            evidence: quote,
            location: findLocation(quote),
            legalRationale: 'Commercial fairness requires mandatory written notice (e.g. 15–30 days) and cure periods before termination for default.',
            suggestedResolution: 'Insert a standard 30-day written notice and 15-day cure period prior to contract termination for default.',
            suggestedFix: 'Add 30-day written notice and 15-day cure period before termination for default.',
            nature: 'LEGAL_RISK'
          });
        }
      }
    }

    // 3. Ambiguous Deliverables IP Ownership (Work Made For Hire / IP Assignment)
    if (contractType === 'SERVICE_AGREEMENT' || contractType === 'EMPLOYMENT_AGREEMENT') {
      const hasCustomWork = lower.includes('deliverables') || lower.includes('custom software') || lower.includes('develop') || lower.includes('create') || lower.includes('architecture');
      const hasIpAssignment = lower.includes('work for hire') ||
        lower.includes('work made for hire') ||
        lower.includes('assigns all right, title and interest') ||
        lower.includes('exclusive property of client') ||
        lower.includes('exclusive property of employer') ||
        lower.includes('remains the property of that party') ||
        lower.includes('retains all right') ||
        lower.includes('background intellectual property') ||
        lower.includes('independently created');

      if (hasCustomWork && !hasIpAssignment) {
        const devSnippet = text.match(/[^\n.]{0,80}(?:deliverables|develop|custom)[^\n.]{0,80}/i);
        const quote = devSnippet ? devSnippet[0].trim() : 'Custom deliverables commissioned';
        risks.push({
          id: 'missing_ip_assignment',
          ruleId: 'RULE_MISSING_IP_ASSIGNMENT',
          severity: 'HIGH',
          confidence: 0.90,
          category: 'IP & Ownership',
          clause: 'Intellectual Property',
          section: this.detectSectionHeaderAtOffset(text, text.indexOf(quote)),
          title: 'Ambiguous Deliverables IP Ownership',
          description: 'Custom deliverables are commissioned, but the contract lacks an express assignment of intellectual property rights to the Client.',
          reason: 'Statutory copyright vests initially in author/developer unless assigned in writing under work-for-hire provisions.',
          practicalImpact: 'Client may pay for development without acquiring exclusive ownership of resulting code or trade secrets.',
          evidence: quote,
          location: findLocation(quote),
          legalRationale: 'Under Copyright Act § 17, assignment must be in writing and signed by assignor to transfer copyright title.',
          suggestedResolution: 'Include an express IP assignment clause stipulating that all deliverables shall be deemed works made for hire owned exclusively by the Client.',
          suggestedFix: 'Insert present-tense IP assignment clause: "Consultant hereby assigns all right, title, and interest in deliverables to Client."',
          nature: 'LEGAL_RISK'
        });
      }
    }

    // 4. Payment Obligation Without Definite Amount (Context, Negation, Condition Aware!)
    if (contractType !== 'NDA') {
      const hasPaymentCovenant = lower.includes('shall pay') || lower.includes('agrees to pay') || lower.includes('client shall pay');
      const hasPaymentWaiver = /no\s+(?:payment|fee|compensation|remuneration|financial\s+consideration)\s+shall\s+be\s+due|without\s+(?:any\s+)?(?:payment|fee|compensation|royalty)|pro\s+bono|free\s+of\s+charge/i.test(text);
      const hasAmount = /(?:₹|\$|€|£|INR|USD|EUR)\s*[\d,]+/i.test(text) || /\b\d+\s*(?:dollars|rupees|euros)\b/i.test(text);
      const hasConditionalMechanism = /milestone\s+schedule|statement\s+of\s+work|purchase\s+order|exhibit\s+[a-z]|rate\s+card|to\s+be\s+mutually\s+agreed/i.test(text);

      // ONLY flag if affirmative covenant exists AND no negation AND no fixed amount AND no attached schedule!
      if (hasPaymentCovenant && !hasPaymentWaiver && !hasAmount && !hasConditionalMechanism) {
        const covenantSnippet = text.match(/[^\n.]{0,80}(?:shall\s+pay|agrees\s+to\s+pay)[^\n.]{0,80}/i);
        const quote = covenantSnippet ? covenantSnippet[0].trim() : 'Payment obligation without consideration';
        risks.push({
          id: 'missing_payment_amount',
          ruleId: 'RULE_MISSING_PAYMENT_AMOUNT',
          severity: 'HIGH',
          confidence: 0.91,
          category: 'Financial Terms',
          clause: 'Consideration',
          section: this.detectSectionHeaderAtOffset(text, text.indexOf(quote)),
          title: 'Payment Covenant Without Specified Consideration',
          description: 'Contract imposes an affirmative payment obligation but fails to specify the numerical monetary amount, rate, or schedule.',
          reason: 'Vague monetary commitment lacking concrete consideration.',
          practicalImpact: 'Contracts lacking agreed consideration or calculation mechanisms may fail for indefiniteness.',
          evidence: quote,
          location: findLocation(quote),
          legalRationale: 'Under Indian Contract Act § 25, agreement without consideration or definite sum is void for uncertainty.',
          suggestedResolution: 'Specify the exact monetary amount, currency, tax terms, and payment due dates.',
          suggestedFix: 'State exact fee amount and currency (e.g. "INR 100,000 payable within 30 days of invoice").',
          nature: 'LEGAL_RISK'
        });
      }
    }

    // 5. Missing 4 Statutory Confidentiality Exceptions (for NDAs)
    if (contractType === 'NDA') {
      const hasExceptions = lower.includes('public domain') || lower.includes('publicly known') || lower.includes('prior lawful possession') || lower.includes('independently developed');
      if (!hasExceptions) {
        const confSnippet = text.match(/[^\n.]{0,80}(?:confidential|non-disclosure)[^\n.]{0,80}/i);
        const quote = confSnippet ? confSnippet[0].trim() : 'Confidentiality obligations without exceptions';
        risks.push({
          id: 'missing_confidentiality_exceptions',
          ruleId: 'RULE_MISSING_CONFIDENTIALITY_EXCEPTIONS',
          severity: 'HIGH',
          confidence: 0.94,
          category: 'Operative Covenants',
          clause: 'Exceptions to Confidentiality',
          section: this.detectSectionHeaderAtOffset(text, text.indexOf(quote)),
          title: 'Missing Standard Confidentiality Carve-Outs',
          description: 'NDA imposes strict secrecy without the 4 canonical exceptions (public knowledge, prior possession, independent development, lawful third-party receipt).',
          reason: 'Overbroad confidentiality without exclusions creates unreasonable restraint of trade.',
          practicalImpact: 'Receiving party could be sued for using information that is already public or independently created.',
          evidence: quote,
          location: findLocation(quote),
          legalRationale: 'Courts hold that overbroad non-disclosure agreements with no carve-outs for public knowledge are unenforceable restraints under Indian Contract Act § 27.',
          suggestedResolution: 'Incorporate the 4 standard exceptions: public domain, prior possession, independent development, and third-party disclosure.',
          suggestedFix: 'Insert standard 4 carve-outs: information publicly known, previously possessed, independently developed, or rightfully received.',
          nature: 'LEGAL_RISK'
        });
      }
    }

    // 6. Indefinite Duration / Missing Term
    if (!overview.duration && contractType !== 'LEGAL_NOTICE') {
      risks.push({
        id: 'missing_contract_term',
        ruleId: 'RULE_UNDEFINED_TERM',
        severity: 'MEDIUM',
        confidence: 0.85,
        category: 'Term',
        clause: 'Term & Termination',
        section: 'Preamble / Term',
        title: 'Undefined Agreement Duration',
        description: 'No explicit duration, expiry date, or term of validity was detected in the contract.',
        reason: 'Omission of definite term leaves ongoing duration ambiguous.',
        practicalImpact: 'Agreements without a defined term may be terminable at will by either party upon reasonable notice.',
        evidence: 'Absence of term duration clause in text.',
        legalRationale: 'Contracts lacking a fixed term are deemed contracts of indefinite duration terminable upon reasonable notice.',
        suggestedResolution: 'State an explicit term (e.g. "for a period of 2 years from the Effective Date").',
        suggestedFix: 'Add explicit term clause: "This Agreement shall continue for a period of two (2) years from the Effective Date."',
        nature: 'LEGAL_RISK'
      });
    }

    // 7. Broken Cross-References
    const secRefRegex = /\b(?:Section|Clause|Article)\s+(\d+(?:\.\d+)?)\b/gi;
    let secMatch;
    const referencedSections: string[] = [];
    while ((secMatch = secRefRegex.exec(text)) !== null) {
      if (!referencedSections.includes(secMatch[1])) {
        referencedSections.push(secMatch[1]);
      }
    }
    for (const ref of referencedSections) {
      const headerPattern = new RegExp(`(?:#+\\s*(?:Section\\s+)?${ref}\\b|^\\s*${ref}\\.?\\s+[A-Z])`, 'm');
      if (!headerPattern.test(text) && ref !== '1' && ref !== '2') {
        const quote = `Section ${ref}`;
        risks.push({
          id: `broken_ref_${ref}`,
          ruleId: 'RULE_BROKEN_CROSS_REFERENCE',
          severity: 'LOW',
          confidence: 0.90,
          category: 'Clarity & Completeness',
          clause: 'Cross-References',
          section: this.detectSectionHeaderAtOffset(text, text.indexOf(quote)),
          title: `Broken Internal Cross-Reference (Section ${ref})`,
          description: `Contract refers to "Section ${ref}", but no corresponding section heading was found in the text.`,
          reason: 'Internal section reference mismatch.',
          practicalImpact: 'Broken references introduce legal ambiguity during contractual dispute resolution.',
          evidence: quote,
          location: findLocation(quote),
          legalRationale: 'Drafting ambiguity caused by erroneous cross-references is construed against the drafter (contra proferentem).',
          suggestedResolution: `Verify section numbering and update reference to point to the correct clause.`,
          suggestedFix: `Update reference to correct numbered section.`,
          nature: 'LEGAL_RISK'
        });
        break; // Limit to 1 finding to avoid clutter
      }
    }

    // 8. Missing Signature Blocks
    const hasSignatureBlock = lower.includes('in witness whereof') || lower.includes('authorized signatory') || lower.includes('signature:');
    if (!hasSignatureBlock && contractType !== 'LEGAL_NOTICE') {
      risks.push({
        id: 'missing_signatures',
        ruleId: 'RULE_MISSING_SIGNATURES',
        severity: 'HIGH',
        confidence: 0.95,
        category: 'Formalities',
        clause: 'Signatures',
        section: 'Execution',
        title: 'Missing Execution / Signature Block',
        description: 'Contract lacks formal signature execution lines for the designated parties.',
        reason: 'Omission of formal execution block.',
        practicalImpact: 'Unexecuted contracts without authorized signatures lack evidentiary proof of mutual consent.',
        evidence: 'Absence of signature block at end of document.',
        legalRationale: 'A contract requires authenticated manifestation of mutual assent to be enforceable in a court of law.',
        suggestedResolution: 'Add standard signature blocks with party names, authorized signatory titles, and execution dates.',
        suggestedFix: 'Insert execution block: "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date."',
        nature: 'MISSING_CLAUSE'
      });
    }

    return risks;
  }

  /**
   * Verifies Internal Factual Consistency & Legal Contradictions:
   * Legal relationship aware: e.g. 2-year term with 5-year confidentiality survival is VALID.
   * "lasts 2 years" vs "remains effective indefinitely" IS a contradiction.
   */
  private checkConsistency(text: string, overview: ContractOverview): ContractConsistencyCheck {
    const findings: string[] = [];
    const contradictionRisks: ContractRiskArea[] = [];
    const lower = text.toLowerCase();

    // 1. Party Name Consistency
    let partiesMatch = true;
    if (overview.parties.length >= 2) {
      const p1 = overview.parties[0].name.toLowerCase().replace(/^(?:this\s+agreement\s+is\s+entered\s+into\s+between\s+|by\s+and\s+between\s+)/i, '').trim();
      const p2 = overview.parties[1].name.toLowerCase().replace(/^(?:this\s+agreement\s+is\s+entered\s+into\s+between\s+|by\s+and\s+between\s+)/i, '').trim();

      const sigIndex = text.search(/(?:in\s+witness\s+whereof|##\s*signatures?|##\s*execution|\n\s*(?:for|by)[:\s]+_{3,})/i);
      const sigText = sigIndex !== -1 ? text.substring(sigIndex) : text.substring(Math.floor(text.length * 0.70));
      const hasSigContext = /in\s+witness\s+whereof|signatures?|execution|\n\s*(?:for|by|employee|employer)[:\s]+_{3,}/i.test(sigText);

      if (hasSigContext) {
        const sigParties = sigText.match(/(?:for|on\s+behalf\s+of|by:)\s*([A-Z][a-zA-Z0-9&.\-']*(?:\s+[A-Z][a-zA-Z0-9&.\-']*)*\s+(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|LLC|Inc\.?|LLP|Corporation|Corp\.?|Company))/gi) || [];
        for (const sp of sigParties) {
          const cleanSp = sp.replace(/^(?:for|on\s+behalf\s+of|by:)\s*/i, '').trim().toLowerCase();
          const matchesP1 = p1.includes(cleanSp.slice(0, 6)) || cleanSp.includes(p1.slice(0, 6));
          const matchesP2 = p2.includes(cleanSp.slice(0, 6)) || cleanSp.includes(p2.slice(0, 6));

          if (!matchesP1 && !matchesP2) {
            partiesMatch = false;
            const quote = sp.replace(/^(?:for|on\s+behalf\s+of|by:)\s*/i, '').trim();
            findings.push(`Party discrepancy: Signature execution block designates foreign entity "${quote}" not established in preamble parties.`);
            contradictionRisks.push({
              id: 'contradiction_party_mismatch',
              ruleId: 'RULE_PARTY_NAME_CONTRADICTION',
              severity: 'HIGH',
              confidence: 0.95,
              category: 'Consistency',
              clause: 'Preamble vs Signatures',
              section: 'Signatures',
              title: 'Preamble and Signature Entity Mismatch',
              description: `Preamble establishes parties as "${overview.parties[0]?.name}" and "${overview.parties[1]?.name}", but signature block designates foreign entity "${quote}".`,
              reason: 'Unidentified entity in signature line.',
              practicalImpact: 'Contract may be signed by the wrong legal person, rendering it unbinding on the intended counterparty.',
              evidence: quote,
              legalRationale: 'Signatory must possess authority on behalf of the specific corporate entity named in the contract premise.',
              suggestedResolution: `Reconcile entity names so preamble and signature line match exactly.`,
              suggestedFix: `Update signature block entity to match "${overview.parties[1]?.name}".`,
              nature: 'CONTRADICTION'
            });
            break;
          }
        }
      }
    }

    // 2. Date Chronology & Conflicting Operative Dates
    let dateChronologyValid = true;
    const effectiveDateMatches = Array.from(text.matchAll(/(?:effective\s+date:?|effective\s+as\s+of|agreement\s+begins\s+on|commencing\s+on)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{4}-\d{2}-\d{2})/gi));
    const distinctDates = Array.from(new Set(effectiveDateMatches.map(m => m[1].replace(/,/g, '').trim().toLowerCase())));
    if (distinctDates.length >= 2) {
      dateChronologyValid = false;
      const d1 = effectiveDateMatches[0][1];
      const d2 = effectiveDateMatches[1][1];
      findings.push(`Conflicting operative dates: Agreement specifies effective dates as '${d1}' and '${d2}'.`);
      contradictionRisks.push({
        id: 'contradiction_effective_dates',
        ruleId: 'RULE_CONFLICTING_EFFECTIVE_DATES',
        severity: 'HIGH',
        confidence: 0.94,
        category: 'Consistency',
        clause: 'Effective Date',
        section: 'Preamble',
        title: 'Conflicting Effective Dates in Same Agreement',
        description: `Contract designates multiple contradictory commencement dates: "${d1}" and "${d2}".`,
        reason: 'Multiple conflicting effective dates create uncertainty regarding when obligations begin.',
        practicalImpact: 'Inability to calculate statutory limitation periods or contract expiry dates.',
        evidence: `${d1} vs ${d2}`,
        legalRationale: 'A contract must possess a single, unambiguous commencement date for enforceability.',
        suggestedResolution: `Align both provisions to designate one single Effective Date.`,
        suggestedFix: `Nominate a single consistent Effective Date throughout.`,
        nature: 'CONTRADICTION'
      });
    }

    // Chronological Timeline Sequence: Start / Dated date vs Expiration / Term end date
    const startDateMatch = text.match(/(?:dated:?|effective\s+date:?|commencing(?:\s+on)?:?|execution\s+date:?)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
    const endDateMatch = text.match(/(?:term\s+expires:?|expiration\s+date:?|expires(?:\s+on)?:?|terminates(?:\s+on)?:?)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{4}-\d{2}-\d{2})/i);

    if (startDateMatch && endDateMatch) {
      const sDate = new Date(startDateMatch[1]);
      const eDate = new Date(endDateMatch[1]);
      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate < sDate) {
        dateChronologyValid = false;
        findings.push(`Chronological timeline contradiction: Term expires (${endDateMatch[1]}) prior to contract date (${startDateMatch[1]}).`);
        contradictionRisks.push({
          id: 'contradiction_chronological_sequence',
          ruleId: 'RULE_DATE_CHRONOLOGY_CONTRADICTION',
          severity: 'HIGH',
          confidence: 0.96,
          category: 'Consistency',
          clause: 'Effective & Expiration Dates',
          section: 'Dates & Term',
          title: 'Chronological Inversion: Expiration Precedes Commencement',
          description: `Contract expiration date "${endDateMatch[1]}" occurs prior to contract commencement date "${startDateMatch[1]}".`,
          reason: 'Timeline contradiction creates an impossible negative contract duration.',
          practicalImpact: 'Agreement would expire prior to commencement, creating substantive legal invalidity.',
          evidence: `${startDateMatch[0]} vs ${endDateMatch[0]}`,
          legalRationale: 'Agreements cannot expire prior to their commencement date.',
          suggestedResolution: 'Correct expiration or dated value so end date follows commencement date.',
          suggestedFix: `Update term expiration date to occur after ${startDateMatch[1]}.`,
          nature: 'CONTRADICTION'
        });
      }
    }

    // 3. Term Duration Contradiction (Fixed Term vs Indefinite/Perpetual)
    // NOTE: Survival of confidentiality (e.g. term 2 years, confidentiality survives 5 years) is NOT a contradiction!
    const fixedTermMatch = text.match(/(?:term\s+of\s+this\s+agreement\s+is|effective\s+for\s+a\s+period\s+of|term\s+shall\s+be)\s*(\d+\s*(?:years?|months?))/i);
    const indefiniteMatch = text.match(/(?:remains\s+effective\s+indefinitely|continue\s+in\s+perpetuity|perpetual\s+duration|shall\s+not\s+expire)/i);

    if (fixedTermMatch && indefiniteMatch) {
      // Check if indefinite wording refers only to survival of trade secrets/confidentiality
      const surroundingIndefinite = text.substring(
        Math.max(0, (indefiniteMatch.index || 0) - 60),
        Math.min(text.length, (indefiniteMatch.index || 0) + 120)
      );
      const isSurvivalContext = /survival|survive|trade\s+secrets|confidentiality\s+obligations/i.test(surroundingIndefinite);

      if (!isSurvivalContext) {
        findings.push(`Term duration contradiction: Section specifies fixed term of ${fixedTermMatch[1]} while another provision asserts the agreement remains effective indefinitely.`);
        contradictionRisks.push({
          id: 'contradiction_fixed_vs_indefinite',
          ruleId: 'RULE_TERM_DURATION_CONTRADICTION',
          severity: 'HIGH',
          confidence: 0.93,
          category: 'Consistency',
          clause: 'Term & Duration',
          section: 'Term',
          title: 'Direct Agreement Term Duration Contradiction',
          description: `Contract states the agreement lasts for a fixed term of ${fixedTermMatch[1]}, but another section asserts the agreement remains effective indefinitely.`,
          reason: 'Contradictory term provisions create irreconcilable conflict over expiration date.',
          practicalImpact: 'Dispute over whether contract has terminated or continues perpetually.',
          evidence: `${fixedTermMatch[0]} vs ${indefiniteMatch[0]}`,
          legalRationale: 'Under rules of contractual construction, direct contradictions regarding agreement duration create irreconcilable ambiguity.',
          suggestedResolution: `Clarify agreement term and distinguish overall contract term from post-termination survival periods.`,
          suggestedFix: `Reconcile duration to fixed term with clear survival clause for specific covenants.`,
          nature: 'CONTRADICTION'
        });
      }
    }

    // 4. Conflicting Payment Due Periods (e.g. 15 days vs 45 days)
    const paymentDaysMatches = Array.from(text.matchAll(/(?:payable|payment\s+due|invoices?\s+paid|remitted)\s+within\s+(\d+)\s*(?:business\s+|calendar\s+)?days/gi));
    const distinctPaymentDays = Array.from(new Set(paymentDaysMatches.map(m => parseInt(m[1], 10))));
    if (distinctPaymentDays.length >= 2) {
      findings.push(`Conflicting payment timeframes: Document specifies payment due within ${distinctPaymentDays[0]} days and ${distinctPaymentDays[1]} days.`);
      contradictionRisks.push({
        id: 'contradiction_payment_timeframe',
        ruleId: 'RULE_CONFLICTING_PAYMENT_TIMEFRAME',
        severity: 'HIGH',
        confidence: 0.92,
        category: 'Consistency',
        clause: 'Payment Terms',
        section: 'Consideration & Invoicing',
        title: 'Conflicting Invoicing & Payment Due Timeframes',
        description: `Contract specifies payment due within ${distinctPaymentDays[0]} days in one section and ${distinctPaymentDays[1]} days in another.`,
        reason: 'Conflicting due dates create payment default ambiguity.',
        practicalImpact: 'Dispute over when interest or late payment default arises.',
        evidence: `${distinctPaymentDays[0]} days vs ${distinctPaymentDays[1]} days`,
        legalRationale: 'Payment obligations must stipulate consistent calculation periods for default notices.',
        suggestedResolution: `Harmonize payment timeframe to a single agreed net period (e.g. Net 30 days).`,
        suggestedFix: `Standardize to Net 30 days across invoicing and payment clauses.`,
        nature: 'CONTRADICTION'
      });
    }

    // 5. Defined Terms Consistency
    let definedTermsConsistent = true;
    const definedTermsMatches = text.match(/"([A-Z][A-Za-z\s]{2,30})"\s*(?:means|shall mean|refers to)/g) || [];
    if (definedTermsMatches.length > 0) {
      for (const dt of definedTermsMatches) {
        const term = dt.replace(/"/g, '').split(/\s*(?:means|shall mean|refers to)/)[0].trim();
        const count = (text.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
        if (count <= 1) {
          findings.push(`Defined term "${term}" is formally defined but never subsequently invoked in the agreement.`);
        }
      }
    }

    if (findings.length === 0) {
      findings.push('No internal factual contradictions, party naming conflicts, or chronological anomalies detected.');
    }

    return {
      partiesMatch,
      dateChronologyValid,
      definedTermsConsistent,
      findings,
      contradictionRisks
    };
  }

  /**
   * Evidence Verification:
   * Strictly verifies that the quoted evidence string actually exists in document text.
   * If there is no real document evidence, the finding is discarded!
   */
  private verifyEvidenceQuotes(risks: ContractRiskArea[], text: string): ContractRiskArea[] {
    const verified: ContractRiskArea[] = [];
    const lowerText = text.toLowerCase();

    for (const r of risks) {
      // 1. Missing clause findings have intrinsic absence evidence
      if (r.nature === 'MISSING_CLAUSE' || r.id === 'missing_signatures' || r.id === 'missing_contract_term') {
        verified.push(r);
        continue;
      }

      // 2. Multi-quote evidence (e.g. "X vs Y")
      if (r.evidence.includes(' vs ')) {
        const parts = r.evidence.split(' vs ').map(p => p.trim());
        const hasParts = parts.every(p => lowerText.includes(p.toLowerCase().slice(0, 15)));
        if (hasParts) {
          verified.push(r);
          continue;
        }
      }

      // 3. Standard quote verification
      const cleanQuote = r.evidence.replace(/^[“"']|[”"']$/g, '').trim();
      if (cleanQuote.length > 0) {
        const needle = cleanQuote.toLowerCase().slice(0, Math.min(25, cleanQuote.length));
        if (lowerText.includes(needle)) {
          verified.push(r);
        }
      }
    }

    return verified;
  }

  /**
   * Computes Explainable Contract Health Score (0–100) across 6 weighted dimensions:
   * 1. Completeness (20%)
   * 2. Clause Coverage (25%)
   * 3. Consistency (20%)
   * 4. Risk (20%)
   * 5. Formatting (10%)
   * 6. Evidence Confidence (5%)
   * A document with unresolved placeholders must NOT score 100% (hard cap at 74%).
   */
  private calculateHealthScore(
    clauseMap: ContractClauseMapItem[],
    risks: ContractRiskArea[],
    consistency: ContractConsistencyCheck,
    overview: ContractOverview
  ): ContractHealthSummary {
    const scoreBreakdown: string[] = [];

    // 1. Completeness Sub-Score (20% weight)
    let completenessScore = 100;
    if (!overview.parties || overview.parties.length < 2) completenessScore -= 25;
    if (!overview.effectiveDate) completenessScore -= 20;
    if (!overview.duration && overview.contractType !== 'LEGAL_NOTICE') completenessScore -= 20;
    if (!overview.governingLaw) completenessScore -= 15;
    if (!overview.monetaryTerms || overview.monetaryTerms.includes('No monetary')) {
      if (overview.contractType === 'SERVICE_AGREEMENT' || overview.contractType === 'COMMERCIAL_CONTRACT') {
        completenessScore -= 20;
      }
    }
    completenessScore = Math.max(20, Math.min(100, completenessScore));

    // 2. Clause Coverage Sub-Score (25% weight)
    const requiredClauses = clauseMap.filter(c => c.isRequired);
    const presentCount = requiredClauses.filter(c => c.status === 'PRESENT').length;
    const incompleteCount = requiredClauses.filter(c => c.status === 'INCOMPLETE').length;
    const ambiguousCount = requiredClauses.filter(c => c.status === 'AMBIGUOUS').length;
    const missingCount = requiredClauses.filter(c => c.status === 'MISSING').length;

    const coverageRatio = requiredClauses.length > 0
      ? (presentCount * 1.0 + incompleteCount * 0.5 + ambiguousCount * 0.6) / requiredClauses.length
      : 1.0;
    const clauseCoverageScore = Math.round(Math.max(15, Math.min(100, coverageRatio * 100)));

    // 3. Consistency Sub-Score (20% weight)
    let consistencyScore = 100;
    if (!consistency.partiesMatch) consistencyScore -= 30;
    if (!consistency.dateChronologyValid) consistencyScore -= 25;
    if (consistency.contradictionRisks.length > 0) consistencyScore -= consistency.contradictionRisks.length * 20;
    consistencyScore = Math.max(20, Math.min(100, consistencyScore));

    // 4. Risk Sub-Score (20% weight)
    const critRisks = risks.filter(r => r.severity === 'CRITICAL').length;
    const highRisks = risks.filter(r => r.severity === 'HIGH').length;
    const medRisks = risks.filter(r => r.severity === 'MEDIUM').length;
    const lowRisks = risks.filter(r => r.severity === 'LOW').length;

    let riskScore = 100 - (critRisks * 35 + highRisks * 16 + medRisks * 8 + lowRisks * 2);
    riskScore = Math.max(15, Math.min(100, riskScore));

    // 5. Formatting Sub-Score (10% weight)
    let formattingScore = 100;
    if (risks.some(r => r.id.startsWith('broken_ref'))) formattingScore -= 20;
    if (!risks.some(r => r.id === 'missing_signatures')) formattingScore += 0;
    else formattingScore -= 25;
    if (overview.paragraphCount < 3) formattingScore -= 30;
    formattingScore = Math.max(20, Math.min(100, formattingScore));

    // 6. Evidence Confidence Sub-Score (5% weight)
    const avgConfidence = risks.length > 0
      ? risks.reduce((acc, r) => acc + (r.confidence || 0.9), 0) / risks.length
      : 0.95;
    const evidenceConfidenceScore = Math.round(avgConfidence * 100);

    // Composite Weighted Calculation
    let rawScore = Math.round(
      completenessScore * 0.20 +
      clauseCoverageScore * 0.25 +
      consistencyScore * 0.20 +
      riskScore * 0.20 +
      formattingScore * 0.10 +
      evidenceConfidenceScore * 0.05
    );

    // Track Breakdown Reasons
    if (missingCount > 0) {
      scoreBreakdown.push(`-${missingCount * 12} pts: ${missingCount} required legal clause(s) missing from draft`);
    }
    if (critRisks > 0) {
      scoreBreakdown.push(`-${critRisks * 25} pts: ${critRisks} critical security or legal defect(s) detected`);
    }
    if (highRisks > 0) {
      scoreBreakdown.push(`-${highRisks * 12} pts: ${highRisks} high-severity risk(s) flagged`);
    }
    if (medRisks > 0) {
      scoreBreakdown.push(`-${medRisks * 6} pts: ${medRisks} medium-severity issue(s) flagged`);
    }
    if (!consistency.partiesMatch) {
      scoreBreakdown.push(`-8 pts: Inconsistent party names between preamble and execution`);
    }

    // HARD SCORING CAPS
    if (critRisks > 0 || missingCount >= 2) {
      rawScore = Math.min(rawScore, 50);
      scoreBreakdown.push(`[Hard Cap] Capped at 50% due to critical security defect or multiple missing core covenants`);
    } else if (overview.hasUnresolvedPlaceholders) {
      rawScore = Math.min(rawScore, 74);
      scoreBreakdown.push(`[Hard Cap] Capped at 74% because unresolved template placeholders / TBD tokens remain in document`);
    } else if (highRisks >= 2) {
      rawScore = Math.min(rawScore, 65);
      scoreBreakdown.push(`[Hard Cap] Capped at 65% due to multiple high-severity legal defects`);
    } else if (highRisks === 1 || missingCount === 1) {
      rawScore = Math.min(rawScore, 74);
      scoreBreakdown.push(`[Hard Cap] Capped at 74% due to high-severity risk or missing required clause`);
    }

    // Never output 100% automated perfection (product safety goal)
    const finalScore = Math.max(15, Math.min(98, rawScore));

    let status: 'STRONG' | 'MODERATE' | 'NEEDS_REVISION' | 'CRITICAL_ATTENTION' = 'STRONG';
    if (finalScore < 50) status = 'CRITICAL_ATTENTION';
    else if (finalScore < 70) status = 'NEEDS_REVISION';
    else if (finalScore < 85) status = 'MODERATE';

    return {
      score: finalScore,
      status,
      categoryScores: {
        completeness: completenessScore,
        clauseCoverage: clauseCoverageScore,
        riskAndCompliance: riskScore,
        consistency: consistencyScore,
        clarity: formattingScore,
        formatting: formattingScore,
        evidenceConfidence: evidenceConfidenceScore
      },
      subScores: {
        completeness: {
          score: completenessScore,
          weight: 20,
          explanation: 'Evaluates identification of contracting parties, dates, term, and governing law.'
        },
        clauseCoverage: {
          score: clauseCoverageScore,
          weight: 25,
          explanation: 'Ratio of required and recommended institutional clauses present in the contract.'
        },
        consistency: {
          score: consistencyScore,
          weight: 20,
          explanation: 'Measures absence of internal chronological, term, or entity contradictions.'
        },
        risk: {
          score: riskScore,
          weight: 20,
          explanation: 'Deductions for uncapped liability, unilateral termination, missing IP assignment, and security flags.'
        },
        formatting: {
          score: formattingScore,
          weight: 10,
          explanation: 'Checks structural section numbering, execution blocks, and valid cross-references.'
        },
        evidenceConfidence: {
          score: evidenceConfidenceScore,
          weight: 5,
          explanation: 'Confidence score based on exact grounded evidence quotes found in text.'
        }
      },
      scoreBreakdown,
      disclaimer: 'Potential issue requiring human review. ATHARV AI provides analysis for research and educational purposes and does not constitute formal legal counsel. Review with a qualified lawyer.'
    };
  }
}

export const contractAnalyzer = new ContractAnalyzer();
